'use client';

import { use, useEffect, useId, useRef, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Check, ChevronDown, RotateCcw, Search } from 'lucide-react';
import { ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { trackShadeAction, trackShadeResults, trackShadeImpression, trackShadeExit, type ShadeContext } from './analytics';
import WallBackLink from '@/container/light-wall/WallBackLink';
import { AsyncLoadingProvider, AsyncRegion } from '@/components/craft/AsyncRegion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FieldTrigger } from '@/components/ui/field-trigger';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { requestShadeData, retryShadeData, shadeApiUrl } from './queries';
import { DIFFERENCE_STEPS, describeDifference } from './difference-scale.mjs';
import { compareShadeColors } from './color-comparison.mjs';
import type { BrandOption, ProductFilter, ProductOption, ShadeOption, MatchesResponse, MatchView } from './public-types';

type PickerOption = { id: string; name: string; keywords?: string; hex?: string };
const TYPE_LABELS = { all: '전체', foundation: '파운데이션', cushion: '쿠션' };
const ALL_BRANDS = 'all-brands';
const BOOTSTRAP_URL = shadeApiUrl('bootstrap', {});
type Selection = { type: ProductFilter; brandId: string; product: ProductOption | null; shade: ShadeOption | null };
const EMPTY_SELECTION: Selection = { type: 'all', brandId: '', product: null, shade: null };
type Stage = 'view' | 'brand' | 'product' | 'selected' | 'results';

function retryFromControl(url: string) {
  trackShadeAction('retry');
  retryShadeData(url);
}

function useVisitLogging() {
  const stage = useRef<Stage>('view');
  useEffect(() => {
    let startedAt = performance.now();
    let active = false;
    const start = () => { startedAt = performance.now(); active = true; trackShadeAction('view'); };
    const frame = requestAnimationFrame(start);
    const exit = () => {
      if (!active) { return; }
      active = false;
      trackShadeExit(stage.current, Math.round(performance.now() - startedAt));
    };
    const resume = (event: PageTransitionEvent) => { if (event.persisted) { start(); } };
    window.addEventListener('pagehide', exit);
    window.addEventListener('pageshow', resume);
    return () => { cancelAnimationFrame(frame); exit(); window.removeEventListener('pagehide', exit); window.removeEventListener('pageshow', resume); };
  }, []);
  return stage;
}


function DifferenceMeter({ deltaE }: { deltaE: number }) {
  const step = describeDifference(deltaE);
  return <div className="sf-match-distance">
    <div className="sf-scale-result"><strong>{step.level}단계 · {step.label}</strong><span>ΔE {step.value}</span></div>
    <div className="sf-step-meter" role="img" aria-label={`색상 차이 5단계 중 ${step.level}단계, ${step.label}. 비교값 ${step.value}. 낮을수록 비슷해요.`}>
      {DIFFERENCE_STEPS.map(item => <span key={item.level} data-current={item.level === step.level} aria-hidden="true">{item.level}</span>)}
    </div>
    <div className="sf-scale-endpoints" aria-hidden="true"><span>차이 작음</span><span>차이 큼</span></div>
  </div>;
}

function ColorReadingGuide() {
  return <Collapsible className="sf-color-guide" onOpenChange={open => trackShadeAction(open ? 'guide_open' : 'guide_close')}>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="sf-color-guide-trigger" data-analytics-label={ANALYTICS_ELEMENTS.SHADE_GUIDE}>웜·쿨과 채도, 어떻게 읽나요?<ChevronDown aria-hidden="true" /></Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <dl className="sf-color-guide-copy">
        <div><dt>웜톤 · 쿨톤</dt><dd>보통 노란·복숭아 기운은 웜, 분홍·푸른 기운은 쿨로 설명해요. 브랜드마다 표기가 달라, 여기서는 기준 컬러보다 붉은기와 노란기가 얼마나 다른지 각각 비교해요.</dd></div>
        <div><dt>채도</dt><dd>색의 선명함이에요. 높으면 색 기운이 더 또렷하고, 낮으면 회색이 섞인 듯 차분해요. 더 밝다는 뜻과는 달라요.</dd></div>
        <div><dt>밝기</dt><dd>색이 밝고 어두운 정도예요. 같은 밝기여도 붉은기·노란기나 채도는 다를 수 있어요.</dd></div>
      </dl>
      <p className="sf-color-guide-context">카드의 설명은 선택한 컬러와 비교한 방향이에요. 나의 웜·쿨톤을 판정하는 표시는 아니에요.</p>
    </CollapsibleContent>
  </Collapsible>;
}

function ColorComparison({ sourceHex, targetHex }: { sourceHex: string; targetHex: string }) {
  return <div className="sf-color-comparison">
    <p>기준 컬러와 비교</p>
    <dl>
      {compareShadeColors(sourceHex, targetHex).map(item => <div key={item.key}>
        <dt>{item.label}</dt><dd data-changed={item.direction !== 0}>{item.description}</dd>
      </div>)}
    </dl>
  </div>;
}

function MatchItem({ match, selectedShade, position }: { match: MatchView; selectedShade: ShadeOption; position: number }) {
  const element = useRef<HTMLLIElement>(null);
  const reported = useRef(false);
  useEffect(() => {
    if (!element.current || reported.current || typeof IntersectionObserver === 'undefined') { return; }
    const observer = new IntersectionObserver(entries => {
      if (reported.current || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) { return; }
      reported.current = true;
      trackShadeImpression(selectedShade.id, match, position);
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [match, selectedShade.id, position]);
  return <li ref={element}>
    <Card className="sf-match-card">
      <div className="sf-match-topline"><span className="sf-rank">{String(position).padStart(2, '0')}</span><Badge variant="outline">{TYPE_LABELS[match.product.type]}</Badge></div>
      <div className="sf-comparison" role="img" aria-label={`기준 컬러 ${selectedShade.hex}, 추천 컬러 ${match.shade.hex}`}>
        <span style={{ backgroundColor: selectedShade.hex }} /><span style={{ backgroundColor: match.shade.hex }} />
      </div>
      <div className="sf-swatch-labels"><span>기준 컬러</span><span>추천 컬러</span></div>
      <div className="sf-match-copy"><p className="sf-kicker">{match.brandName}</p><h3>{match.product.name}</h3><p className="sf-shade-name">{match.shade.name}</p></div>
      <ColorComparison sourceHex={selectedShade.hex} targetHex={match.shade.hex} />
      <DifferenceMeter deltaE={match.deltaE} />
    </Card>
  </li>;
}


function SearchPicker({ label, placeholder, options, value, onChange, disabled = false, field }: {
  label: string; placeholder: string; options: PickerOption[]; value: string;
  onChange: (id: string) => void; disabled?: boolean; field?: ShadeContext['field'];
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.id === value);
  const searchStarted = useRef(false);
  return <div className="sf-field">
    <label htmlFor={id}>{label}</label>
    <Popover open={open} onOpenChange={next => { setOpen(next); searchStarted.current = false; trackShadeAction(next ? 'picker_open' : 'picker_close', { field, optionCount: options.length }); }}>
      <PopoverTrigger asChild>
        <FieldTrigger data-analytics-label={ANALYTICS_ELEMENTS.FIELD_TRIGGER} id={id} aria-label={`${label}: ${selected?.name || placeholder}`} disabled={disabled}
          value={selected?.name} placeholder={placeholder} />
      </PopoverTrigger>
      <PopoverContent align="start" className="sf-picker" lang="ko">
        <Command label={`${label} 선택`}>
          <CommandInput data-analytics-label={ANALYTICS_ELEMENTS.COMMAND_INPUT} onValueChange={text => { if (text && !searchStarted.current) { searchStarted.current = true; trackShadeAction('picker_search', { field }); } }} placeholder={`${label} 검색…`} aria-label={`${label} 검색`} />
          <CommandList className="sf-picker-list">
            <CommandEmpty>검색 결과가 없어요. 다른 이름으로 찾아보세요.</CommandEmpty>
            {options.map(option => <CommandItem data-analytics-label={ANALYTICS_ELEMENTS.COMMAND_ITEM} key={option.id} value={option.id}
              keywords={[option.name, option.keywords || '']} data-checked={value === option.id}
              onSelect={() => { onChange(option.id); setOpen(false); trackShadeAction('picker_close', { field, optionCount: options.length }); }}>
              {option.hex && <span className="sf-mini-swatch" style={{ backgroundColor: option.hex }} aria-hidden="true" />}
              <span className="sf-option-name">{option.name}</span>
              {value === option.id && <Check aria-hidden="true" />}
            </CommandItem>)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>;
}

function TypeFilter({ value, onChange, label }: { value: ProductFilter; onChange: (type: ProductFilter) => void; label: string }) {
  return <ToggleGroup type="single" value={value} aria-label={label}
    onValueChange={next => { if (next === 'all' || next === 'foundation' || next === 'cushion') { onChange(next); } }}>
    {(['all', 'foundation', 'cushion'] as const).map(type => <ToggleGroupItem data-analytics-label={ANALYTICS_ELEMENTS.SHADE_TYPE} key={type} value={type}>{TYPE_LABELS[type]}</ToggleGroupItem>)}
  </ToggleGroup>;
}

function FieldSkeleton({ label }: { label: string }) {
  return <div className="sf-field" aria-hidden="true"><span className="sf-field-label">{label}</span><Skeleton className="sf-field-skeleton" /></div>;
}

function ProductPicker({ url, value, onChange }: { url: string; value: string; onChange: (product: ProductOption) => void }) {
  const { products } = use(requestShadeData('products', url));
  return <SearchPicker field="product" label="제품" placeholder="제품을 선택하세요" options={products.map(product => ({ ...product, keywords: product.nameEn }))} value={value}
    onChange={id => { const product = products.find(item => item.id === id); if (product) {onChange(product);} }} />;
}

function ShadePicker({ url, value, onChange }: { url: string; value: string; onChange: (shade: ShadeOption) => void }) {
  const { shades } = use(requestShadeData('shades', url));
  return <SearchPicker field="shade" label="컬러 · 호수" placeholder="컬러를 선택하세요" options={shades} value={value}
    onChange={id => { const shade = shades.find(item => item.id === id); if (shade) {onChange(shade);} }} />;
}

function MatchesSkeleton() {
  return <div className="sf-result-list sf-matches-skeleton" aria-hidden="true">
    {Array.from({ length: 6 }, (_, index) => <Card className="sf-match-card" key={index}>
      <Skeleton className="sf-skeleton-line" /><Skeleton className="sf-skeleton-swatch" />
      <Skeleton className="sf-skeleton-line" /><Skeleton className="sf-skeleton-line" />
      <Skeleton className="sf-skeleton-comparison" /><Skeleton className="sf-skeleton-meter" />
    </Card>)}
  </div>;
}

function MatchResults({ url, selectedShade, query, resetFilters, stage }: { url: string; selectedShade: ShadeOption; query: string; resetFilters: () => void; stage: RefObject<Stage> }) {
  const firstPage = use(requestShadeData('matches', url));
  const [pages, setPages] = useState<MatchesResponse[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const matches = [...firstPage.matches, ...pages.flatMap(page => page.matches)];
  const nextOffset = (pages.at(-1) || firstPage).nextOffset;
  const reportedCount = useRef(-1);
  useEffect(() => {
    stage.current = 'results';
    if (reportedCount.current === matches.length) { return; }
    reportedCount.current = matches.length;
    trackShadeResults(url, firstPage.total, matches.length);
  }, [url, firstPage.total, matches.length, stage]);

  async function loadMore() {
    if (pending || nextOffset === null) {return;}
    trackShadeAction(failed ? 'retry' : 'load_more', { shownCount: matches.length });
    setPending(true);
    setFailed(false);
    const nextUrl = new URL(url, window.location.origin);
    nextUrl.searchParams.set('offset', String(nextOffset));
    const path = nextUrl.pathname + nextUrl.search;
    try {
      const nextPage = await requestShadeData('matches', path);
      setPages(current => [...current, nextPage]);
    } catch {
      retryShadeData(path);
      setFailed(true);
    } finally { setPending(false); }
  }

  return <>
    {matches.length ? <ol className="sf-result-list sf-loaded-results">
      {matches.map((match, index) => <MatchItem key={match.product.id} match={match} selectedShade={selectedShade} position={index + 1} />)}
    </ol> : <div className="sf-no-results"><h3>{query ? '검색 결과가 없어요.' : '이 조건에 맞는 다른 제품이 없어요.'}</h3><p>검색어나 추천 제품 종류, 브랜드를 바꿔보세요.</p><Button variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.SHADE_FILTER_RESET} onClick={() => { trackShadeAction('filters_reset'); resetFilters(); }}>검색·필터 초기화</Button></div>}
    {failed && <p className="sf-load-error" role="alert">다음 컬러를 불러오지 못했어요. 다시 시도해 주세요.</p>}
    {nextOffset !== null && <Button variant="outline" data-analytics-label={failed ? ANALYTICS_ELEMENTS.RETRY : ANALYTICS_ELEMENTS.SHADE_MORE} className="sf-more" disabled={pending} aria-busy={pending} onClick={() => void loadMore()}>{pending ? '컬러 불러오는 중…' : failed ? '다시 시도' : '비슷한 컬러 더 보기'}<ChevronDown aria-hidden="true" /></Button>}
  </>;
}

function ShadeFinderWorkspace({ stage }: { stage: RefObject<Stage> }) {
  const initialData = use(requestShadeData('bootstrap', BOOTSTRAP_URL));
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [resultType, setResultType] = useState<ProductFilter>('all');
  const [resultBrand, setResultBrand] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [resultQuery, setResultQuery] = useState('');
  const searchId = useId();
  const sortedBrands: BrandOption[] = initialData.brands;
  const brandsForType = sortedBrands.filter(brand => selection.type === 'all' || brand.types.includes(selection.type));
  const selectedProduct = selection.product;
  const selectedShade = selection.shade;
  const selectedBrand = sortedBrands.find(brand => brand.id === selection.brandId);
  const productUrl = shadeApiUrl('products', { brandId: selection.brandId, type: selection.type });
  const shadeUrl = shadeApiUrl('shades', { productId: selectedProduct?.id || '' });
  const matchUrl = shadeApiUrl('matches', { shadeId: selectedShade?.id || '', type: resultType, brandId: resultBrand, q: resultQuery, offset: 0 });

  function clearSearch() { setSearchDraft(''); setResultQuery(''); }
  function resetResults() { setResultType('all'); setResultBrand(''); clearSearch(); }
  function selectExample() {
    const example = initialData.example;
    if (example) {
      stage.current = 'selected';
      trackShadeAction('example_select', { brandId: example.brand.id, productId: example.product.id, shadeId: example.shade.id, hex: example.shade.hex });
      setSelection({ type: 'all', brandId: example.brand.id, product: example.product, shade: example.shade });
      resetResults();
    }
  }

  return <div className="sf-workspace">
        <section data-analytics-section={ANALYTICS_SECTIONS.SHADE_SELECTION} className="sf-selection" aria-labelledby="sf-selection-title">
          <div className="sf-section-heading"><h2 id="sf-selection-title">내가 쓰는 컬러</h2><span className="sf-section-note">기준 제품</span></div>
          <Card className="sf-selection-card">
            <div className="sf-field"><span className="sf-field-label">제품 종류</span><TypeFilter value={selection.type} label="기준 제품 종류" onChange={type => { stage.current = 'view'; trackShadeAction('selection_type', { productType: type }); setSelection({ ...EMPTY_SELECTION, type }); resetResults(); }} /></div>
            <SearchPicker field="brand" label="브랜드" placeholder="브랜드를 선택하세요" options={brandsForType.map(brand => ({ ...brand, keywords: brand.nameEn }))}
              value={selection.brandId} onChange={brandId => { stage.current = 'brand'; trackShadeAction('brand_select', { brandId, brandName: sortedBrands.find(brand => brand.id === brandId)?.name }); setSelection({ ...selection, brandId, product: null, shade: null }); resetResults(); }} />
            {selection.brandId ? <AsyncRegion queryKey={productUrl} onRetry={() => retryFromControl(productUrl)} errorMessage="제품 목록을 불러오지 못했어요."
              fallback={selectedProduct ? <SearchPicker field="product" label="제품" placeholder="제품을 선택하세요" options={[selectedProduct]} value={selectedProduct.id} onChange={() => undefined} disabled /> : <FieldSkeleton label="제품" />}>
              <ProductPicker url={productUrl} value={selectedProduct?.id || ''} onChange={product => { stage.current = 'product'; trackShadeAction('product_select', { brandId: selection.brandId, productId: product.id, productName: product.name, productType: product.type }); setSelection({ ...selection, product, shade: null }); resetResults(); }} />
            </AsyncRegion> : <SearchPicker field="product" label="제품" placeholder="브랜드를 먼저 선택하세요" disabled options={[]} value="" onChange={() => undefined} />}
            {selectedProduct ? <AsyncRegion queryKey={shadeUrl} onRetry={() => retryFromControl(shadeUrl)} errorMessage="컬러 목록을 불러오지 못했어요."
              fallback={selectedShade ? <SearchPicker field="shade" label="컬러 · 호수" placeholder="컬러를 선택하세요" options={[selectedShade]} value={selectedShade.id} onChange={() => undefined} disabled /> : <FieldSkeleton label="컬러 · 호수" />}>
              <ShadePicker url={shadeUrl} value={selectedShade?.id || ''} onChange={shade => { stage.current = 'selected'; trackShadeAction('shade_select', { brandId: selection.brandId, productId: selectedProduct.id, shadeId: shade.id, shadeName: shade.name, hex: shade.hex }); setSelection({ ...selection, shade }); }} />
            </AsyncRegion> : <SearchPicker field="shade" label="컬러 · 호수" placeholder="제품을 먼저 선택하세요" disabled options={[]} value="" onChange={() => undefined} />}

            {selectedShade && selectedProduct ? <div className="sf-selected-color">
              <div className="sf-source-swatch" style={{ backgroundColor: selectedShade.hex }} role="img" aria-label={`선택 컬러 ${selectedShade.hex}`} />
              <div><p className="sf-kicker">선택한 컬러</p><strong>{selectedShade.name}</strong><span>{selectedShade.hex}</span></div>
            </div> : <p className="sf-selection-hint">피부에 잘 맞았던 컬러를 기준으로 골라주세요.</p>}
            {(selection.brandId || selection.type !== 'all') && <Button variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.SHADE_RESET} onClick={() => { stage.current = 'view'; trackShadeAction('selection_reset'); setSelection(EMPTY_SELECTION); resetResults(); }}><RotateCcw aria-hidden="true" />선택 초기화</Button>}
          </Card>
        </section>

        <section data-analytics-section={ANALYTICS_SECTIONS.SHADE_RESULTS} className="sf-results" aria-labelledby="sf-results-title">
          <div className="sf-section-heading"><h2 id="sf-results-title">비슷한 컬러 찾기</h2></div>
          {selectedShade && selectedProduct ? <>
            <div className="sf-result-summary">
              <p><strong>{selectedBrand?.name} · {selectedShade.name}</strong> 기준</p>
              <p>{selectedProduct.name}</p>
            </div>
            <div className="sf-result-filters">
              <TypeFilter value={resultType} label="추천 제품 종류" onChange={type => { trackShadeAction('result_type', { productType: type, shadeId: selectedShade.id }); setResultType(type); }} />
              <SearchPicker field="resultBrand" label="추천 브랜드" placeholder="모든 브랜드" value={resultBrand || ALL_BRANDS}
                options={[{ id: ALL_BRANDS, name: '모든 브랜드' }, ...sortedBrands.map(brand => ({ ...brand, keywords: brand.nameEn }))]}
                onChange={brandId => { trackShadeAction('result_brand', { brandId: brandId === ALL_BRANDS ? undefined : brandId, shadeId: selectedShade.id }); setResultBrand(brandId === ALL_BRANDS ? '' : brandId); }} />
            </div>
            <form data-analytics-label={ANALYTICS_ELEMENTS.SEARCH_FORM} role="search" aria-label="비슷한 컬러 결과 검색" className="sf-result-search"
              onSubmit={event => { event.preventDefault(); const query = searchDraft.trim().replace(/\s+/gu, ' '); trackShadeAction('search_submit', { searchLength: Array.from(query).length, hasSearch: Boolean(query), shadeId: selectedShade.id }); setResultQuery(query); }}>
              <label htmlFor={searchId}>결과 검색</label>
              <div className="sf-search-controls">
                <Input data-analytics-label={ANALYTICS_ELEMENTS.SEARCH_INPUT} id={searchId} type="search" value={searchDraft} maxLength={100} placeholder="브랜드·제품명·호수" autoComplete="off" enterKeyHint="search"
                  onChange={event => setSearchDraft(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) { event.preventDefault(); } }} />
                <Button data-analytics-label={ANALYTICS_ELEMENTS.SHADE_SEARCH_SUBMIT} type="submit" variant="outline"><Search aria-hidden="true" />검색</Button>
              </div>
              {resultQuery && <div className="sf-search-applied"><span>“{resultQuery}” 검색 결과</span><Button type="button" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.SEARCH_CLEAR} onClick={() => { trackShadeAction('search_reset'); clearSearch(); }}>검색 초기화</Button></div>}
            </form>
            <section className="sf-scale-guide" aria-labelledby="sf-scale-title">
              <div className="sf-scale-heading"><h3 id="sf-scale-title">색상 차이 5단계</h3><span>낮을수록 비슷해요 <ArrowRight size={14} aria-hidden="true" /> 차이가 커져요</span></div>
              <ol className="sf-scale-legend">
                {DIFFERENCE_STEPS.map(step => <li key={step.level}>
                  <span className="sf-step-number">{step.level}</span><strong>{step.label}</strong><span>{step.rangeLabel}</span>
                </li>)}
              </ol>
            </section>
            <ColorReadingGuide />
            <AsyncRegion queryKey={matchUrl} onRetry={() => retryFromControl(matchUrl)} errorMessage="추천 컬러를 불러오지 못했어요." fallback={<MatchesSkeleton />}>
              <MatchResults stage={stage} key={matchUrl} url={matchUrl} selectedShade={selectedShade} query={resultQuery} resetFilters={resetResults} />
            </AsyncRegion>
          </> : <div className="sf-empty-state">
            <div className="sf-empty-swatches" aria-hidden="true"><span /><span /><span /></div>
            <p className="sf-eyebrow">A SHADE TO START WITH</p>
            <h3>나에게 맞는 컬러,<br />다른 제품에서는 몇 호일까요?</h3>
            <p>브랜드와 제품, 호수를 선택하면<br />가까운 컬러를 나란히 비교할 수 있어요.</p>
            {initialData.example && <Button variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.SHADE_EXAMPLE} onClick={selectExample}>예시 컬러로 둘러보기<ArrowRight aria-hidden="true" /></Button>}
          </div>}
        </section>
      </div>;
}

function WorkspaceSkeleton() {
  return <div className="sf-workspace" aria-hidden="true">
    <section className="sf-selection">
      <div className="sf-section-heading"><h2>내가 쓰는 컬러</h2></div>
      <Card className="sf-selection-card">
        <FieldSkeleton label="제품 종류" /><FieldSkeleton label="브랜드" />
        <FieldSkeleton label="제품" /><FieldSkeleton label="컬러 · 호수" />
      </Card>
    </section>
    <section className="sf-results"><div className="sf-section-heading"><h2>비슷한 컬러 찾기</h2></div><Skeleton className="sf-workspace-skeleton" /></section>
  </div>;
}


const ClientOnlyShadeWorkspace = dynamic(() => import('./ClientOnlyShadeWorkspace'), {
  ssr: false,
  loading: () => <WorkspaceSkeleton />,
});

export default function ShadeFinder() {
  const stage = useVisitLogging();
  return <AsyncLoadingProvider><main data-analytics-section={ANALYTICS_SECTIONS.SHADE_FINDER} className="craft-page shade-finder" lang="ko">
    <div className="craft-shell">
      <WallBackLink href="/craft">Craft</WallBackLink>
      <header className="sf-header">
        <div>
          <p className="sf-eyebrow">SHADE FINDER</p>
          <h1>익숙한 컬러에서,<br />새로운 선택으로.</h1>
        </div>
        <div className="sf-header-colors" aria-hidden="true">
          {['#efd7bb', '#e2bb99', '#c89a76', '#a57350'].map(hex => <span key={hex} style={{ backgroundColor: hex }} />)}
        </div>
      </header>

      <ClientOnlyShadeWorkspace>
        <AsyncRegion queryKey={BOOTSTRAP_URL} onRetry={() => retryFromControl(BOOTSTRAP_URL)} errorMessage="브랜드 목록을 불러오지 못했어요." fallback={<WorkspaceSkeleton />}>
          <ShadeFinderWorkspace stage={stage} />
        </AsyncRegion>
      </ClientOnlyShadeWorkspace>
    </div>
  </main></AsyncLoadingProvider>;
}
