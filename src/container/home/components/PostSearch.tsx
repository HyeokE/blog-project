'use client';
import React from 'react';
import { SearchIcon } from '@/assets/SearchIcon';

const PostSearch = () => {
  return (
    <>
      <SearchIcon onClick={() => console.log('search')} />
      {/*<CommandMenu />*/}
    </>
  );
};

export default PostSearch;
