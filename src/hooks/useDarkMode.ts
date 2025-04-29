'use client';
import { useDarkMode as useContextDarkMode } from '@/context/DarkModeContext';

export default function useDarkMode(_defaultModeProp = 'light') {
  // 이제 context에서 다크모드 상태와 토글 함수를 가져옵니다
  const { mode, toggleMode } = useContextDarkMode();
  
  // 기존 API와 호환성을 유지하기 위해 배열 형태로 반환
  return [mode, toggleMode] as [string, () => void];
}
