'use client';

import { useDarkMode } from '@/context/DarkModeContext';
import { Code } from 'react-notion-x/build/third-party/code';
import { Collection } from 'react-notion-x/build/third-party/collection';
import { Equation } from 'react-notion-x/build/third-party/equation';
import { Modal } from 'react-notion-x/build/third-party/modal';
import { Pdf } from 'react-notion-x/build/third-party/pdf';
import { NotionRenderer } from 'react-notion-x';
import Image from 'next/image';
import Link from 'next/link';
import type { ExtendedRecordMap } from 'notion-types';
import { useEffect, useState } from 'react';

// core styles shared by all of react-notion-x (required)
import './NotionView.css';

// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-tomorrow.css';

// used for rendering equations (optional)
import 'katex/dist/katex.min.css';

const NotionView = ({ recordMap }: { recordMap: ExtendedRecordMap }) => {
  const [mounted, setMounted] = useState(false);
  
  // useContext를 try-catch로 감싸서 SSG 시 안전하게 처리
  let contextMode = 'light';
  try {
    const context = useDarkMode();
    contextMode = context.mode;
  } catch {
    // Context가 없을 때는 기본값 사용
    contextMode = 'light';
  }
  
  const [mode, setMode] = useState(contextMode);
  
  useEffect(() => {
    setMounted(true);
    setMode(contextMode);
  }, [contextMode]);
  
  // SSR/SSG 시에는 light 모드로 렌더링
  if (!mounted) {
    return (
      <NotionRenderer
        darkMode={false}
        isLinkCollectionToUrlProperty={false}
        linkTableTitleProperties={false}
        showTableOfContents={false}
        previewImages={true}
        recordMap={recordMap}
        components={{
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          nextImage: Image,
          nextLink: Link,
        }}
      />
    );
  }
  
  return (
    <NotionRenderer
      darkMode={mode === 'dark'}
      isLinkCollectionToUrlProperty={false}
      linkTableTitleProperties={false}
      showTableOfContents={false}
      previewImages={true}
      recordMap={recordMap}
      components={{
        Code,
        Collection,
        Equation,
        Modal,
        Pdf,
        nextImage: Image,
        nextLink: Link,
      }}
    />
  );
};

export default NotionView;
