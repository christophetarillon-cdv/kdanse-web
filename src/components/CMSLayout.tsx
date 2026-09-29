'use client';

import type { CMSBlock } from '@/types/cms';

interface CMSLayoutProps {
  block: CMSBlock;
  allBlocks: CMSBlock[];
}

export default function CMSLayout({ block, allBlocks }: CMSLayoutProps) {
  const getColumnBlocks = (colIdx: number) => {
    return allBlocks.filter(b => b.parentLayoutId === block.id && b.columnIndex === colIdx);
  };

  const renderBlock = (childBlock: CMSBlock) => {
    if (childBlock.type === 'paragraph') {
      return (
        <p
          style={{
            color: childBlock.style?.color || '#000000',
            fontSize: `${childBlock.style?.fontSize || 16}px`,
            fontFamily: childBlock.style?.fontFamily || 'inherit',
            fontWeight: childBlock.style?.fontWeight || 'normal',
            textAlign: childBlock.style?.textAlign || 'left',
            lineHeight: childBlock.style?.lineHeight || 1.5,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          className="text-gray-700 leading-relaxed"
        >
          {childBlock.text}
        </p>
      );
    }

    if (childBlock.type === 'image') {
      return (
        <figure className="my-4">
          {childBlock.src && (
            <img
              src={childBlock.src}
              alt={childBlock.alt || 'Image'}
              className="w-full h-auto rounded-lg shadow-md"
            />
          )}
          {childBlock.alt && (
            <figcaption className="text-center text-sm text-gray-500 mt-2">
              {childBlock.alt}
            </figcaption>
          )}
        </figure>
      );
    }

    if (childBlock.type === 'heading') {
      return (
        <h3
          style={{
            color: childBlock.style?.color || '#000000',
            fontSize: `${childBlock.style?.fontSize || 20}px`,
            fontFamily: childBlock.style?.fontFamily || 'inherit',
            fontWeight: childBlock.style?.fontWeight || 'bold',
            textAlign: childBlock.style?.textAlign || 'left',
          }}
          className="font-bold mt-4 mb-2"
        >
          {childBlock.text}
        </h3>
      );
    }

    return null;
  };

  const col1Blocks = getColumnBlocks(0);
  const col2Blocks = getColumnBlocks(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6 p-6 bg-gray-50 rounded-lg">
      {/* Colonne 1 */}
      <div className="space-y-4">
        {col1Blocks.length === 0 ? (
          <p className="text-gray-400 italic">Colonne 1 vide</p>
        ) : (
          col1Blocks.map((childBlock) => <div key={childBlock.id}>{renderBlock(childBlock)}</div>)
        )}
      </div>

      {/* Colonne 2 */}
      <div className="space-y-4">
        {col2Blocks.length === 0 ? (
          <p className="text-gray-400 italic">Colonne 2 vide</p>
        ) : (
          col2Blocks.map((childBlock) => <div key={childBlock.id}>{renderBlock(childBlock)}</div>)
        )}
      </div>
    </div>
  );
}
