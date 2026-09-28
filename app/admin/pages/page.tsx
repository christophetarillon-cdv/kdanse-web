'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getAllPages, createPage, updatePage, deletePage, autoSavePage } from '@/services/cmsService';
import { uploadImage } from '@/services/imageService';
import CMSPreview from '@/components/CMSPreview';
import type { CMSPage, CMSBlock } from '@/types/cms';

export default function AdminPagesPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    published: false,
    metadata: {} as any,
  });
  const [content, setContent] = useState<CMSBlock[]>([]);

  const isAdmin = user?.roles?.includes('admin');

  const cleanContent = (blocks: CMSBlock[]): CMSBlock[] => {
    return blocks.map(block => {
      const cleaned: any = {
        id: block.id,
        type: block.type,
      };
      if (block.text) cleaned.text = block.text;
      if (block.level) cleaned.level = block.level;
      if (block.items?.length) cleaned.items = block.items;
      if (block.content?.length) cleaned.content = block.content;
      if (block.src) cleaned.src = block.src;
      if (block.alt) cleaned.alt = block.alt;
      return cleaned;
    });
  };

  useEffect(() => {
    if (!authLoading && (!firebaseUser || !isAdmin)) {
      router.push('/dashboard');
      return;
    }

    if (firebaseUser && isAdmin) {
      fetchPages();
    }
  }, [firebaseUser, authLoading, isAdmin, router]);

  // Auto-save draft every 2 seconds after last change
  useEffect(() => {
    if (!editingId) return;

    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      console.log('Auto-saving page:', editingId);
      try {
        const cleanedContent = cleanContent(content);
        await autoSavePage(editingId, {
          slug: form.slug,
          title: form.title,
          description: form.description,
          published: form.published,
          metadata: form.metadata,
          content: cleanedContent,
        });
        console.log('Auto-save success');
        setAutoSaveStatus('saved');
        setLastAutoSave(new Date());
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save error:', error);
        setAutoSaveStatus('idle');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [form, content, editingId, cleanContent]);

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
    setSubmitting(true);
    try {
      const cleanedContent = cleanContent(content);
      if (editingId) {
        await updatePage(editingId, {
          ...form,
          content: cleanedContent,
          metadata: form.metadata,
        });
      } else {
        await createPage({
          ...form,
          content: cleanedContent,
          slug: form.slug,
          title: form.title,
          description: form.description,
          published: form.published,
          metadata: form.metadata,
        });
      }
      setForm({ slug: '', title: '', description: '', published: false, metadata: {} as any });
      setContent([]);
      setEditingId(null);
      await fetchPages();
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSubmitting(false);
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
    setContent(page.content || []);
    setEditingId(page.id);
  };

  const addBlock = (type: CMSBlock['type']) => {
    const newBlock: CMSBlock = {
      id: `block-${Date.now()}`,
      type,
      text: '',
      items: type === 'list' ? [] : undefined,
      content: type === 'section' ? [] : undefined,
    };
    setContent([...content, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<CMSBlock>) => {
    setContent(content.map(block => block.id === id ? { ...block, ...updates } : block));
  };

  const removeBlock = (id: string) => {
    setContent(content.filter(block => block.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const idx = content.findIndex(b => b.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === content.length - 1)) return;
    const newContent = [...content];
    [newContent[idx], newContent[idx + (direction === 'up' ? -1 : 1)]] = [newContent[idx + (direction === 'up' ? -1 : 1)], newContent[idx]];
    setContent(newContent);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(blockId);
    try {
      const url = await uploadImage(file);
      updateBlock(blockId, { src: url, alt: file.name });
    } catch (error) {
      alert('Erreur upload: ' + (error instanceof Error ? error.message : 'Erreur'));
    } finally {
      setUploading(null);
    }
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
    setForm({ slug: '', title: '', description: '', published: false, metadata: {} as any });
    setContent([]);
  };

  const handleSaveDraft = async () => {
    if (!editingId) return;
    setDraftSaving(true);
    try {
      const cleanedContent = cleanContent(content);
      const result = await autoSavePage(editingId, {
        slug: form.slug,
        title: form.title,
        description: form.description,
        published: form.published,
        metadata: form.metadata,
        content: cleanedContent,
      });
      console.log('Manual draft save result:', result);
      alert('✅ Brouillon sauvegardé !');
    } catch (error) {
      console.error('Draft save error:', error);
      alert('❌ Erreur: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setDraftSaving(false);
    }
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

      {/* Formulaire + Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">{editingId ? 'Modifier' : 'Créer'} une page</h2>
            {editingId && (
              <div className={`text-xs px-2 py-1 rounded font-semibold ${
                autoSaveStatus === 'saving' ? 'bg-yellow-100 text-yellow-800' :
                autoSaveStatus === 'saved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {autoSaveStatus === 'saving' && '💾 Sauvegarde...'}
                {autoSaveStatus === 'saved' && '✓ Sauvegardé'}
                {autoSaveStatus === 'idle' && (lastAutoSave ? `Sauvegardé à ${lastAutoSave.toLocaleTimeString('fr-FR')}` : 'Prêt')}
              </div>
            )}
          </div>
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

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Contenu</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => addBlock('heading')}
                className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                + Titre
              </button>
              <button
                type="button"
                onClick={() => addBlock('paragraph')}
                className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                + Paragraphe
              </button>
              <button
                type="button"
                onClick={() => addBlock('list')}
                className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                + Liste
              </button>
              <button
                type="button"
                onClick={() => addBlock('section')}
                className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                + Section
              </button>
              <button
                type="button"
                onClick={() => addBlock('image')}
                className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                + Image
              </button>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded">
              {content.length === 0 ? (
                <p className="text-gray-500 text-sm italic">Aucun bloc. Ajoute du contenu avec les boutons ci-dessus.</p>
              ) : (
                content.map((block, idx) => (
                  <div key={block.id} className="bg-white border rounded p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm capitalize">{block.type}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, 'up')}
                          disabled={idx === 0}
                          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, 'down')}
                          disabled={idx === content.length - 1}
                          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="text-xs px-2 py-1 bg-red-200 hover:bg-red-300 text-red-900 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {block.type === 'heading' && (
                      <div className="space-y-2">
                        <select
                          value={block.level || 1}
                          onChange={(e) => updateBlock(block.id, { level: parseInt(e.target.value) })}
                          className="border rounded px-2 py-1 w-full text-sm"
                        >
                          <option value="1">H1</option>
                          <option value="2">H2</option>
                          <option value="3">H3</option>
                          <option value="4">H4</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Texte du titre"
                          value={block.text || ''}
                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                          className="border rounded px-2 py-1 w-full text-sm"
                        />
                      </div>
                    )}

                    {block.type === 'paragraph' && (
                      <textarea
                        placeholder="Texte du paragraphe"
                        value={block.text || ''}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        className="border rounded px-2 py-1 w-full text-sm h-20"
                      />
                    )}

                    {block.type === 'list' && (
                      <div className="space-y-1">
                        {(block.items || []).map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newItems = [...(block.items || [])];
                                newItems[i] = e.target.value;
                                updateBlock(block.id, { items: newItems });
                              }}
                              className="border rounded px-2 py-1 flex-1 text-sm"
                              placeholder={`Item ${i + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = (block.items || []).filter((_, idx) => idx !== i);
                                updateBlock(block.id, { items: newItems });
                              }}
                              className="text-xs px-2 bg-red-200 hover:bg-red-300 text-red-900 rounded"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, { items: [...(block.items || []), ''] })}
                          className="text-xs px-2 py-1 bg-blue-200 hover:bg-blue-300 text-blue-900 rounded"
                        >
                          + Item
                        </button>
                      </div>
                    )}

                    {block.type === 'section' && (
                      <div>
                        <input
                          type="text"
                          placeholder="Titre de la section"
                          value={block.text || ''}
                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                          className="border rounded px-2 py-1 w-full text-sm mb-2"
                        />
                        <p className="text-xs text-gray-500">Les sections peuvent contenir du texte via Firestore directement.</p>
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="space-y-2">
                        {block.src && (
                          <div className="relative w-full max-h-48 overflow-hidden rounded border">
                            <img src={block.src} alt={block.alt || 'Image'} className="w-full h-auto" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-gray-600">Upload image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, block.id)}
                            disabled={uploading === block.id}
                            className="border rounded px-2 py-1 w-full text-sm disabled:bg-gray-100"
                          />
                          {uploading === block.id && <p className="text-xs text-gray-500">Upload en cours...</p>}
                        </div>
                        <input
                          type="text"
                          placeholder="Texte alternatif (alt)"
                          value={block.alt || ''}
                          onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                          className="border rounded px-2 py-1 w-full text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
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

          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'En cours...' : (editingId ? 'Mettre à jour' : 'Créer')}
            </button>
            {editingId && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={draftSaving}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {draftSaving ? '💾...' : '💾 Sauvegarder brouillon'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
              </>
            )}
          </div>
        </form>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-6 max-h-screen overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Aperçu</h2>
          <CMSPreview title={form.title || 'Titre'} description={form.description} content={content} />
        </div>
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
