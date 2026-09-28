'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getConfig, updateConfig } from '@/services/configService';
import { getAllMenus } from '@/services/menuService';
import type { SiteConfig } from '@/types/config';
import type { Menu } from '@/types/menu';

export default function AdminSettingsPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.roles?.includes('admin');

  useEffect(() => {
    if (!authLoading && (!firebaseUser || !isAdmin)) {
      router.push('/dashboard');
      return;
    }

    if (firebaseUser && isAdmin) {
      fetchData();
    }
  }, [firebaseUser, authLoading, isAdmin, router]);

  const fetchData = async () => {
    try {
      const [configData, menusData] = await Promise.all([
        getConfig(),
        getAllMenus(),
      ]);
      setConfig(configData);
      setMenus(menusData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSubmitting(true);
    try {
      await updateConfig({
        headerMenuId: config.headerMenuId,
        footerMenuId: config.footerMenuId,
      });
      alert('✅ Configuration sauvegardée !');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Erreur: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !isAdmin || !config) return null;

  return (
    <div className="space-y-8 p-8">
      <div>
        <Link href="/admin" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour admin
        </Link>
        <h1 className="text-3xl font-bold mb-2">Paramètres du site</h1>
        <p className="text-gray-600">Configurez les menus et les éléments globaux</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-6">Menus du site</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Menu du Header</label>
            <select
              value={config.headerMenuId || ''}
              onChange={(e) =>
                setConfig({ ...config, headerMenuId: e.target.value || undefined })
              }
              className="border rounded px-3 py-2 w-full"
            >
              <option value="">-- Aucun menu --</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Ce menu s'affichera dans le header du site
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-900 mb-2">Menu du Footer</label>
            <select
              value={config.footerMenuId || ''}
              onChange={(e) =>
                setConfig({ ...config, footerMenuId: e.target.value || undefined })
              }
              className="border rounded px-3 py-2 w-full"
            >
              <option value="">-- Aucun menu --</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Ce menu s'affichera dans le footer du site
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold disabled:bg-gray-400"
          >
            {submitting ? 'En cours...' : 'Sauvegarder'}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Comment ça marche ?</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Crée des menus dans "Gérer les menus"</li>
          <li>Assigne-les au Header ou Footer ici</li>
          <li>Ils s'affichent automatiquement sur le site</li>
        </ol>
      </div>
    </div>
  );
}
