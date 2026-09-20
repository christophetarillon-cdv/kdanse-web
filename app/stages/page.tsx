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
}

export default function StagesPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser) {
      fetchStages();
    }
  }, [loading, firebaseUser, router]);

  const fetchStages = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stages'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        location: doc.data().location,
      })) as Stage[];
      setStages(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setStagesLoading(false);
    }
  };

  if (loading || stagesLoading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">Stages disponibles</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">← Retour</Link>
        </div>

        {stages.length === 0 ? (
          <p className="text-gray-600 text-lg">Aucun stage disponible</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {stages.map(stage => (
              <div key={stage.id} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-2">{stage.name}</h2>
                <p className="text-gray-600 mb-4">{stage.description}</p>
                <p className="text-gray-700 mb-4"><strong>Lieu :</strong> {stage.location}</p>
                <Link href={`/stages/${stage.id}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Voir détails
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
