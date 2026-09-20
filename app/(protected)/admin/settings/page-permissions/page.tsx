'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { PagePermissions } from '@/types';

const availablePages = [
  { id: 'membership', name: 'Adhésion / Paiement' },
  { id: 'admin-payment-plans', name: 'Admin - Validation paiements' },
  { id: 'admin-payments-today', name: 'Admin - Encaissement' },
  { id: 'admin-accounting', name: 'Admin - Comptabilité' },
];

const availableRoles = ['admin', 'prof', 'animateur', 'user'];

export default function PagePermissionsPage() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PagePermissions>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'appSettings', 'main'));
      if (settingsDoc.exists()) {
        setPermissions(settingsDoc.data().pagePermissions || {});
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  };

  const handleRoleToggle = (pageId: string, role: string) => {
    setPermissions((prev) => {
      const current = prev[pageId] || [];
      const updated = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [pageId]: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setDoc(
        doc(db, 'appSettings', 'main'),
        { pagePermissions: permissions },
        { merge: true }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.roles.includes('admin')) {
    return <p className="text-red-600">Accès refusé</p>;
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Gestion des permissions par page
      </h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {availablePages.map((page) => (
          <div key={page.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">{page.name}</h3>
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(permissions[page.id] || []).includes(role)}
                    onChange={() => handleRoleToggle(page.id, role)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700 capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
    </div>
  );
}
