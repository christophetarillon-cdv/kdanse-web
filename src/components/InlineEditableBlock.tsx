'use client';

import { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import type { CMSBlock } from '@/types/cms';

interface InlineEditableBlockProps {
  block: CMSBlock;
  isSelected: boolean;
  onSelect: (blockId: string) => void;
  onUpdate: (block: CMSBlock) => void;
  onDelete: (blockId: string) => void;
}

interface SelectionState {
  x: number;
  y: number;
  visible: boolean;
}

export default function InlineEditableBlock({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: InlineEditableBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  const position = {
    x: block.positionX || 0,
    y: block.positionY || 0,
  };

  const size = {
    width: block.width || 300,
    height: block.height || 150,
  };

  // Initialiser le contenu une seule fois
  useEffect(() => {
    if (contentRef.current && !initialized && block.text) {
      contentRef.current.innerHTML = block.text;
      setInitialized(true);
    }
  }, [block.id, initialized]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = (e.currentTarget as HTMLDivElement).innerHTML;
    onUpdate({
      ...block,
      text: html,
    });
  };

  const applyFormat = (tag: string, styleAttr?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');

    if (tag === 'bold') {
      span.style.fontWeight = 'bold';
    } else if (tag === 'italic') {
      span.style.fontStyle = 'italic';
    } else if (tag === 'color' && styleAttr) {
      span.style.color = styleAttr;
    }

    try {
      range.surroundContents(span);
      if (contentRef.current) {
        contentRef.current.focus();
        onUpdate({
          ...block,
          text: contentRef.current.innerHTML,
        });
      }
    } catch {
      // Fallback pour contenu complexe
      const selectedText = selection.toString();
      const newHtml = (contentRef.current?.innerHTML || '').replace(
        selectedText,
        `<span style="${
          tag === 'bold' ? 'font-weight: bold;' :
          tag === 'italic' ? 'font-style: italic;' :
          styleAttr ? `color: ${styleAttr};` : ''
        }">${selectedText}</span>`
      );
      if (contentRef.current) {
        contentRef.current.innerHTML = newHtml;
        onUpdate({
          ...block,
          text: newHtml,
        });
      }
    }
  };

  return (
    <>
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
          onClick={() => {
            const selection = window.getSelection();
            if (!selection || selection.toString().length === 0) {
              onSelect(block.id);
            }
          }}
        >
          {block.type === 'paragraph' && (
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className="text-sm outline-none min-h-full cursor-text select-text"
              style={{ direction: 'ltr', userSelect: 'text' }}
              onInput={handleInput}
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

      {/* Toolbar flottante (en dehors pour éviter clipping) */}
      {isSelected && block.type === 'paragraph' && (
        <div
          className="fixed bg-gray-900 text-white rounded-lg shadow-lg p-2 flex gap-1 z-50"
          style={{
            left: `${position.x + (size.width as number) / 2}px`,
            top: `${position.y - 40}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onMouseDown={() => applyFormat('bold')}
            className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-bold"
            title="Gras"
          >
            B
          </button>
          <button
            onMouseDown={() => applyFormat('italic')}
            className="px-2 py-1 hover:bg-gray-700 rounded text-sm italic"
            title="Italique"
          >
            I
          </button>
          <div className="border-l border-gray-700" />
          <input
            type="color"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => applyFormat('color', e.target.value)}
            className="w-6 h-6 cursor-pointer"
            title="Couleur"
          />
        </div>
      )}
    </>
  );
}
