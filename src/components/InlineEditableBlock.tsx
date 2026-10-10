'use client';

import { useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import type { CMSBlock } from '@/types/cms';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

interface InlineEditableBlockProps {
  block: CMSBlock;
  isSelected: boolean;
  onSelect: (blockId: string) => void;
  onUpdate: (block: CMSBlock) => void;
  onDelete: (blockId: string) => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
}

export default function InlineEditableBlock({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onBringToFront,
  onSendToBack,
}: InlineEditableBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rndRef = useRef<any>(null);
  const dragEnabledRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-drag-handle]');
    dragEnabledRef.current = !!isHandle;
  };

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
      ref={rndRef}
      position={position}
      size={size}
      onDragStart={(e) => {
        if (!dragEnabledRef.current) {
          e.preventDefault?.();
          return false;
        }
      }}
      onDragStop={(e, d) => {
        dragEnabledRef.current = false;
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
          ? 'border-2 border-gold shadow-xl'
          : 'border-2 border-gray-300 hover:border-gray-400'
      }`}
      style={{ zIndex: block.zIndex || 0 }}
    >
      <div
        className={`w-full h-full rounded overflow-hidden flex flex-col ${
          isSelected ? 'ring-2 ring-gold' : ''
        }`}
        style={{
          backgroundColor: block.backgroundColor
            ? `rgba(${hexToRgb(block.backgroundColor).r}, ${hexToRgb(block.backgroundColor).g}, ${hexToRgb(block.backgroundColor).b}, ${block.backgroundOpacity ?? 1})`
            : '#ffffff',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={() => { dragEnabledRef.current = false; }}
      >
        {/* Drag handle - seul endroit où on peut draguer */}
        <div data-drag-handle className="h-6 bg-gray-300 hover:bg-gray-400 cursor-grab active:cursor-grabbing w-full flex items-center justify-center text-xs text-gray-600">
          ≡
        </div>

        <div
          className="flex-1 p-4 overflow-auto"
          onDoubleClick={() => onSelect(block.id)}
        >
        {block.type === 'paragraph' && (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className="text-sm outline-none min-h-full cursor-text"
            style={{ direction: 'ltr', userSelect: 'text' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              dragEnabledRef.current = false;
            }}
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
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              onMouseDown={(e) => { e.preventDefault(); onBringToFront?.(); }}
              className="px-2 py-1 text-xs bg-gold-500 text-white rounded hover:bg-ink font-medium"
              title="Avancer devant"
            >
              ↑
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); onSendToBack?.(); }}
              className="px-2 py-1 text-xs bg-gold-500 text-white rounded hover:bg-ink font-medium"
              title="Reculer derrière"
            >
              ↓
            </button>
            <button
              onClick={() => onDelete(block.id)}
              className="w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center font-bold"
              title="Supprimer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </Rnd>
  );
}
