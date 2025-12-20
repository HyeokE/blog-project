'use client';
import React from 'react';

type JsonLdProps = {
  id?: string;
  data: unknown;
};

export default function JsonLd({ id, data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      data-testid={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}



