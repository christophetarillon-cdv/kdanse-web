'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Stage {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  pricing: {
    solo: number;
    couple: number;
    ffdanse: number;
    withHousing: number;
  };
  location: string;
}

const initialFormData = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  maxParticipants: 30,
  location: '',
  pricing: {
    solo: 300,
    couple: 500,
    ffdanse: 200,
    withHousing: 150,
  },
};

export default function AdminStagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.roles?.includes('admin')) {
      router.push('/');
      return;
    }
    fetchStages();
  }, [user, router]);

  const fetchStages = async () => {
    try {
      const stagesRef = collection(db, 'stages');
      const snapshot = await getDocs(stagesRef);
      const stagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Stage[];
      setStages(stagesData);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'stages', editingId), {
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
        });
      } else {
        await addDoc(collection(db, 'stages'), {
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          createdAt: new Date(),
        });
      }
      setFormData(initialFormData);
      setIsEditing(false);
      setEditingId(null);
      fetchStages();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr ?')) {
      try {
        await deleteDoc(doc(db, 'stages', id));
        fetchStages();
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  const handleEdit = (stage: Stage) => {
    setFormData({
      name: stage.name,
      description: stage.description,
      startDate: stage.startDate.split('T')[0],
      endDate: stage.endDate.split('T')[0],
      maxParticipants: stage.maxParticipants,
      location: stage.location,
      pricing: stage.pricing,
    });
    setEditingId(stage.id);
    setIsEditing(true);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Gestion des Stages</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Modifier' : 'Créer'} un stage</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="Lieu"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
          </div>

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            rows={3}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="Places max"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
              className="border rounded px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <input
              type="number"
              placeholder="Solo (€)"
              value={formData.pricing.solo}
              onChange={(e) => setFormData({
                ...formData,
                pricing: { ...formData.pricing, solo: parseInt(e.target.value) }
              })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="Couple (€)"
              value={formData.pricing.couple}
              onChange={(e) => setFormData({
                ...formData,
                pricing: { ...formData.pricing, couple: parseInt(e.target.value) }
              })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="FFDanse (€)"
              value={formData.pricing.ffdanse}
              onChange={(e) => setFormData({
                ...formData,
                pricing: { ...formData.pricing, ffdanse: parseInt(e.target.value) }
              })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="Logement (€)"
              value={formData.pricing.withHousing}
              onChange={(e) => setFormData({
                ...formData,
                pricing: { ...formData.pricing, withHousing: parseInt(e.target.value) }
              })}
              className="border rounded px-3 py-2"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {isEditing ? 'Mettre à jour' : 'Créer'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  setFormData(initialFormData);
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
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
              <th className="px-6 py-3 text-left font-semibold">Dates</th>
              <th className="px-6 py-3 text-left font-semibold">Lieu</th>
              <th className="px-6 py-3 text-left font-semibold">Places</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stages.map(stage => (
              <tr key={stage.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{stage.name}</td>
                <td className="px-6 py-3 text-sm">{stage.startDate} - {stage.endDate}</td>
                <td className="px-6 py-3">{stage.location}</td>
                <td className="px-6 py-3">{stage.maxParticipants}</td>
                <td className="px-6 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(stage)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
