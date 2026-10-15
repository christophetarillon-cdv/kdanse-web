'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AcquisitionSource } from '@/types/courses';
import {
  getAcquisitionSources,
  createAcquisitionSource,
  updateAcquisitionSource,
  deleteAcquisitionSource,
} from '@/services/acquisitionSourceService';

export default function AdminAcquisitionSourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newOrder, setNewOrder] = useState(1);
  const [editing, setEditing] = useState<AcquisitionSource | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    loadSources();
  }, [authLoading, user, router]);

  const loadSources = async () => {
    try {
      setLoading(true);
      setSources(await getAcquisitionSources());
    } catch (error) {
      console.error('Error loading acquisition sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      alert('Veuillez saisir un libellé');
      return;
    }
    setSaving(true);
    try {
      await createAcquisitionSource(newLabel.trim(), newOrder);
      setNewLabel('');
      setNewOrder(1);
      await loadSources();
    } catch (error) {
      console.error('Error creating acquisition source:', error);
      alert('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editing.label.trim()) {
      alert('Le libellé ne peut pas être vide');
      return;
    }
    setSaving(true);
    try {
      await updateAcquisitionSource(editing.id, {
        label: editing.label.trim(),
        order: editing.order,
      });
      setEditing(null);
      await loadSources();
    } catch (error) {
      console.error('Error updating acquisition source:', error);
      alert('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (source: AcquisitionSource) => {
    if (!window.confirm(`Supprimer la réponse « ${source.label} » ? Les inscriptions déjà répondues la garderont, mais sans libellé à afficher.`)) {
      return;
    }
    try {
      await deleteAcquisitionSource(source.id);
      await loadSources();
    } catch (error) {
      console.error('Error deleting acquisition source:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (source: AcquisitionSource) => {
    try {
      await updateAcquisitionSource(source.id, { active: !source.active });
      await loadSources();
    } catch (error) {
      console.error('Error toggling acquisition source:', error);
      alert('Erreur lors de la modification');
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📣 Origine des inscriptions</h1>
            <p className="text-gray-900 font-medium">
              Réponses proposées aux nouveaux clients à la question « Comment avez-vous connu notre stage ? »
            </p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Accueil
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Ajouter une réponse</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex : Bouche à oreille"
              className="flex-1 border rounded px-4 py-2 text-gray-900"
            />
            <input
              type="number"
              value={newOrder}
              onChange={(e) => setNewOrder(Number(e.target.value))}
              className="w-24 border rounded px-4 py-2 text-gray-900"
              aria-label="Ordre"
            />
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-ink hover:bg-ink-soft text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {sources.length === 0 ? (
            <p className="p-8 text-center text-gray-900 font-medium">Aucune réponse configurée</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr className="text-left font-semibold text-gray-900">
                  <th className="px-4 py-3">Ordre</th>
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sources.map((source) => {
                  const isEditing = editing?.id === source.id;
                  return (
                    <tr key={source.id} className="text-gray-900">
                      <td className="px-4 py-3 w-24">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editing.order}
                            onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                            className="w-20 border rounded px-2 py-1"
                          />
                        ) : (
                          source.order
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editing.label}
                            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                            className="w-full border rounded px-2 py-1"
                          />
                        ) : (
                          <span className="font-semibold">{source.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(source)}
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            source.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {source.active ? 'Proposée' : 'Masquée'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="text-green-700 font-semibold mr-3 disabled:opacity-50"
                            >
                              Enregistrer
                            </button>
                            <button onClick={() => setEditing(null)} className="text-gray-700 underline">
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing(source)} className="text-gold-deep underline mr-3">
                              Modifier
                            </button>
                            <button onClick={() => handleDelete(source)} className="text-red-600 underline">
                              Supprimer
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
