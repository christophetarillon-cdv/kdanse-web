'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDances, createDance, updateDance, deleteDance } from '@/services/coursesService';
import { getLevels, createLevel, updateLevel, deleteLevel } from '@/services/coursesService';
import { Dance, Level } from '@/types/courses';

export default function AdminCoursesPage() {
  const [dances, setDances] = useState<Dance[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  // Dances
  const [editingDance, setEditingDance] = useState<Dance | null>(null);
  const [danceName, setDanceName] = useState('');
  const [danceOrder, setDanceOrder] = useState(1);

  // Levels
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [levelName, setLevelName] = useState('');
  const [levelOrder, setLevelOrder] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [d, l] = await Promise.all([getDances(), getLevels()]);
      setDances(d);
      setLevels(l);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // === DANCES ===
  const handleSaveDance = async () => {
    if (!danceName.trim()) {
      alert('Veuillez entrer un nom de danse');
      return;
    }
    try {
      if (editingDance) {
        await updateDance(editingDance.id, danceName, danceOrder);
      } else {
        await createDance(danceName, danceOrder);
      }
      setDanceName('');
      setDanceOrder(1);
      setEditingDance(null);
      await loadData();
    } catch (error) {
      console.error('Error saving dance:', error);
      alert('Erreur: ' + error);
    }
  };

  const handleEditDance = (dance: Dance) => {
    setEditingDance(dance);
    setDanceName(dance.name);
    setDanceOrder(dance.order);
  };

  const handleDeleteDance = async (id: string) => {
    if (!confirm('Supprimer cette danse?')) return;
    try {
      await deleteDance(id);
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur: ' + error);
    }
  };

  const handleCancelDance = () => {
    setEditingDance(null);
    setDanceName('');
    setDanceOrder(1);
  };

  // === LEVELS ===
  const handleSaveLevel = async () => {
    if (!levelName.trim()) {
      alert('Veuillez entrer un nom de niveau');
      return;
    }
    try {
      if (editingLevel) {
        await updateLevel(editingLevel.id, levelName, levelOrder);
      } else {
        await createLevel(levelName, levelOrder);
      }
      setLevelName('');
      setLevelOrder(1);
      setEditingLevel(null);
      await loadData();
    } catch (error) {
      console.error('Error saving level:', error);
      alert('Erreur: ' + error);
    }
  };

  const handleEditLevel = (level: Level) => {
    setEditingLevel(level);
    setLevelName(level.name);
    setLevelOrder(level.order);
  };

  const handleDeleteLevel = async (id: string) => {
    if (!confirm('Supprimer ce niveau?')) return;
    try {
      await deleteLevel(id);
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur: ' + error);
    }
  };

  const handleCancelLevel = () => {
    setEditingLevel(null);
    setLevelName('');
    setLevelOrder(1);
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:underline text-sm">
            ← Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">🎵 Gérer les Cours</h1>
          <p className="text-gray-600">Créer les danses et niveaux disponibles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ===== DANCES SECTION ===== */}
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h2 className="text-xl font-bold text-gray-900">💃 Danses</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Nom*</label>
                  <input
                    type="text"
                    value={danceName}
                    onChange={(e) => setDanceName(e.target.value)}
                    placeholder="Ex: Rock, Valse..."
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Ordre*</label>
                  <input
                    type="number"
                    value={danceOrder}
                    onChange={(e) => setDanceOrder(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                {editingDance && (
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleCancelDance}
                      className="flex-1 bg-gray-300 text-gray-900 py-2 rounded font-semibold hover:bg-gray-400 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
              <div className="p-6 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Liste ({dances.length})</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {dances.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Aucune danse
                  </div>
                ) : (
                  dances.map((dance) => (
                    <div key={dance.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{dance.name}</p>
                        <p className="text-xs text-gray-500">Ordre: {dance.order}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditDance(dance)}
                          className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-semibold hover:bg-blue-200"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteDance(dance.id)}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold hover:bg-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ===== LEVELS SECTION ===== */}
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-green-50 to-green-100">
                <h2 className="text-xl font-bold text-gray-900">📊 Niveaux</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Nom*</label>
                  <input
                    type="text"
                    value={levelName}
                    onChange={(e) => setLevelName(e.target.value)}
                    placeholder="Ex: Débutant, Moyen..."
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Ordre*</label>
                  <input
                    type="number"
                    value={levelOrder}
                    onChange={(e) => setLevelOrder(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                {editingLevel && (
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleCancelLevel}
                      className="flex-1 bg-gray-300 text-gray-900 py-2 rounded font-semibold hover:bg-gray-400 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
              <div className="p-6 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Liste ({levels.length})</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {levels.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Aucun niveau
                  </div>
                ) : (
                  levels.map((level) => (
                    <div key={level.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{level.name}</p>
                        <p className="text-xs text-gray-500">Ordre: {level.order}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditLevel(level)}
                          className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-semibold hover:bg-green-200"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteLevel(level.id)}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold hover:bg-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="mt-12 flex gap-4 justify-end">
          <button
            onClick={() => {
              if (editingDance) handleSaveDance();
              if (editingLevel) handleSaveLevel();
              if (!editingDance && !editingLevel) {
                alert('Remplissez un formulaire avant de sauvegarder');
              }
            }}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            ✓ Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
