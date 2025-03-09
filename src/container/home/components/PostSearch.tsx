'use client';
import React, { useState } from 'react';
import { SearchIcon } from '@/assets/SearchIcon';
import CommandMenu from '@/components/Command';

const PostSearch = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SearchIcon
        onClick={() => {
          setOpen(true);
          console.log('Search clicked');
        }}
      />
      <CommandMenu setOpen={setOpen} open={open} />
    </>
  );
};

export default PostSearch;
