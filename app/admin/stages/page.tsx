'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Stage {
  id: string;
  name: string;
  description: string;
  location: string;
}

export default function AdminStagesPage() {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
  });

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (user && !user.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }

    if (firebaseUser) {
      fetchStages();
    }
  }, [loading, firebaseUser, user, router]);

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
      setStagesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'stages'), {
        ...formData,
        createdAt: new Date(),
      });
      setFormData({ name: '', description: '', location: '' });
      fetchStages();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce stage ?')) {
      try {
        await deleteDoc(doc(db, 'stages', id));
        fetchStages();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  if (loading || stagesLoading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !user?.roles?.includes('admin')) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Gestion des Stages</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Créer un stage</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            required
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            required
          />
          <input
            type="text"
            placeholder="Lieu"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Créer
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Nom</th>
              <th className="px-6 py-3 text-left font-semibold">Lieu</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stages.map(stage => (
              <tr key={stage.id} className="border-b">
                <td className="px-6 py-3">{stage.name}</td>
                <td className="px-6 py-3">{stage.location}</td>
                <td className="px-6 py-3">
                  <button onClick={() => handleDelete(stage.id)} className="text-red-600 hover:underline text-sm">
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
