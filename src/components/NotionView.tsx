'use client';

import useDarkMode from '@/hooks/useDarkMode';
import { Code } from 'react-notion-x/build/third-party/code';
import { Collection } from 'react-notion-x/build/third-party/collection';
import { Equation } from 'react-notion-x/build/third-party/equation';
import { Modal } from 'react-notion-x/build/third-party/modal';
import { Pdf } from 'react-notion-x/build/third-party/pdf';
import { NotionRenderer } from 'react-notion-x';
import Image from 'next/image'; // or import Image from 'next/legacy/image' if you use legacy Image
import Link from 'next/link';
import type { ExtendedRecordMap } from 'notion-types';
// core styles shared by all of react-notion-x (required)
import './NotionView.css';

// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-tomorrow.css';

// used for rendering equations (optional)
import 'katex/dist/katex.min.css';

const NotionView = ({ recordMap }: { recordMap: ExtendedRecordMap }) => {
  const [mode] = useDarkMode('light');
  return (
    <NotionRenderer
      darkMode={mode === 'dark'}
      isLinkCollectionToUrlProperty={false}
      linkTableTitleProperties={false}
      showTableOfContents={false}
      previewImages={false}
      recordMap={recordMap}
      components={{
        Code,
        Collection,
        Equation,
        Modal,
        Pdf,
        Image,
        Link,
      }}
    />
  );
};

export default NotionView;
