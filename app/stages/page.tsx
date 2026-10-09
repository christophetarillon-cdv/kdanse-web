'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stage {
  id: string;
  name: string;
  description: string;
  location: string;
  imageUrl?: string;
}

export default function StagesPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      fetchStages();
    }
  }, [loading]);

  const fetchStages = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stages'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        location: doc.data().location,
        imageUrl: doc.data().imageUrl,
      })) as Stage[];
      setStages(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setStagesLoading(false);
    }
  };

  if (loading || stagesLoading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">Stages disponibles</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">← Retour</Link>
        </div>

        {stages.length === 0 ? (
          <p className="text-gray-900 font-medium text-lg">Aucun stage disponible</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {stages.map(stage => (
              <div key={stage.id} className="bg-white rounded-lg shadow-md p-6">
                {stage.imageUrl && (
                  <img src={stage.imageUrl} alt={stage.name} className="w-full h-48 object-cover rounded mb-4" />
                )}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{stage.name}</h2>
                <p className="text-gray-900 font-medium mb-4 whitespace-pre-wrap">{stage.description}</p>
                <p className="text-gray-900 mb-4"><strong>Lieu :</strong> {stage.location}</p>
                <Link href={`/stages/${stage.id}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Je m'inscris
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
