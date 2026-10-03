'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPageBySlug } from '@/services/cmsService';
import CMSLayout from '@/components/CMSLayout';
import type { CMSPage } from '@/types/cms';

export default function CMSPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchPage = async () => {
      try {
        const pageData = await getPageBySlug(slug);
        if (!pageData) {
          router.push('/');
          return;
        }
        setPage(pageData);
      } catch (error) {
        console.error('Error fetching page:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug, router]);

  if (loading) return <div className="p-8">Chargement...</div>;
  if (!page) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-8 inline-block">
          ← Retour accueil
        </Link>

        <article className="bg-white rounded-lg shadow-lg p-8 prose prose-sm max-w-none">
          <h1>{page.title}</h1>

          {page.description && (
            <p className="text-lg text-gray-600">{page.description}</p>
          )}

          {/* Render content blocks with absolute positioning */}
          {(() => {
            const contentArray = Array.isArray(page.content) ? page.content : (page.content ? Object.values(page.content) : []);
            const blocks = contentArray.filter(b => b && !b.parentLayoutId);
            if (blocks.length === 0) {
              return <p className="text-gray-600 italic mt-8">Aucun contenu pour cette page.</p>;
            }
            const maxBottom = Math.max(800, ...blocks.map(b => (b.positionY || 0) + (b.height || 150)));

            const hexToRgb = (hex: string) => {
              const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
              return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 };
            };

            return (
              <div className="relative bg-white rounded-lg border border-gray-300 mt-8 shadow-lg mx-auto" style={{ width: '1200px', height: `${maxBottom}px` }}>
                {blocks.map((block, idx) => {
                  const bgColor = block.backgroundColor ? `rgba(${hexToRgb(block.backgroundColor).r}, ${hexToRgb(block.backgroundColor).g}, ${hexToRgb(block.backgroundColor).b}, ${block.backgroundOpacity ?? 1})` : '#ffffff';
                  return (
                    <div key={idx} className="border border-gray-300 rounded overflow-hidden" style={{ position: 'absolute', left: `${block.positionX ?? 0}px`, top: `${block.positionY ?? 0}px`, width: `${block.width ?? 300}px`, height: `${block.height ?? 150}px`, backgroundColor: bgColor, zIndex: block.zIndex ?? 0 }}>
                      <div className="w-full h-full p-4 overflow-auto">
                        {block.type === 'paragraph' && <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: block.text || '' }} />}
                        {block.type === 'heading' && <h2 className={`font-bold ${block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : block.level === 3 ? 'text-xl' : 'text-lg'}`}>{block.text}</h2>}
                        {block.type === 'image' && <img src={block.src || ''} alt={block.alt || 'Image'} className="w-full h-full object-cover" />}
                        {block.type === 'list' && <ul className="list-disc list-inside space-y-1 text-sm">{block.items?.map((item, i) => <li key={i}>{item}</li>)}</ul>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </article>

        {/* Metadata info */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
          <p>
            Dernière modification: {page.updatedAt.toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
