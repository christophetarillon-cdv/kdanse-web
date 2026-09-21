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

interface Dancer {
  licensed: boolean;
}

interface RegistrationForm {
  danceType: 'solo' | 'couple'; // solo ou couple de danseurs
  dancers: Dancer[]; // array of 1 or 2 dancers
  housingSolo: number;
  housingCouple: number;
}

export default function StageDetailPage() {
  const params = useParams();
  const stageId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RegistrationForm>({
    danceType: 'solo',
    dancers: [{ licensed: false }],
    housingSolo: 0,
    housingCouple: 0,
  });

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

  const calculatePrice = (): number => {
    if (!stage?.pricing) return 0;

    let stagePrice = 0;
    const p = stage.pricing.stage;

    // Calcul du prix du stage
    if (form.danceType === 'solo') {
      stagePrice = form.dancers[0]?.licensed ? p.soloLicensed : p.soloUnlicensed;
    } else if (form.danceType === 'couple') {
      const d1Licensed = form.dancers[0]?.licensed;
      const d2Licensed = form.dancers[1]?.licensed;

      if (d1Licensed && d2Licensed) {
        stagePrice = p.coupleLicensed;
      } else if (!d1Licensed && !d2Licensed) {
        stagePrice = p.coupleUnlicensed;
      } else {
        stagePrice = p.coupleMixed;
      }
    }

    // Calcul du prix d'hébergement
    const housingPrice = (form.housingSolo * stage.pricing.housing.solo) +
                         (form.housingCouple * stage.pricing.housing.couple);

    return stagePrice + housingPrice;
  };

  const handleRegister = async () => {
    if (!firebaseUser || !stage) return;

    setSubmitting(true);
    try {
      const totalPrice = calculatePrice();
      const summary = {
        danceType: form.danceType,
        dancers: form.dancers,
        housingSolo: form.housingSolo,
        housingCouple: form.housingCouple,
      };

      await addDoc(collection(db, 'memberships'), {
        userId: firebaseUser.uid,
        stageId: stage.id,
        stageName: stage.name,
        registrationDetails: summary,
        amount: totalPrice,
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

            {/* Formulaire d'inscription flexible */}
            <div className="border-t pt-8">
              <h2 className="text-2xl font-semibold mb-6">Configurez votre inscription</h2>

              {/* Étape 1: Type de participation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                  Nombre de danseurs
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setForm({ ...form, danceType: 'solo', dancers: [{ licensed: false }] })}
                    className={`flex-1 p-4 border-2 rounded-lg font-semibold transition ${
                      form.danceType === 'solo'
                        ? 'border-blue-600 bg-blue-100 text-blue-900'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    🧑‍🎤 Solo
                  </button>
                  <button
                    onClick={() => setForm({ ...form, danceType: 'couple', dancers: [{ licensed: false }, { licensed: false }] })}
                    className={`flex-1 p-4 border-2 rounded-lg font-semibold transition ${
                      form.danceType === 'couple'
                        ? 'border-blue-600 bg-blue-100 text-blue-900'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    👥 Couple
                  </button>
                </div>
              </div>

              {/* Étape 2: Statut FFDanse */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
                  <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                  Licence FFDanse
                </h3>
                <div className="space-y-3">
                  {form.dancers.map((dancer, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-white rounded border">
                      <label className="flex-1 font-medium text-gray-700">
                        {form.danceType === 'solo' ? 'Vous êtes' : `Danseur${idx + 1}`}
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const newDancers = [...form.dancers];
                            newDancers[idx].licensed = false;
                            setForm({ ...form, dancers: newDancers });
                          }}
                          className={`px-4 py-2 rounded font-semibold transition ${
                            !dancer.licensed
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Non licencié
                        </button>
                        <button
                          onClick={() => {
                            const newDancers = [...form.dancers];
                            newDancers[idx].licensed = true;
                            setForm({ ...form, dancers: newDancers });
                          }}
                          className={`px-4 py-2 rounded font-semibold transition ${
                            dancer.licensed
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Licencié FFDanse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Étape 3: Hébergement */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
                  Hébergement
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-medium text-gray-700 mb-3">
                      Chambres solo ({stage?.pricing?.housing.solo}€ chacune)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setForm({ ...form, housingSolo: Math.max(0, form.housingSolo - 1) })}
                        className="w-10 h-10 bg-gray-300 hover:bg-gray-400 rounded font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={form.housingSolo}
                        onChange={(e) => setForm({ ...form, housingSolo: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-16 border rounded px-3 py-2 text-center font-semibold"
                        min="0"
                      />
                      <button
                        onClick={() => setForm({ ...form, housingSolo: form.housingSolo + 1 })}
                        className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-3">
                      Lits couples ({stage?.pricing?.housing.couple}€ chacun)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setForm({ ...form, housingCouple: Math.max(0, form.housingCouple - 1) })}
                        className="w-10 h-10 bg-gray-300 hover:bg-gray-400 rounded font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={form.housingCouple}
                        onChange={(e) => setForm({ ...form, housingCouple: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-16 border rounded px-3 py-2 text-center font-semibold"
                        min="0"
                      />
                      <button
                        onClick={() => setForm({ ...form, housingCouple: form.housingCouple + 1 })}
                        className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Résumé du prix */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-orange-900 mb-4">Résumé de votre inscription</h3>
                <div className="space-y-2 text-gray-800 mb-4">
                  <p>
                    <strong>Participation stage:</strong> {form.danceType === 'solo' ? '1 danseur' : '2 danseurs'}
                    {form.dancers.some(d => d.licensed) && ' (licencié FFDanse)'}
                  </p>
                  {form.housingSolo > 0 && <p><strong>Hébergement solo:</strong> {form.housingSolo} place(s)</p>}
                  {form.housingCouple > 0 && <p><strong>Hébergement couple:</strong> {form.housingCouple} lit(s)</p>}
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  Total: {calculatePrice()}€
                </div>
              </div>

              {/* Bouton d'inscription */}
              <button
                onClick={handleRegister}
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Inscription en cours...' : `Continuer vers le paiement (${calculatePrice()}€)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
