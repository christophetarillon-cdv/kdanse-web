'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Stage {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  pricing?: {
    solo: number;
    couple: number;
    ffdanse: number;
    withHousing: number;
  };
}

export default function StageDetailPage() {
  const params = useParams();
  const stageId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pricingType, setPricingType] = useState<'solo' | 'couple' | 'ffdanse' | 'withHousing'>('solo');
  const [withHousing, setWithHousing] = useState(false);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser && stageId) {
      fetchStage();
    }
  }, [firebaseUser, authLoading, stageId, router]);

  const fetchStage = async () => {
    try {
      const docRef = doc(db, 'stages', stageId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setStage({
          id: stageId,
          name: data.name,
          description: data.description,
          location: data.location,
          startDate: data.startDate?.toDate?.()?.toLocaleDateString('fr-FR') || data.startDate,
          endDate: data.endDate?.toDate?.()?.toLocaleDateString('fr-FR') || data.endDate,
          maxParticipants: data.maxParticipants,
          pricing: data.pricing,
        });
      } else {
        router.push('/stages');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firebaseUser || !stage) return;

    setSubmitting(true);
    try {
      const price = stage.pricing?.[withHousing ? 'withHousing' : pricingType] || 0;

      await addDoc(collection(db, 'memberships'), {
        userId: firebaseUser.uid,
        stageId: stage.id,
        stageName: stage.name,
        pricingCategory: withHousing ? 'withHousing' : pricingType,
        amount: price,
        status: 'pending_payment',
        createdAt: new Date(),
      });

      alert('Inscription créée ! Allez à la page des paiements pour finaliser.');
      router.push('/memberships');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de l\'inscription');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;
  if (!stage) return <div className="p-8">Stage non trouvé</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/stages" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Retour aux stages
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8">
            <h1 className="text-4xl font-bold mb-2">{stage.name}</h1>
            <p className="text-blue-100">📍 {stage.location}</p>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">À propos</h2>
              <p className="text-gray-700 mb-4">{stage.description}</p>
              {stage.startDate && stage.endDate && (
                <p className="text-gray-600">
                  <strong>Dates :</strong> {stage.startDate} - {stage.endDate}
                </p>
              )}
              {stage.maxParticipants && (
                <p className="text-gray-600">
                  <strong>Places :</strong> {stage.maxParticipants}
                </p>
              )}
            </div>

            <div className="border-t pt-8">
              <h2 className="text-2xl font-semibold mb-4">Tarifs</h2>
              {stage.pricing ? (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      pricingType === 'solo' && !withHousing
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setPricingType('solo');
                      setWithHousing(false);
                    }}
                  >
                    <p className="font-semibold">Solo</p>
                    <p className="text-2xl font-bold text-blue-600">{stage.pricing.solo}€</p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      pricingType === 'couple' && !withHousing
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => {
                      setPricingType('couple');
                      setWithHousing(false);
                    }}
                  >
                    <p className="font-semibold">Couple</p>
                    <p className="text-2xl font-bold text-green-600">{stage.pricing.couple}€</p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      pricingType === 'ffdanse' && !withHousing
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => {
                      setPricingType('ffdanse');
                      setWithHousing(false);
                    }}
                  >
                    <p className="font-semibold">FFDanse</p>
                    <p className="text-2xl font-bold text-purple-600">{stage.pricing.ffdanse}€</p>
                  </div>

                  <div className="p-4 border-2 border-gray-200 rounded-lg flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={withHousing}
                      onChange={(e) => setWithHousing(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-semibold">+ Logement</p>
                      <p className="text-lg font-bold text-orange-600">+{stage.pricing.withHousing}€</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Tarifs non disponibles</p>
              )}
            </div>

            <div className="border-t pt-8">
              <button
                onClick={handleRegister}
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Inscription en cours...' : 'S\'inscrire à ce stage'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
