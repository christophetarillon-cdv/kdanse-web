'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllPages, createPage, deletePage } from '@/services/cmsService';
import type { CMSPage } from '@/types/cms';

export default function CMSListPage() {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPageForm, setNewPageForm] = useState({
    title: '',
    slug: '',
    description: '',
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await getAllPages();
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPage = await createPage({
        title: newPageForm.title,
        slug: newPageForm.slug,
        description: newPageForm.description,
        content: [],
        published: false,
        metadata: {},
      });
      setPages([...pages, newPage]);
      setShowNewForm(false);
      setNewPageForm({ title: '', slug: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Supprimer cette page ?')) return;
    try {
      await deletePage(pageId);
      setPages(pages.filter((p) => p.id !== pageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-900 font-medium">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pages CMS</h1>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-4 py-2 bg-ink text-white rounded hover:bg-ink-soft"
        >
          + Nouvelle Page
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
          {error}
        </div>
      )}

      {showNewForm && (
        <form onSubmit={handleCreatePage} className="mb-8 p-6 bg-white border rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Titre</label>
              <input
                type="text"
                value={newPageForm.title}
                onChange={(e) => setNewPageForm({ ...newPageForm, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Titre de la page"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Slug</label>
              <input
                type="text"
                value={newPageForm.slug}
                onChange={(e) => setNewPageForm({ ...newPageForm, slug: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="slug-page"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <input
                type="text"
                value={newPageForm.description}
                onChange={(e) =>
                  setNewPageForm({ ...newPageForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Description"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {pages.length === 0 ? (
          <p className="text-gray-800 text-center py-8">Aucune page pour le moment</p>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className="flex justify-between items-center p-4 bg-white border rounded-lg shadow hover:shadow-md transition"
            >
              <div className="flex-1">
                <Link
                  href={`/admin/cms/edit/${page.id}`}
                  className="text-lg font-bold text-gray-900 text-gold-deep hover:underline"
                >
                  {page.title}
                </Link>
                <p className="text-sm text-gray-900 font-medium">/{page.slug}</p>
                {page.description && (
                  <p className="text-sm text-gray-900 font-medium mt-1">{page.description}</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    page.published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-900 font-medium'
                  }`}
                >
                  {page.published ? 'Publiée' : 'Brouillon'}
                </span>
                <Link
                  href={`/admin/cms/edit/${page.id}`}
                  className="px-3 py-1 text-sm bg-ink text-white rounded hover:bg-ink-soft"
                >
                  Éditer
                </Link>
                <button
                  onClick={() => handleDeletePage(page.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
