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
    stage: {
      soloLicensed: number;
      soloUnlicensed: number;
      coupleUnlicensed: number;
      coupleLicensed: number;
      coupleMixed: number;
    };
    housing: {
      solo: number;
      couple: number;
    };
  };
}

const defaultPricing = {
  stage: {
    soloLicensed: 0,
    soloUnlicensed: 0,
    coupleUnlicensed: 0,
    coupleLicensed: 0,
    coupleMixed: 0,
  },
  housing: {
    solo: 0,
    couple: 0,
  },
};

export default function AdminStagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    pricing: defaultPricing,
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
      setForm({ name: '', description: '', location: '', startDate: '', endDate: '', pricing: defaultPricing });
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
      pricing: stage.pricing || defaultPricing,
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
    setForm({ name: '', description: '', location: '', startDate: '', endDate: '', pricing: defaultPricing });
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

          {/* Tarifs du stage */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-2">1</span>
              Tarifs du stage (€)
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solo licencié</label>
                  <input
                    type="number"
                    value={form.pricing.stage.soloLicensed || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        stage: { ...form.pricing.stage, soloLicensed: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solo non licencié</label>
                  <input
                    type="number"
                    value={form.pricing.stage.soloUnlicensed || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        stage: { ...form.pricing.stage, soloUnlicensed: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couple non licencié</label>
                  <input
                    type="number"
                    value={form.pricing.stage.coupleUnlicensed || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        stage: { ...form.pricing.stage, coupleUnlicensed: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couple licencié</label>
                  <input
                    type="number"
                    value={form.pricing.stage.coupleLicensed || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        stage: { ...form.pricing.stage, coupleLicensed: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couple mixte (1 lic. + 1 non lic.)</label>
                  <input
                    type="number"
                    value={form.pricing.stage.coupleMixed || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        stage: { ...form.pricing.stage, coupleMixed: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarifs hébergement */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
              <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-2">2</span>
              Tarifs de l'hébergement (€)
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hébergement solo (par place)</label>
                  <input
                    type="number"
                    value={form.pricing.housing.solo || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        housing: { ...form.pricing.housing, solo: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hébergement couple (lit double, 2 places)</label>
                  <input
                    type="number"
                    value={form.pricing.housing.couple || ''}
                    onChange={(e) => setForm({
                      ...form,
                      pricing: {
                        ...form.pricing,
                        housing: { ...form.pricing.housing, couple: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
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
                <td className="px-6 py-3 text-xs text-gray-600">
                  {stage.pricing ? (
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-blue-700">Stage:</p>
                        <p>Solo lic.: {stage.pricing.stage.soloLicensed}€</p>
                        <p>Solo non lic.: {stage.pricing.stage.soloUnlicensed}€</p>
                        <p>Couple lic.: {stage.pricing.stage.coupleLicensed}€</p>
                        <p>Couple non lic.: {stage.pricing.stage.coupleUnlicensed}€</p>
                        <p>Couple mixte: {stage.pricing.stage.coupleMixed}€</p>
                      </div>
                      <div>
                        <p className="font-semibold text-green-700">Hébergement:</p>
                        <p>Solo: {stage.pricing.housing.solo}€</p>
                        <p>Couple: {stage.pricing.housing.couple}€</p>
                      </div>
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
