'use client';

import { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import dynamic from 'next/dynamic';
import type { CMSBlock } from '@/types/cms';

const RichTextEditorWrapper = dynamic(() => import('./RichTextEditorWrapper'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 rounded border animate-pulse" />,
});

interface InlineEditableBlockProps {
  block: CMSBlock;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onUpdate: (block: CMSBlock) => void;
  onDelete: (blockId: string) => void;
}

export default function InlineEditableBlock({
  block,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onUpdate,
  onDelete,
}: InlineEditableBlockProps) {
  const position = {
    x: block.positionX || 0,
    y: block.positionY || 0,
  };

  const size = {
    width: block.width || 300,
    height: block.height || 150,
  };

  return (
    <Rnd
      position={position}
      size={size}
      onDragStop={(e, d) => {
        onUpdate({
          ...block,
          positionX: d.x,
          positionY: d.y,
        });
      }}
      onResizeStop={(e, direction, ref, delta, pos) => {
        onUpdate({
          ...block,
          positionX: pos.x,
          positionY: pos.y,
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
        });
      }}
      className={`transition-all ${
        isSelected
          ? 'border-2 border-blue-500 shadow-xl'
          : 'border-2 border-gray-300 hover:border-gray-400'
      }`}
    >
      <div
        className={`w-full h-full p-4 bg-white rounded overflow-auto cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        }`}
        onClick={() => !isEditing && onSelect(block.id)}
        onDoubleClick={() => onEdit(block.id)}
      >
        {!isEditing ? (
          <>
            {block.type === 'paragraph' && (
              <div
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: block.text || '<p>Clique 2x pour éditer</p>' }}
              />
            )}
            {block.type === 'image' && (
              <img
                src={block.src || ''}
                alt="Zone"
                className="w-full h-full object-cover"
              />
            )}
          </>
        ) : (
          <>
            {block.type === 'paragraph' && (
              <RichTextEditorWrapper
                value={block.text || ''}
                onChange={(html) =>
                  onUpdate({
                    ...block,
                    text: html,
                  })
                }
              />
            )}
          </>
        )}
      </div>

      {isSelected && (
        <button
          onClick={() => onDelete(block.id)}
          className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center font-bold"
          title="Supprimer"
        >
          ✕
        </button>
      )}
    </Rnd>
  );
}
