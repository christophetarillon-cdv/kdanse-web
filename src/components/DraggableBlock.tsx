'use client';

import { Rnd } from 'react-rnd';
import type { CMSBlock } from '@/types/cms';

interface DraggableBlockProps {
  block: CMSBlock;
  isSelected: boolean;
  onSelect: (blockId: string) => void;
  onUpdate: (block: CMSBlock) => void;
}

export default function DraggableBlock({
  block,
  isSelected,
  onSelect,
  onUpdate,
}: DraggableBlockProps) {
  const position = {
    x: block.positionX || 0,
    y: block.positionY || 0,
  };

  const size = {
    width: block.width || 300,
    height: block.height || 200,
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
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate({
          ...block,
          positionX: position.x,
          positionY: position.y,
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
        });
      }}
      className={`transition-all ${
        isSelected ? 'border-2 border-blue-500 shadow-lg' : 'border-2 border-gray-300'
      }`}
    >
      <div
        className={`w-full h-full p-4 bg-white rounded overflow-hidden cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        }`}
        onClick={() => onSelect(block.id)}
      >
        {block.type === 'paragraph' && (
          <div
            className="text-sm line-clamp-3 prose prose-sm"
            dangerouslySetInnerHTML={{ __html: block.text || '' }}
          />
        )}

        {block.type === 'image' && (
          <img
            src={block.src || ''}
            alt="Zone"
            className="w-full h-full object-cover"
          />
        )}

        {block.type === 'layout' && (
          <div className="text-xs text-gray-500 italic">
            Zone de mise en page ({block.layoutType})
          </div>
        )}
      </div>
    </Rnd>
  );
}
