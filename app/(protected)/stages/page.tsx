'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

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

export default function StagesPage() {
  const { user } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const stagesRef = collection(db, 'stages');
        const snapshot = await getDocs(stagesRef);
        const stagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().startDate?.toDate?.()?.toLocaleDateString('fr-FR') || doc.data().startDate,
          endDate: doc.data().endDate?.toDate?.()?.toLocaleDateString('fr-FR') || doc.data().endDate,
        })) as Stage[];
        setStages(stagesData);
      } catch (err) {
        setError('Erreur lors du chargement des stages');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Chargement des stages...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Stages disponibles</h1>

        {stages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Aucun stage disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {stages.map(stage => (
              <div key={stage.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <h2 className="text-2xl font-bold mb-2 text-gray-900">{stage.name}</h2>
                <p className="text-gray-600 mb-4">{stage.description}</p>

                <div className="space-y-2 mb-4 text-sm">
                  <p className="text-gray-700">
                    <span className="font-semibold">Dates :</span> {stage.startDate} - {stage.endDate}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Lieu :</span> {stage.location}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Places :</span> {stage.maxParticipants}
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-gray-900">Tarifs</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-gray-600">Solo</p>
                      <p className="font-bold text-blue-600">{stage.pricing.solo}€</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-gray-600">Couple</p>
                      <p className="font-bold text-green-600">{stage.pricing.couple}€</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <p className="text-gray-600">FFDanse</p>
                      <p className="font-bold text-purple-600">{stage.pricing.ffdanse}€</p>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <p className="text-gray-600">+ Logement</p>
                      <p className="font-bold text-orange-600">{stage.pricing.withHousing}€</p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/stages/${stage.id}`}
                  className="w-full block text-center bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
                >
                  S&apos;inscrire
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
