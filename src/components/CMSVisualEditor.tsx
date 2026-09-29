'use client';

import { useState, useEffect } from 'react';
import type { CMSBlock } from '@/types/cms';
import DraggableBlock from './DraggableBlock';
import BlockProperties from './BlockProperties';

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

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleAddBlock = (type: 'paragraph' | 'image') => {
    const newBlock: CMSBlock = {
      id: `block-${Date.now()}`,
      type,
      text: type === 'paragraph' ? '<p>Nouveau texte</p>' : undefined,
      src: type === 'image' ? '' : undefined,
      positionX: 20,
      positionY: 20 + blocks.length * 40,
      width: 300,
      height: type === 'paragraph' ? 100 : 200,
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b p-3 flex justify-between items-center shadow-sm">
          <div className="flex gap-2">
            <button
              onClick={() => handleAddBlock('paragraph')}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Texte
            </button>
            <button
              onClick={() => handleAddBlock('image')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Image
            </button>
            <div className="border-l border-gray-300 mx-2" />
            <input
              type="range"
              min="50"
              max="150"
              value={canvasScale * 100}
              onChange={(e) => setCanvasScale(parseInt(e.target.value) / 100)}
              className="w-24"
              title="Zoom"
            />
            <span className="text-xs text-gray-600">{Math.round(canvasScale * 100)}%</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-gray-50 p-8">
          <div
            className="relative bg-white rounded-lg shadow-lg"
            style={{
              width: '1200px',
              height: '800px',
              margin: '0 auto',
              transform: `scale(${canvasScale})`,
              transformOrigin: 'top center',
              border: '1px solid #e5e7eb',
            }}
          >
            {blocks.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm">Ajoute des blocs avec les boutons du haut</p>
                </div>
              </div>
            ) : (
              blocks.map((block) => (
                <div key={block.id}>
                  {selectedBlockId === block.id && (
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="absolute top-1 right-1 z-10 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                  <DraggableBlock
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId}
                    onUpdate={handleUpdateBlock}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-80 bg-white border-l shadow-lg overflow-y-auto">
        <div className="bg-gray-100 p-3 border-b">
          <h3 className="font-semibold text-sm text-gray-900">Propriétés</h3>
        </div>
        <BlockProperties block={selectedBlock || null} onUpdate={handleUpdateBlock} />
      </div>
    </div>
  );
}
