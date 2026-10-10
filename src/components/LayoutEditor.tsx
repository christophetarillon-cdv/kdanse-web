'use client';

import { useState } from 'react';
import type { CMSBlock } from '@/types/cms';
import RichTextEditorWrapper from './RichTextEditorWrapper';

interface LayoutEditorProps {
  block: CMSBlock;
  allBlocks: CMSBlock[]; // tous les blocs de la page
  onUpdate: (allBlocks: CMSBlock[]) => void;
  onRemove: () => void;
}

export default function LayoutEditor({
  block,
  allBlocks,
  onUpdate,
  onRemove,
}: LayoutEditorProps) {
  const [expandedColumn, setExpandedColumn] = useState<number | null>(0);

  const layouts = [
    { id: 'image-text', label: 'Image - Texte', description: 'Image à gauche, texte à droite' },
    { id: 'text-image', label: 'Texte - Image', description: 'Texte à gauche, image à droite' },
    { id: 'two-columns', label: 'Deux colonnes', description: 'Deux colonnes égales' },
  ];

  const handleLayoutChange = (layoutType: 'image-text' | 'text-image' | 'two-columns') => {
    const newBlock: CMSBlock = {
      ...block,
      layoutType,
    };
    const newBlocks = allBlocks.map(b => (b.id === block.id ? newBlock : b));
    // Ajouter des blocs vides pour les colonnes
    newBlocks.push(
      { id: `col-${Date.now()}`, type: 'paragraph', text: 'Colonne 1', parentLayoutId: block.id, columnIndex: 0 },
      { id: `col-${Date.now() + 1}`, type: 'paragraph', text: 'Colonne 2', parentLayoutId: block.id, columnIndex: 1 }
    );
    onUpdate(newBlocks);
  };

  const getColumnBlocks = (colIdx: number) => {
    return allBlocks.filter(b => b.parentLayoutId === block.id && b.columnIndex === colIdx);
  };

  const updateColumnBlock = (colIdx: number, blockId: string, updated: CMSBlock) => {
    const newBlocks = allBlocks.map(b => (b.id === blockId ? { ...b, ...updated } : b));
    onUpdate(newBlocks);
  };

  const addBlockToColumn = (colIdx: number) => {
    const newBlocks = [...allBlocks];
    newBlocks.push({
      id: `block-${Date.now()}`,
      type: 'paragraph',
      text: 'Nouveau bloc',
      parentLayoutId: block.id,
      columnIndex: colIdx,
    });
    onUpdate(newBlocks);
  };

  const removeBlockFromColumn = (blockId: string) => {
    const newBlocks = allBlocks.filter(b => b.id !== blockId);
    onUpdate(newBlocks);
  };

  return (
    <div className="bg-gold-50 border-2 border-gold-200 rounded p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-sm text-gray-900">Zone (Layout)</h4>
          <p className="text-xs text-gray-600 mt-1">
            Type: {block.layoutType || 'Sélectionner un type'}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="text-xs px-2 py-1 bg-red-200 hover:bg-red-300 text-red-900 rounded"
        >
          Supprimer
        </button>
      </div>

      {!block.layoutType && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700">Choisir un type de layout:</p>
          <div className="grid grid-cols-1 gap-2">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() =>
                  handleLayoutChange(
                    layout.id as 'image-text' | 'text-image' | 'two-columns'
                  )
                }
                className="text-left p-2 border rounded hover:bg-gold-100 transition"
              >
                <div className="font-semibold text-sm text-gray-900">{layout.label}</div>
                <div className="text-xs text-gray-600">{layout.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {block.layoutType && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((colIdx) => {
              const columnBlocks = getColumnBlocks(colIdx);
              return (
                <div
                  key={colIdx}
                  className="border-2 border-gray-300 rounded p-2 bg-white"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Colonne {colIdx + 1}
                    </span>
                    <button
                      onClick={() =>
                        setExpandedColumn(expandedColumn === colIdx ? null : colIdx)
                      }
                      className="text-xs text-gold-deep hover:underline"
                    >
                      {expandedColumn === colIdx ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedColumn === colIdx && (
                    <div className="space-y-2">
                      {columnBlocks.length === 0 && (
                        <p className="text-xs text-gray-500 italic">Aucun bloc</p>
                      )}

                      {columnBlocks.map((innerBlock) => (
                        <div
                          key={innerBlock.id}
                          className="bg-gray-50 border rounded p-2 space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-600">
                              {innerBlock.type}
                            </span>
                            <button
                              onClick={() => removeBlockFromColumn(innerBlock.id)}
                              className="text-xs px-1.5 py-0.5 bg-red-200 hover:bg-red-300 text-red-900 rounded"
                            >
                              ✕
                            </button>
                          </div>

                          {innerBlock.type === 'paragraph' && (
                            <RichTextEditorWrapper
                              value={innerBlock.text || ''}
                              onChange={(html) =>
                                updateColumnBlock(colIdx, innerBlock.id, {
                                  ...innerBlock,
                                  text: html,
                                })
                              }
                            />
                          )}

                          {innerBlock.type === 'image' && (
                            <input
                              type="text"
                              value={innerBlock.src || ''}
                              onChange={(e) =>
                                updateColumnBlock(colIdx, innerBlock.id, {
                                  ...innerBlock,
                                  src: e.target.value,
                                })
                              }
                              placeholder="URL de l'image"
                              className="border rounded px-2 py-1 text-xs w-full"
                            />
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => addBlockToColumn(colIdx)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 w-full"
                      >
                        + Ajouter un bloc
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
