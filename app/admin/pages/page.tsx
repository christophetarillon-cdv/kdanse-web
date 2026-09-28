'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getAllPages, createPage, updatePage, deletePage } from '@/services/cmsService';
import { CMSPage } from '@/types/cms';

export default function AdminPagesPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    published: false,
    metadata: {
      seoTitle: '',
      seoDescription: '',
      keywords: [] as string[],
    },
  });

  const isAdmin = user?.roles?.includes('admin');

  useEffect(() => {
    if (!authLoading && (!firebaseUser || !isAdmin)) {
      router.push('/dashboard');
      return;
    }

    if (firebaseUser && isAdmin) {
      fetchPages();
    }
  }, [firebaseUser, authLoading, isAdmin, router]);

  const fetchPages = async () => {
    try {
      const allPages = await getAllPages();
      setPages(allPages);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updatePage(editingId, {
          ...form,
          content: [], // Placeholder - à améliorer avec un éditeur
          metadata: form.metadata,
        } as Partial<CMSPage>);
      } else {
        await createPage({
          ...form,
          content: [],
          metadata: form.metadata,
        } as Omit<CMSPage, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setForm({ slug: '', title: '', description: '', published: false, metadata: { seoTitle: '', seoDescription: '', keywords: [] } });
      setEditingId(null);
      fetchPages();
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (page: CMSPage) => {
    setForm({
      slug: page.slug,
      title: page.title,
      description: page.description || '',
      published: page.published,
      metadata: page.metadata,
    });
    setEditingId(page.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette page ?')) return;
    try {
      await deletePage(id);
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ slug: '', title: '', description: '', published: false, metadata: { seoTitle: '', seoDescription: '', keywords: [] } });
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !isAdmin) return null;

  return (
    <div className="space-y-8 p-8">
      <div>
        <Link href="/admin" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour admin
        </Link>
        <h1 className="text-3xl font-bold mb-2">Gestion des pages CMS</h1>
        <p className="text-gray-600">Créez et gérez les pages statiques</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{editingId ? 'Modifier' : 'Créer'} une page</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="URL slug (ex: privacy-policy)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="border rounded px-3 py-2"
              required
              disabled={!!editingId}
            />
            <input
              type="text"
              placeholder="Titre de la page"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
          </div>

          <textarea
            placeholder="Description courte"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded px-3 py-2 w-full h-20"
          />

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">SEO</h3>
            <input
              type="text"
              placeholder="SEO Title"
              value={form.metadata.seoTitle}
              onChange={(e) => setForm({
                ...form,
                metadata: { ...form.metadata, seoTitle: e.target.value }
              })}
              className="border rounded px-3 py-2 w-full"
            />
            <textarea
              placeholder="SEO Description"
              value={form.metadata.seoDescription}
              onChange={(e) => setForm({
                ...form,
                metadata: { ...form.metadata, seoDescription: e.target.value }
              })}
              className="border rounded px-3 py-2 w-full h-16"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="w-5 h-5"
            />
            <label className="font-medium text-gray-700">Publier cette page</label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold"
            >
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Titre</th>
              <th className="px-6 py-3 text-left font-semibold">Slug</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Modifié</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{page.title}</td>
                <td className="px-6 py-3 text-sm text-gray-600">/{page.slug}</td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    page.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {page.published ? 'Publié' : 'Brouillon'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {page.updatedAt.toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(page)}
                    className="text-blue-600 hover:underline text-sm font-semibold"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="text-red-600 hover:underline text-sm font-semibold"
                  >
                    Supprimer
                  </button>
                  {page.published && (
                    <Link
                      href={`/page/${page.slug}`}
                      className="text-green-600 hover:underline text-sm font-semibold"
                    >
                      Voir
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucune page créée. Créez-en une avec le formulaire ci-dessus.
          </div>
        )}
      </div>
    </div>
  );
}
