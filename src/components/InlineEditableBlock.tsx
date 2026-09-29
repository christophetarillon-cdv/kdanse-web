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
  const [selectionState, setSelectionState] = useState<SelectionState>({ x: 0, y: 0, visible: false });
  const contentRef = useRef<HTMLDivElement>(null);

  const position = {
    x: block.positionX || 0,
    y: block.positionY || 0,
  };

  const size = {
    width: block.width || 300,
    height: block.height || 150,
  };

  const handleMouseUp = () => {
    if (block.type !== 'paragraph') return;

    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      setSelectionState({ ...selectionState, visible: false });
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect();

    if (containerRect) {
      setSelectionState({
        x: rect.left - containerRect.left + containerRect.width / 2,
        y: rect.top - containerRect.top - 40,
        visible: true,
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (block.type !== 'paragraph') return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current?.getBoundingClientRect();

      if (containerRect) {
        setSelectionState({
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top - 40,
          visible: true,
        });
      }
    }
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
    } else if (tag === 'fontSize' && styleAttr) {
      span.style.fontSize = styleAttr;
    }

    try {
      range.surroundContents(span);
      contentRef.current?.focus();
      onUpdate({
        ...block,
        text: contentRef.current?.innerHTML || block.text,
      });
    } catch {
      // Fallback pour contenu complexe
      const selectedText = selection.toString();
      const newHtml = (contentRef.current?.innerHTML || '').replace(
        selectedText,
        `<span style="${
          tag === 'bold' ? 'font-weight: bold;' :
          tag === 'italic' ? 'font-style: italic;' :
          styleAttr ? `${tag === 'color' ? 'color' : 'font-size'}: ${styleAttr};` : ''
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
    selection.removeAllRanges();
    setSelectionState({ ...selectionState, visible: false });
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
          onClick={() => onSelect(block.id)}
          onContextMenu={handleContextMenu}
        >
          {block.type === 'paragraph' && (
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className="text-sm outline-none min-h-full cursor-text"
              onMouseUp={handleMouseUp}
              onKeyUp={handleMouseUp}
              onInput={(e) => {
                onUpdate({
                  ...block,
                  text: (e.currentTarget as HTMLDivElement).innerHTML,
                });
              }}
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
