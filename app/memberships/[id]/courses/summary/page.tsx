'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dance, Level } from '@/types/courses';

interface Dancer {
  firstName: string;
  lastName: string;
  email: string;
}

interface CourseSelection {
  [danceId: string]: string | null;
}

interface StoredData {
  dancers: Dancer[];
  selections: CourseSelection[];
  dances: Dance[];
  levels: Level[];
}

export default function CoursesSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const membershipId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StoredData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const stored = localStorage.getItem(`courses_${membershipId}`);
      if (!stored) {
        router.push(`/memberships/${membershipId}/courses`);
        return;
      }
      setData(JSON.parse(stored));
    } catch (error) {
      console.error('Error loading data:', error);
      router.push(`/memberships/${membershipId}/courses`);
    } finally {
      setLoading(false);
    }
  };

  const handleModify = (dancerIndex: number) => {
    router.push(`/memberships/${membershipId}/courses?dancer=${dancerIndex}`);
  };

  const handleConfirm = async () => {
    if (!data) return;

    try {
      setSaving(true);

      // Save each dancer's selections
      for (let i = 0; i < data.dancers.length; i++) {
        const docId = `${membershipId}_dancer_${i}`;
        await setDoc(doc(db, 'membershipCourses', docId), {
          membershipId,
          dancerIndex: i,
          dancerName: `${data.dancers[i].firstName} ${data.dancers[i].lastName}`,
          courses: data.selections[i] || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Clear localStorage
      localStorage.removeItem(`courses_${membershipId}`);

      alert('Cours enregistrés!');
      router.push('/memberships');
    } catch (error) {
      console.error('Error saving courses:', error);
      alert('Erreur: ' + error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!data) return null;

  const getLevelName = (levelId: string | null) => {
    if (!levelId) return 'Pas de cours';
    const level = data.levels.find((l) => l.id === levelId);
    return level?.name || 'Inconnu';
  };

  const getDanceName = (danceId: string) => {
    const dance = data.dances.find((d) => d.id === danceId);
    return dance?.name || 'Inconnu';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Récapitulatif des Cours</h1>
          <p className="text-gray-600">Vérifiez vos choix avant de confirmer</p>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {data.dancers.map((dancer, dancerIndex) => (
            <div key={dancerIndex} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Dancer Header */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {dancer.firstName} {dancer.lastName}
                  </h2>
                  <p className="text-sm text-gray-600">{dancer.email}</p>
                </div>
                <button
                  onClick={() => handleModify(dancerIndex)}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 text-sm"
                >
                  ✏️ Modifier
                </button>
              </div>

              {/* Courses */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.dances.map((dance) => {
                    const levelId = data.selections[dancerIndex]?.[dance.id];
                    const levelName = getLevelName(levelId);
                    return (
                      <div key={dance.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                        <span className="font-semibold text-gray-900">{dance.name}</span>
                        <span className={`text-sm font-medium px-3 py-1 rounded ${
                          levelId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {levelName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-12 flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-400"
          >
            ← Retour
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Confirmer mes cours
          </button>
        </div>
      </div>
    </div>
  );
}
