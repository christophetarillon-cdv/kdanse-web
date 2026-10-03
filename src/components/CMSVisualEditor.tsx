'use client';

import { useState } from 'react';
import type { CMSBlock } from '@/types/cms';
import InlineEditableBlock from './InlineEditableBlock';
import CMSEditorToolbar from './CMSEditorToolbar';
import BlockPropertiesToolbar from './BlockPropertiesToolbar';

interface CMSVisualEditorProps {
  pageId: string;
  blocks: CMSBlock[];
  onUpdate: (blocks: CMSBlock[]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function CMSVisualEditor({
  pageId,
  blocks,
  onUpdate,
  onSave,
  isSaving,
}: CMSVisualEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const handleAddBlock = (type: 'paragraph' | 'image') => {
    const newBlock: CMSBlock = {
      id: `block-${Date.now()}`,
      type,
      text: type === 'paragraph' ? '<p>Clique 2x pour éditer</p>' : undefined,
      src: type === 'image' ? '' : undefined,
      positionX: 20,
      positionY: 20 + blocks.length * 40,
      width: 300,
      height: type === 'paragraph' ? 150 : 200,
      order: blocks.length,
    };
    onUpdate([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateBlock = (updatedBlock: CMSBlock) => {
    onUpdate(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
  };

  const handleDeleteBlock = (blockId: string) => {
    onUpdate(blocks.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleBringToFront = (blockId: string) => {
    const maxZ = Math.max(...blocks.map(b => b.zIndex || 0), 0);
    onUpdate(blocks.map(b =>
      b.id === blockId ? { ...b, zIndex: maxZ + 1 } : b
    ));
  };

  const handleSendToBack = (blockId: string) => {
    const minZ = Math.min(...blocks.map(b => b.zIndex || 0), 0);
    onUpdate(blocks.map(b =>
      b.id === blockId ? { ...b, zIndex: minZ - 1 } : b
    ));
  };

  const handleUpdateBlockProperties = (updates: Partial<CMSBlock>) => {
    if (selectedBlockId) {
      onUpdate(blocks.map(b =>
        b.id === selectedBlockId ? { ...b, ...updates } : b
      ));
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b p-3 flex justify-between items-center shadow-sm">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => handleAddBlock('paragraph')}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            + Texte
          </button>
          <button
            onClick={() => handleAddBlock('image')}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            + Image
          </button>
          <div className="border-l border-gray-300 mx-2 h-6" />
          <label className="text-xs font-medium text-gray-700 mr-2">Zoom:</label>
          <input
            type="range"
            min="50"
            max="150"
            value={canvasScale * 100}
            onChange={(e) => setCanvasScale(parseInt(e.target.value) / 100)}
            className="w-32"
          />
          <span className="text-xs font-medium text-gray-600 w-10">{Math.round(canvasScale * 100)}%</span>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}
        </button>
      </div>

      {/* Formatting Toolbar */}
      <CMSEditorToolbar />

      {/* Block Properties Toolbar */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-300 p-3 flex gap-4 items-center shadow-md">
        <span className="text-xs font-semibold text-gray-700">
          Propriétés du bloc {selectedBlock && `(${selectedBlock.id})`}
        </span>
        {selectedBlock && (
          <>
            <input
              type="color"
              value={selectedBlock.backgroundColor || '#ffffff'}
              onChange={(e) => handleUpdateBlockProperties({ backgroundColor: e.target.value })}
              className="w-8 h-8 cursor-pointer rounded border"
              title="Couleur de fond du bloc"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={(selectedBlock.backgroundOpacity ?? 1) * 100}
              onChange={(e) => handleUpdateBlockProperties({ backgroundOpacity: parseInt(e.target.value) / 100 })}
              className="w-24"
              title="Opacité du fond (0 = transparent, 100 = opaque)"
            />
            <span className="text-xs text-gray-600 w-8">{Math.round((selectedBlock.backgroundOpacity ?? 1) * 100)}%</span>
          </>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-gray-50 p-8">
        <div
          className="relative bg-white rounded-lg shadow-2xl"
          style={{
            width: '1200px',
            minHeight: '800px',
            margin: '0 auto',
            transform: `scale(${canvasScale})`,
            transformOrigin: 'top center',
            border: '1px solid #d1d5db',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedBlockId(null);
            }
          }}
        >
          {blocks.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">✏️</div>
                <p className="text-sm font-medium">Double-clique sur un bloc pour éditer</p>
                <p className="text-xs mt-1">Drag pour déplacer, redimensionne en tirant les coins</p>
              </div>
            </div>
          ) : (
            blocks.map((block) => (
              <InlineEditableBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={setSelectedBlockId}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onBringToFront={() => handleBringToFront(block.id)}
                onSendToBack={() => handleSendToBack(block.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
