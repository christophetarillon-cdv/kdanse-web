'use client';

import type { CMSBlock } from '@/types/cms';
import CMSLayout from './CMSLayout';

interface CMSPreviewProps {
  title: string;
  description?: string;
  content: CMSBlock[];
}

export default function CMSPreview({ title, description, content }: CMSPreviewProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 prose prose-sm max-w-none">
      <h1>{title}</h1>

      {description && <p className="text-lg text-gray-600">{description}</p>}

      <div className="mt-8 space-y-6">
        {content && content.filter(b => !b.parentLayoutId).length > 0 ? (
          content.filter(b => !b.parentLayoutId).map((block, idx) => (
            <div key={idx}>
              {block.type === 'heading' && (
                <h2
                  className={`font-bold mt-6 mb-3 ${
                    block.level === 1
                      ? 'text-3xl'
                      : block.level === 2
                        ? 'text-2xl'
                        : block.level === 3
                          ? 'text-xl'
                          : 'text-lg'
                  }`}
                >
                  {block.text}
                </h2>
              )}

              {block.type === 'paragraph' && (
                <div
                  className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: block.text || '' }}
                />
              )}

              {block.type === 'list' && (
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {block.items?.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )}

              {block.type === 'section' && (
                <div className="bg-gray-50 border-l-4 border-blue-500 p-4 my-4">
                  {block.text && <h3 className="font-semibold mb-2">{block.text}</h3>}
                  {block.content && (
                    <div className="space-y-2">
                      {block.content.map((subBlock, si) => (
                        <p key={si} className="text-gray-600">
                          {subBlock.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {block.type === 'image' && (
                <figure className="my-6">
                  {block.src && (
                    <img
                      src={block.src}
                      alt={block.alt || 'Image'}
                      className="w-full h-auto rounded-lg shadow-md"
                    />
                  )}
                  {block.alt && (
                    <figcaption className="text-center text-sm text-gray-500 mt-2">
                      {block.alt}
                    </figcaption>
                  )}
                </figure>
              )}

              {block.type === 'layout' && <CMSLayout block={block} allBlocks={content} />}
            </div>
          ))
        ) : (
          <p className="text-gray-600 italic">Aucun contenu. Ajoute des blocs pour voir l'aperçu.</p>
        )}
      </div>
    </div>
  );
}
