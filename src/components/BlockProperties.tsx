'use client';

import dynamic from 'next/dynamic';
import type { CMSBlock } from '@/types/cms';

const RichTextEditorWrapper = dynamic(() => import('./RichTextEditorWrapper'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 rounded border animate-pulse" />,
});

interface BlockPropertiesProps {
  block: CMSBlock | null;
  onUpdate: (block: CMSBlock) => void;
}

export default function BlockProperties({ block, onUpdate }: BlockPropertiesProps) {
  if (!block) {
    return (
      <div className="p-4 text-center text-gray-500">
        Clique sur un bloc pour éditer
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-700 block mb-1">
          Type: {block.type}
        </label>
        <div className="text-xs text-gray-600">ID: {block.id}</div>
      </div>

      {block.type === 'paragraph' && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 block">Texte</label>
          <RichTextEditorWrapper
            value={block.text || ''}
            onChange={(html) =>
              onUpdate({
                ...block,
                text: html,
              })
            }
          />
        </div>
      )}

      {block.type === 'image' && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 block">URL Image</label>
          <input
            type="text"
            value={block.src || ''}
            onChange={(e) =>
              onUpdate({
                ...block,
                src: e.target.value,
              })
            }
            placeholder="https://..."
            className="w-full px-2 py-1 border rounded text-xs"
          />
        </div>
      )}

      <div className="border-t pt-4 space-y-2">
        <label className="text-xs font-semibold text-gray-700 block">Dimensions</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">Largeur (px)</label>
            <input
              type="number"
              value={block.width || 300}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  width: parseInt(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Hauteur (px)</label>
            <input
              type="number"
              value={block.height || 200}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  height: parseInt(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <label className="text-xs font-semibold text-gray-700 block">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">X (px)</label>
            <input
              type="number"
              value={block.positionX || 0}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  positionX: parseInt(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Y (px)</label>
            <input
              type="number"
              value={block.positionY || 0}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  positionY: parseInt(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
