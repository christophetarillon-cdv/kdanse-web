'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded border animate-pulse" />,
});

interface RichTextEditorWrapperProps {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditorWrapper({ value, onChange }: RichTextEditorWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 bg-gray-100 rounded border" />;
  }

  return <RichTextEditor value={value} onChange={onChange} />;
}
