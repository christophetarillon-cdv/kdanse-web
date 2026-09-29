'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CMSVisualEditor from '@/components/CMSVisualEditor';
import { getPage, updatePage } from '@/services/cmsService';
import { cleanBlocks } from '@/lib/utils';
import type { CMSPage } from '@/types/cms';

export default function CMSEditPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;

  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const data = await getPage(pageId);
        if (!data) {
          setError('Page not found');
          return;
        }
        setPage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [pageId]);

  const handleSave = async () => {
    if (!page) return;

    try {
      setIsSaving(true);
      await updatePage(pageId, {
        content: cleanBlocks(page.content || []),
        title: page.title,
        description: page.description,
        published: page.published,
        metadata: page.metadata,
      });
      // Optionnel: afficher un toast de succès
      alert('Page sauvegardée avec succès !');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save page');
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Chargement de la page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-semibold">{error || 'Page non trouvée'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CMSVisualEditor
        pageId={pageId}
        blocks={page.content || []}
        onUpdate={(blocks) =>
          setPage({
            ...page,
            content: blocks,
          })
        }
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
