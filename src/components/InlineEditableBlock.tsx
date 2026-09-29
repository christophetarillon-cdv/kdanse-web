'use client';

import { useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import type { CMSBlock } from '@/types/cms';

interface InlineEditableBlockProps {
  block: CMSBlock;
  isSelected: boolean;
  onSelect: (blockId: string) => void;
  onUpdate: (block: CMSBlock) => void;
  onDelete: (blockId: string) => void;
}

export default function InlineEditableBlock({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: InlineEditableBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const position = {
    x: block.positionX || 0,
    y: block.positionY || 0,
  };

  const size = {
    width: block.width || 300,
    height: block.height || 150,
  };

  useEffect(() => {
    if (contentRef.current && block.text) {
      contentRef.current.innerHTML = block.text;
    }
  }, [block.id]);

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
        className={`w-full h-full p-4 bg-white rounded overflow-auto ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        }`}
        onDoubleClick={() => onSelect(block.id)}
      >
        {block.type === 'paragraph' && (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className="text-sm outline-none min-h-full cursor-text"
            style={{ direction: 'ltr', userSelect: 'text' }}
            onInput={(e) => {
              onUpdate({
                ...block,
                text: (e.currentTarget as HTMLDivElement).innerHTML,
              });
            }}
          />
        )}

        {block.type === 'image' && (
          <img
            src={block.src || ''}
            alt="Zone"
            className="w-full h-full object-cover"
          />
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
