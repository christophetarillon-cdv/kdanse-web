'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Stage {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate?: string;
  endDate?: string;
  pricing?: {
    solo: number;
    couple: number;
    ffdanse: number;
    withHousing: number;
  };
}

export default function AdminStagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    pricing: {
      solo: 0,
      couple: 0,
      ffdanse: 0,
      withHousing: 0,
    },
  });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stages'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Stage[];
      setStages(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateDoc(doc(db, 'stages', editing), form);
        setEditing(null);
      } else {
        await addDoc(collection(db, 'stages'), {
          ...form,
          createdAt: new Date(),
        });
      }
      setForm({ name: '', description: '', location: '', startDate: '', endDate: '', pricing: { solo: 0, couple: 0, ffdanse: 0, withHousing: 0 } });
      fetchStages();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEdit = (stage: Stage) => {
    setForm({
      name: stage.name,
      description: stage.description,
      location: stage.location,
      startDate: stage.startDate || '',
      endDate: stage.endDate || '',
      pricing: stage.pricing || { solo: 0, couple: 0, ffdanse: 0, withHousing: 0 },
    });
    setEditing(stage.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce stage ?')) return;
    try {
      await deleteDoc(doc(db, 'stages', id));
      fetchStages();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({ name: '', description: '', location: '', startDate: '', endDate: '', pricing: { solo: 0, couple: 0, ffdanse: 0, withHousing: 0 } });
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestion des Stages</h1>
        <p className="text-gray-600">Créez et gérez les stages Kdanse</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{editing ? 'Modifier' : 'Créer'} un stage</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom du stage"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="Lieu"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
          </div>

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded px-3 py-2 w-full h-24"
            required
          />

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Tarifs (€)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Solo"
                value={form.pricing.solo || ''}
                onChange={(e) => setForm({
                  ...form,
                  pricing: { ...form.pricing, solo: parseFloat(e.target.value) || 0 }
                })}
                className="border rounded px-3 py-2"
                min="0"
                step="0.01"
              />
              <input
                type="number"
                placeholder="En couple"
                value={form.pricing.couple || ''}
                onChange={(e) => setForm({
                  ...form,
                  pricing: { ...form.pricing, couple: parseFloat(e.target.value) || 0 }
                })}
                className="border rounded px-3 py-2"
                min="0"
                step="0.01"
              />
              <input
                type="number"
                placeholder="FFDanse"
                value={form.pricing.ffdanse || ''}
                onChange={(e) => setForm({
                  ...form,
                  pricing: { ...form.pricing, ffdanse: parseFloat(e.target.value) || 0 }
                })}
                className="border rounded px-3 py-2"
                min="0"
                step="0.01"
              />
              <input
                type="number"
                placeholder="Avec logement"
                value={form.pricing.withHousing || ''}
                onChange={(e) => setForm({
                  ...form,
                  pricing: { ...form.pricing, withHousing: parseFloat(e.target.value) || 0 }
                })}
                className="border rounded px-3 py-2"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold"
            >
              {editing ? 'Mettre à jour' : 'Créer'}
            </button>
            {editing && (
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Nom</th>
              <th className="px-6 py-3 text-left font-semibold">Lieu</th>
              <th className="px-6 py-3 text-left font-semibold">Dates</th>
              <th className="px-6 py-3 text-left font-semibold">Tarifs</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stages.map(stage => (
              <tr key={stage.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{stage.name}</td>
                <td className="px-6 py-3">{stage.location}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {stage.startDate && stage.endDate
                    ? `${stage.startDate.substring(0, 10)} - ${stage.endDate.substring(0, 10)}`
                    : 'Non défini'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {stage.pricing ? (
                    <div className="space-y-1">
                      <p>Solo: {stage.pricing.solo}€</p>
                      <p>Couple: {stage.pricing.couple}€</p>
                      <p>FFDanse: {stage.pricing.ffdanse}€</p>
                      <p>Logement: {stage.pricing.withHousing}€</p>
                    </div>
                  ) : 'Non défini'}
                </td>
                <td className="px-6 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(stage)}
                    className="text-blue-600 hover:underline text-sm font-semibold"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="text-red-600 hover:underline text-sm font-semibold"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stages.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucun stage créé. Créez-en un avec le formulaire ci-dessus.
          </div>
        )}
      </div>
    </div>
  );
}
