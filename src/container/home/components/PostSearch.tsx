'use client';
import React from 'react';
import { SearchIcon } from '@/assets/SearchIcon';

const PostSearch = () => {
  return (
    <>
      <SearchIcon onClick={() => console.info('search')} />
      {/*<CommandMenu />*/}
    </>
  );
};

export default PostSearch;
