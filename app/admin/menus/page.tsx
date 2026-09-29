'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getAllMenus, createMenu, updateMenu, deleteMenu } from '@/services/menuService';
import { getAllPages } from '@/services/cmsService';
import type { Menu, MenuItem } from '@/types/menu';
import type { CMSPage } from '@/types/cms';

export default function AdminMenusPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.roles?.includes('admin');

  useEffect(() => {
    if (!authLoading && (!firebaseUser || !isAdmin)) {
      router.push('/dashboard');
      return;
    }

    if (firebaseUser && isAdmin) {
      fetchMenus();
      fetchPages();
    }
  }, [firebaseUser, authLoading, isAdmin, router]);

  const fetchMenus = async () => {
    try {
      const allMenus = await getAllMenus();
      setMenus(allMenus);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const fetchPages = async () => {
    try {
      const allPages = await getAllPages();
      setPages(allPages.filter(p => p.published));
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
      const cleanedItems = menuItems.map(({ children, ...item }) => item);
      if (editingMenuId) {
        await updateMenu(editingMenuId, cleanedItems);
      } else {
        await createMenu(menuName, cleanedItems);
      }
      setMenuName('');
      setMenuItems([]);
      setEditingMenuId(null);
      await fetchMenus();
      alert('✅ Menu sauvegardé !');
    } catch (error) {
      console.error('Error saving menu:', error);
      alert('Erreur: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSubmitting(false);
    }
  };

  const flattenItems = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    items.forEach(item => {
      const { children, ...itemWithoutChildren } = item;
      result.push(itemWithoutChildren);
      if (children && children.length > 0) {
        result.push(...flattenItems(children));
      }
    });
    return result;
  };

  const handleEdit = (menu: Menu) => {
    setMenuName(menu.name);
    setMenuItems(flattenItems(menu.items));
    setEditingMenuId(menu.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce menu ?')) return;
    try {
      await deleteMenu(id);
      fetchMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('Erreur');
    }
  };

  const handleCancel = () => {
    setMenuName('');
    setMenuItems([]);
    setEditingMenuId(null);
  };

  const addMenuItem = (parentId?: string) => {
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      label: '',
      url: '',
      order: menuItems.filter(i => i.parentId === parentId).length,
      ...(parentId && { parentId }),
    };
    setMenuItems([...menuItems, newItem]);
  };

  const updateMenuItem = (id: string, field: keyof MenuItem, value: any) => {
    setMenuItems(
      menuItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeMenuItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id && item.parentId !== id));
  };

  const moveMenuItem = (id: string, direction: 'up' | 'down', parentId?: string) => {
    const items = menuItems.filter(i => i.parentId === parentId);
    const idx = items.findIndex(i => i.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === items.length - 1)) return;

    const newItems = [...menuItems];
    const item1 = items[idx];
    const item2 = items[idx + (direction === 'up' ? -1 : 1)];

    if (item1 && item2) {
      const idx1 = newItems.findIndex(i => i.id === item1.id);
      const idx2 = newItems.findIndex(i => i.id === item2.id);
      [newItems[idx1], newItems[idx2]] = [newItems[idx2], newItems[idx1]];
      setMenuItems(newItems);
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
        <h1 className="text-3xl font-bold mb-2">Gestion des menus</h1>
        <p className="text-gray-600">Créez et gérez les menus de navigation</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{editingMenuId ? 'Modifier' : 'Créer'} un menu</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nom du menu (ex: Main Navigation)"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            disabled={!!editingMenuId}
            required
          />

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Items du menu</h3>
            <button
              type="button"
              onClick={() => addMenuItem()}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              + Ajouter un item principal
            </button>

            <div className="space-y-2 bg-gray-50 p-4 rounded">
              {menuItems.filter(i => !i.parentId).length === 0 ? (
                <p className="text-gray-500 text-sm italic">Aucun item. Ajoute-en avec le bouton ci-dessus.</p>
              ) : (
                menuItems.filter(i => !i.parentId).map((item, idx) => {
                  const children = menuItems.filter(i => i.parentId === item.id);
                  const siblings = menuItems.filter(i => !i.parentId);
                  return (
                    <div key={item.id} className="bg-white border rounded p-3 space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">Item {idx + 1}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveMenuItem(item.id, 'up')}
                            disabled={idx === 0}
                            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMenuItem(item.id, 'down')}
                            disabled={idx === siblings.length - 1}
                            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMenuItem(item.id)}
                            className="text-xs px-2 py-1 bg-red-200 hover:bg-red-300 text-red-900 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Label (texte affiché)"
                        value={item.label}
                        onChange={(e) => updateMenuItem(item.id, 'label', e.target.value)}
                        className="border rounded px-2 py-1 w-full text-sm"
                        required
                      />
                      <select
                        value={item.url}
                        onChange={(e) => updateMenuItem(item.id, 'url', e.target.value)}
                        className="border rounded px-2 py-1 w-full text-sm"
                      >
                        <option value="">-- Sélectionner une page ou URL personnalisée --</option>
                        {pages.map(page => (
                          <option key={page.id} value={`/page/${page.slug}`}>
                            {page.title} ({page.slug})
                          </option>
                        ))}
                      </select>
                      {item.url && !item.url.startsWith('/page/') && (
                        <input
                          type="text"
                          placeholder="Ou entrer une URL personnalisée"
                          value={item.url}
                          onChange={(e) => updateMenuItem(item.id, 'url', e.target.value)}
                          className="border rounded px-2 py-1 w-full text-sm"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => addMenuItem(item.id)}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        + Ajouter un sous-menu
                      </button>

                      {children.length > 0 && (
                        <div className="ml-4 space-y-2 border-l-2 border-gray-300 pl-3 pt-2">
                          {children.map((child, childIdx) => (
                            <div key={child.id} className="bg-blue-50 border border-blue-200 rounded p-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-600">Sous-menu {childIdx + 1}</span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveMenuItem(child.id, 'up', item.id)}
                                    disabled={childIdx === 0}
                                    className="text-xs px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded text-xs"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveMenuItem(child.id, 'down', item.id)}
                                    disabled={childIdx === children.length - 1}
                                    className="text-xs px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded text-xs"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeMenuItem(child.id)}
                                    className="text-xs px-1.5 py-0.5 bg-red-200 hover:bg-red-300 text-red-900 rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                placeholder="Label"
                                value={child.label}
                                onChange={(e) => updateMenuItem(child.id, 'label', e.target.value)}
                                className="border rounded px-2 py-1 w-full text-xs"
                                required
                              />
                              <select
                                value={child.url}
                                onChange={(e) => updateMenuItem(child.id, 'url', e.target.value)}
                                className="border rounded px-2 py-1 w-full text-xs"
                              >
                                <option value="">-- Sélectionner une page --</option>
                                {pages.map(page => (
                                  <option key={page.id} value={`/page/${page.slug}`}>
                                    {page.title}
                                  </option>
                                ))}
                              </select>
                              {child.url && !child.url.startsWith('/page/') && (
                                <input
                                  type="text"
                                  placeholder="URL personnalisée"
                                  value={child.url}
                                  onChange={(e) => updateMenuItem(child.id, 'url', e.target.value)}
                                  className="border rounded px-2 py-1 w-full text-xs"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold disabled:bg-gray-400"
            >
              {submitting ? 'En cours...' : editingMenuId ? 'Mettre à jour' : 'Créer'}
            </button>
            {editingMenuId && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
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
              <th className="px-6 py-3 text-left font-semibold">Nom</th>
              <th className="px-6 py-3 text-left font-semibold">Items</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <tr key={menu.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{menu.name}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{menu.items.length} items</td>
                <td className="px-6 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(menu)}
                    className="text-blue-600 hover:underline text-sm font-semibold"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(menu.id)}
                    className="text-red-600 hover:underline text-sm font-semibold"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {menus.length === 0 && (
          <div className="p-8 text-center text-gray-500">Aucun menu créé.</div>
        )}
      </div>
    </div>
  );
}
