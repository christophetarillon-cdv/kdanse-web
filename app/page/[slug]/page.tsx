'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPageBySlug } from '@/services/cmsService';
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

          {/* Render content blocks */}
          <div className="mt-8 space-y-6">
            {page.content && page.content.length > 0 ? (
              page.content.map((block, idx) => (
                <div key={idx}>
                  {block.type === 'heading' && (
                    <h2 className={`font-bold mt-6 mb-3 ${
                      block.level === 1 ? 'text-3xl' :
                      block.level === 2 ? 'text-2xl' :
                      block.level === 3 ? 'text-xl' : 'text-lg'
                    }`}>
                      {block.text}
                    </h2>
                  )}

                  {block.type === 'paragraph' && (
                    <p className="text-gray-700 leading-relaxed">{block.text}</p>
                  )}

                  {block.type === 'list' && (
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      {block.items?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {block.type === 'section' && (
                    <div className="bg-gray-50 border-l-4 border-blue-500 p-4 my-4">
                      {block.text && <h3 className="font-semibold mb-2">{block.text}</h3>}
                      {block.content && (
                        <div className="space-y-2">
                          {block.content.map((subBlock, si) => (
                            <p key={si} className="text-gray-600">{subBlock.text}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-600 italic">Aucun contenu pour cette page.</p>
            )}
          </div>
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
