'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Camera, ImagePlus, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RollingNumber } from '@/components/craft/RollingNumber.mjs';
import { PhotoViewport } from './PhotoViewport';
import { sampleSkinPatch, createWhiteBalance, applyWhiteBalance, averageSkinColors, type SkinPatch } from './skin-sampling.mjs';
import './skin-photo.css';

export type SkinPhotoEvent = 'capture_open' | 'upload_open' | 'photo_loaded' | 'photo_error' | 'white_reference_select' | 'region_select' | 'photo_reset' | 'color_use';
type Props = { onUseColor: (hex: string) => void; onEvent?: (event: SkinPhotoEvent) => void };
type Photo = { canvas: HTMLCanvasElement; pixels: ImageData; version: number };
type Selection = { x: number; y: number; patch: SkinPatch };
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const EMPTY_SKIN_POINTS: Array<Selection | null> = [null, null, null];

export function SkinPhotoPicker({ onUseColor, onEvent }: Props) {
  const id = useId();
  const captureInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const source = useRef<Photo | null>(null);
  const revision = useRef({ value: 0 });
  const urls = useRef(new Set<string>());
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [skinPoints, setSkinPoints] = useState<Array<Selection | null>>(EMPTY_SKIN_POINTS);
  const [activeSkinIndex, setActiveSkinIndex] = useState(0);
  const [previewSkinIndex, setPreviewSkinIndex] = useState(0);
  const editingSkinPoint = useRef(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [whiteReference, setWhiteReference] = useState<Selection | null>(null);
  const [activePoint, setActivePoint] = useState<'white' | 'skin'>('white');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const whiteBalance = whiteReference ? createWhiteBalance(whiteReference.patch) : null;
  const selectedPoints = skinPoints.filter((point): point is Selection => point !== null);
  const selectedCount = selectedPoints.length;
  const selection = skinPoints[activeSkinIndex] ?? skinPoints[previewSkinIndex] ?? selectedPoints[selectedPoints.length - 1] ?? null;
  const average = selectedCount === 3 ? averageSkinColors(selectedPoints.map(point => point.patch.rgb)) : null;
  const corrected = average && whiteBalance?.ok ? applyWhiteBalance(average.rgb, whiteBalance) : null;
  const skinClipped = selectedPoints.some(point => point.patch.clippedFraction >= 0.05 || (whiteBalance?.ok && applyWhiteBalance(point.patch.rgb, whiteBalance).clipped)) || Boolean(corrected?.clipped);
  const activeSelection = cursor ?? (activePoint === 'white' ? whiteReference : skinPoints[activeSkinIndex]);

  function clearSkinPoints() {
    setSkinPoints(EMPTY_SKIN_POINTS); setActiveSkinIndex(0); setPreviewSkinIndex(0); editingSkinPoint.current = false; setCursor(null);
  }

  useEffect(() => {
    const activeUrls = urls.current;
    const requestState = revision.current;
    return () => {
      requestState.value++;
      activeUrls.forEach(url => URL.revokeObjectURL(url));
      activeUrls.clear();
      if (source.current) { source.current.canvas.width = 0; source.current.canvas.height = 0; }
      source.current = null;
    };
  }, []);

  function report(event: SkinPhotoEvent) {
    try { onEvent?.(event); } catch { /* Analytics must not interrupt local image processing. */ }
  }

  async function loadFile(file: File | undefined) {
    if (!file) {return;}
    const current = ++revision.current.value;
    setError('');
    if (file.size > MAX_FILE_BYTES || file.size === 0) {
      setPending(false); setError('20MB 이하의 사진을 선택해주세요.'); report('photo_error'); return;
    }
    if ((file.type && !file.type.startsWith('image/')) || file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
      setPending(false); setError('JPG, PNG 등 사진 파일을 선택해주세요.'); report('photo_error'); return;
    }
    setPending(true);
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    const image = new Image();
    try {
      image.src = url;
      await image.decode();
      if (current !== revision.current.value) {return;}
      const { naturalWidth: width, naturalHeight: height } = image;
      if (!width || !height || width * height > 60_000_000) {throw new Error('large');}
      const scale = Math.min(1, 1600 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {throw new Error('canvas');}
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const nextPhoto = { canvas, pixels: context.getImageData(0, 0, canvas.width, canvas.height), version: current };
      if (source.current) { source.current.canvas.width = 0; source.current.canvas.height = 0; }
      source.current = nextPhoto;
      setPhoto(nextPhoto); clearSkinPoints(); setWhiteReference(null); setActivePoint('white'); report('photo_loaded');
    } catch (cause) {
      if (current !== revision.current.value) {return;}
      setError(cause instanceof Error && cause.message === 'large'
        ? '사진 해상도가 너무 커요. 크기를 줄여 다시 선택해주세요.'
        : '사진을 열지 못했어요. JPG나 PNG 파일로 다시 골라주세요.');
      report('photo_error');
    } finally {
      image.src = '';
      URL.revokeObjectURL(url); urls.current.delete(url);
      if (current === revision.current.value) {setPending(false);}
    }
  }

  function choosePoint(x: number, y: number, advance = true) {
    if (!photo || pending) {return;}
    const nextX = Math.max(0, Math.min(1, x));
    const nextY = Math.max(0, Math.min(1, y));
    setCursor({ x: nextX, y: nextY });
    const radius = Math.max(2, Math.round(Math.min(photo.canvas.width, photo.canvas.height) * 0.015));
    const patch = sampleSkinPatch(photo.pixels, nextX * (photo.canvas.width - 1), nextY * (photo.canvas.height - 1), radius);
    if (activePoint === 'white') {
      setSkinPoints(EMPTY_SKIN_POINTS); setActiveSkinIndex(0); editingSkinPoint.current = false; report('white_reference_select');
      setWhiteReference(patch ? { x: nextX, y: nextY, patch } : null);
      if (!patch) { setError('투명한 부분은 색을 읽을 수 없어요. 흰 종이가 보이는 곳을 선택해주세요.'); return; }
      const balance = createWhiteBalance(patch);
      if (!balance.ok) {
        setError({ clipped: '종이가 너무 밝게 찍혔어요. 반사광이 없는 곳을 고르거나 플래시를 끄고 다시 찍어주세요.', dark: '선택한 부분이 너무 어두워요. 같은 빛을 받는 흰 종이 부분을 골라주세요.', cast: '흰 종이의 색을 기준으로 쓰기 어려워요. 색이나 그림자가 없는 부분을 다시 골라주세요.' }[balance.reason]);
        return;
      }
      setError(''); if (advance) { setActivePoint('skin'); setCursor(null); } return;
    }
    if (!whiteBalance?.ok) { return; }
    report('region_select');
    const nextPoints = skinPoints.map((point, index) => index === activeSkinIndex ? null : point);
    const duplicate = nextPoints.some(point => point && Math.hypot((point.x - nextX) * (photo.canvas.width - 1), (point.y - nextY) * (photo.canvas.height - 1)) <= radius * 2);
    const pointError = !patch ? '투명한 부분은 색을 읽을 수 없어요. 피부가 보이는 곳을 선택해주세요.'
      : duplicate ? '이미 고른 곳과 너무 가까워요. 다른 피부 부분을 선택해주세요.'
      : patch.clippedFraction >= 0.05 || applyWhiteBalance(patch.rgb, whiteBalance).clipped ? '보정한 색이 너무 밝아요. 반사광이 없는 피부 부분을 다시 골라주세요.' : '';
    if (pointError || !patch) { setSkinPoints(nextPoints); setError(pointError); return; }
    nextPoints[activeSkinIndex] = { x: nextX, y: nextY, patch };
    setSkinPoints(nextPoints); setPreviewSkinIndex(activeSkinIndex); setError('');
    if (advance && !editingSkinPoint.current) {
      const nextMissingIndex = nextPoints.findIndex(point => point === null);
      if (nextMissingIndex !== -1) { setActiveSkinIndex(nextMissingIndex); setCursor(null); }
      else { editingSkinPoint.current = true; }
    }
  }

  function selectWithKeyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {return null;}
    event.preventDefault();
    const increment = event.shiftKey ? 0.1 : 0.01;
    const point = {
      x: Math.max(0, Math.min(1, (activeSelection?.x ?? 0.5) + (event.key === 'ArrowLeft' ? -increment : event.key === 'ArrowRight' ? increment : 0))),
      y: Math.max(0, Math.min(1, (activeSelection?.y ?? 0.5) + (event.key === 'ArrowUp' ? -increment : event.key === 'ArrowDown' ? increment : 0))),
    };
    choosePoint(point.x, point.y, event.key === 'Enter' || event.key === ' ');
    return point;
  }

  function reset() {
    revision.current.value++;
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
    if (source.current) { source.current.canvas.width = 0; source.current.canvas.height = 0; }
    source.current = null;
    setPhoto(null); clearSkinPoints(); setWhiteReference(null); setActivePoint('white'); setError(''); setPending(false); report('photo_reset');
  }

  return <Card className="sf-photo-picker" data-analytics-ignore="true">
    <p className="sf-photo-hint">피부 옆에 무광 흰 종이를 두고 같은 빛을 받게 찍어주세요.</p>
    <div className="sf-photo-privacy"><ShieldCheck aria-hidden="true" /><div><p>사진은 서버에 저장되지 않아요. 이 기기에서 색만 추출해요.</p><p>추천할 때는 선택한 HEX 색상 코드만 전송해요.</p></div></div>
    <div className="sf-photo-actions">
      <Button type="button" onClick={() => { report('capture_open'); captureInput.current?.click(); }} disabled={pending}><Camera aria-hidden="true" />촬영</Button>
      <Button type="button" variant="outline" onClick={() => { report('upload_open'); uploadInput.current?.click(); }} disabled={pending}><ImagePlus aria-hidden="true" />사진 업로드</Button>
      {photo && <Button type="button" variant="ghost" size="sm" aria-label="사진 지우기" onClick={reset}><RotateCcw aria-hidden="true" /><span>사진 지우기</span></Button>}
    </div>
    <Input ref={captureInput} className="sf-photo-file" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-label="피부 사진 촬영" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void loadFile(file); }} />
    <Input ref={uploadInput} className="sf-photo-file" type="file" accept="image/*" tabIndex={-1} aria-label="피부 사진 파일 선택" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void loadFile(file); }} />
    <p className="sf-photo-hint">플래시를 쓸 때는 종이에 반사광이 생기지 않게 해주세요.</p>
    {pending && <p className="sf-photo-status" role="status">사진을 읽는 중이에요.</p>}
    {error && <p className="sf-photo-error" role="alert">{error}</p>}
    {photo ? <>
      <ToggleGroup type="single" className="sf-photo-steps" value={activePoint} aria-label="사진에서 선택할 부분" onValueChange={value => { if (value === 'white' || value === 'skin') { setActivePoint(value); setCursor(null); setError(''); } }} disabled={pending}>
        <ToggleGroupItem value="white" aria-label="1단계 흰 종이 선택">1 흰 종이 선택{whiteBalance?.ok ? ' ✓' : ''}</ToggleGroupItem>
        <ToggleGroupItem value="skin" aria-label="2단계 피부 3곳 선택" disabled={!whiteBalance?.ok}>2 피부 3곳 선택</ToggleGroupItem>
      </ToggleGroup>
      {whiteBalance?.ok && <ToggleGroup type="single" className="sf-photo-skin-points" value={activePoint === 'skin' ? String(activeSkinIndex) : ''} aria-label="선택할 피부 위치" disabled={pending}
        onValueChange={value => {
          if (!['0', '1', '2'].includes(value)) { return; }
          const index = Number(value);
          setActiveSkinIndex(index); setActivePoint('skin'); setCursor(null); setError(''); editingSkinPoint.current = Boolean(skinPoints[index]);
        }}>
        {skinPoints.map((point, index) => <ToggleGroupItem key={index} value={String(index)} aria-label={`피부 ${index + 1}, ${point ? '선택 완료, 다시 선택' : '미선택'}`}>
          <span className="sf-photo-slot-swatch" style={point ? { backgroundColor: point.patch.hex } : undefined} aria-hidden="true" />피부 {index + 1}<span aria-hidden="true">{point ? '✓' : '·'}</span>
        </ToggleGroupItem>)}
      </ToggleGroup>}
      <div className="sf-photo-image-heading"><span>원본 사진</span><span role="status">{activePoint === 'white' ? '흰 종이를 선택하세요' : `${['첫 번째', '두 번째', '세 번째'][activeSkinIndex]} 피부 영역을 선택하세요`}</span></div>
      <PhotoViewport key={photo.version} source={photo.canvas} activePoint={activeSelection} disabled={pending}
        label={`사진에서 ${activePoint === 'white' ? '흰 종이' : `피부 ${activeSkinIndex + 1}`} 영역 선택`} describedBy={`${id}-instructions`}
        onSelectPoint={point => choosePoint(point.x, point.y)} onSelectWithKeyboard={selectWithKeyboard}
        markers={[
          ...(whiteReference ? [{ id: 'white', x: whiteReference.x, y: whiteReference.y, label: '흰', kind: 'white' as const }] : []),
          ...skinPoints.flatMap((point, index) => point ? [{ id: `skin-${index}`, x: point.x, y: point.y, label: String(index + 1), kind: 'skin' as const, active: activePoint === 'skin' && activeSkinIndex === index }] : []),
        ]} />
      <p id={`${id}-instructions`} className="sf-photo-hint">{activePoint === 'white' ? '사진에서 그림자나 반사광이 없는 흰 종이 부분을 눌러주세요.' : '볼이나 턱에서 색이 고른 피부 3곳을 골라주세요. 이미 고른 곳은 버튼을 눌러 바꿀 수 있어요.'}<span className="sf-photo-keyboard-hint"> 키보드는 방향키로 이동하고 Enter로 선택해요. Shift를 함께 누르면 크게 이동해요.</span></p>
      {whiteBalance?.ok && <p className="sf-photo-progress" role="status">피부 3곳 중 <RollingNumber value={selectedCount} />곳 선택했어요.</p>}
      <div className="sf-photo-reading" aria-live="polite" aria-atomic="true">
        {selection ? <>
          <div className="sf-photo-detail"><canvas className="sf-photo-crop" width={56} height={56} role="img" aria-label={`피부 ${skinPoints.indexOf(selection) + 1} 확대`}
            ref={node => {
              const context = node?.getContext('2d');
              if (!context) { return; }
              const radius = Math.max(2, Math.round(Math.min(photo.canvas.width, photo.canvas.height) * 0.015));
              const x = Math.round(selection.x * (photo.canvas.width - 1));
              const y = Math.round(selection.y * (photo.canvas.height - 1));
              const left = Math.max(0, x - radius);
              const top = Math.max(0, y - radius);
              const width = Math.min(photo.canvas.width - 1, x + radius) - left + 1;
              const height = Math.min(photo.canvas.height - 1, y + radius) - top + 1;
              context.clearRect(0, 0, 56, 56);
              context.imageSmoothingEnabled = false;
              context.drawImage(photo.canvas, left, top, width, height, 0, 0, 56, 56);
            }} /><span>피부 {skinPoints.indexOf(selection) + 1}</span></div>
          {average && <div className="sf-photo-color"><span className="sf-photo-swatch" style={{ backgroundColor: average.hex }} aria-hidden="true" /><span>평균 색 · 보정 전</span></div>}
          {corrected ? <div className="sf-photo-color sf-photo-corrected"><span className="sf-photo-swatch" style={{ backgroundColor: corrected.hex }} aria-hidden="true" /><span>평균 색 · 보정 후</span><strong>{corrected.hex}</strong></div> : <p>3곳을 모두 고르면 평균 컬러를 보여드려요.</p>}
          <span className="craft-sr-only">피부 위치 가로 {Math.round(selection.x * 100)}% · 세로 {Math.round(selection.y * 100)}%</span>
        </> : <p>{whiteBalance?.ok ? '피부 3곳을 선택하면 보정 전후 평균 컬러를 보여드려요.' : '흰 종이를 먼저 선택하면 사진의 색 기운을 보정해요.'}</p>}
      </div>
      {corrected?.clipped && <p className="sf-photo-error" role="alert">보정한 평균 색이 너무 밝아요. 반사광이 없는 피부 부분을 다시 골라주세요.</p>}
      <Button type="button" className="sf-photo-use" disabled={!corrected || skinClipped || pending} onClick={() => { if (corrected && !skinClipped && !pending) { report('color_use'); onUseColor(corrected.hex); } }}>보정한 컬러로 제품 찾기<ArrowRight aria-hidden="true" /></Button>
      <p className="sf-photo-hint">흰 종이로 조명의 색 기운을 줄여요. 종이와 카메라에 따라 실제 피부색과 차이가 남을 수 있어요.</p>
    </> : <div className="sf-photo-upload-empty" aria-hidden="true"><div className="sf-photo-upload-empty-swatches"><span /><span /><span /></div><p>흰 종이와 피부가 함께 나온 사진에서<br />흰 종이, 피부 3곳 순서로 선택해주세요.</p></div>}
  </Card>;
}
