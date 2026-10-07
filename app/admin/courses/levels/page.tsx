'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLevels, createLevel, updateLevel, deleteLevel } from '@/services/coursesService';
import { Level } from '@/types/courses';

export default function AdminLevelsPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Level | null>(null);
  const [formName, setFormName] = useState('');
  const [formOrder, setFormOrder] = useState(1);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      setLoading(true);
      const data = await getLevels();
      setLevels(data);
    } catch (error) {
      console.error('Error loading levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('Veuillez entrer un nom de niveau');
      return;
    }

    try {
      if (editing) {
        await updateLevel(editing.id, formName, formOrder);
      } else {
        await createLevel(formName, formOrder);
      }
      setFormName('');
      setFormOrder(1);
      setEditing(null);
      await loadLevels();
    } catch (error) {
      console.error('Error saving level:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (level: Level) => {
    setEditing(level);
    setFormName(level.name);
    setFormOrder(level.order);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce niveau?')) return;
    try {
      await deleteLevel(id);
      await loadLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">📊 Gérer les Niveaux</h1>
          <p className="text-gray-600">Créer et modifier les niveaux disponibles</p>
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
                  placeholder="Ex: Débutant, Moyen, Avancé..."
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
              <h2 className="text-lg font-bold text-gray-900">Liste ({levels.length})</h2>
            </div>

            <div className="divide-y">
              {levels.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Aucun niveau créé
                </div>
              ) : (
                levels.map((level) => (
                  <div key={level.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">{level.name}</p>
                      <p className="text-sm text-gray-500">Ordre: {level.order}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(level)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm font-semibold hover:bg-blue-200"
                      >
                        Éditer
                      </button>
                      <button
                        onClick={() => handleDelete(level.id)}
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
