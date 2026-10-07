'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDances, createDance, updateDance, deleteDance } from '@/services/coursesService';
import { Dance } from '@/types/courses';

export default function AdminDancesPage() {
  const [dances, setDances] = useState<Dance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Dance | null>(null);
  const [formName, setFormName] = useState('');
  const [formOrder, setFormOrder] = useState(1);

  useEffect(() => {
    loadDances();
  }, []);

  const loadDances = async () => {
    try {
      setLoading(true);
      const data = await getDances();
      setDances(data);
    } catch (error) {
      console.error('Error loading dances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('Veuillez entrer un nom de danse');
      return;
    }

    try {
      if (editing) {
        await updateDance(editing.id, formName, formOrder);
      } else {
        await createDance(formName, formOrder);
      }
      setFormName('');
      setFormOrder(1);
      setEditing(null);
      await loadDances();
    } catch (error) {
      console.error('Error saving dance:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (dance: Dance) => {
    setEditing(dance);
    setFormName(dance.name);
    setFormOrder(dance.order);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette danse?')) return;
    try {
      await deleteDance(id);
      await loadDances();
    } catch (error) {
      console.error('Error deleting dance:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setFormName('');
    setFormOrder(1);
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-width-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:underline text-sm">
            ← Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">💃 Gérer les Danses</h1>
          <p className="text-gray-600">Créer et modifier les types de danse disponibles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? '✏️ Modifier' : '➕ Ajouter'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Nom*</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Rock, Valse, Tango..."
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Ordre*</label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
                >
                  Enregistrer
                </button>
                {editing && (
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-300 text-gray-900 py-2 rounded font-semibold hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Liste ({dances.length})</h2>
            </div>

            <div className="divide-y">
              {dances.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Aucune danse créée
                </div>
              ) : (
                dances.map((dance) => (
                  <div key={dance.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">{dance.name}</p>
                      <p className="text-sm text-gray-500">Ordre: {dance.order}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dance)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm font-semibold hover:bg-blue-200"
                      >
                        Éditer
                      </button>
                      <button
                        onClick={() => handleDelete(dance.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm font-semibold hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
