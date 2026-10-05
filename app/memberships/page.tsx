'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Membership, PaymentPlan } from '@/types';
import { getPaymentPlan } from '@/services/paymentPlanService';

export default function MembershipsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<{ [key: string]: PaymentPlan }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser) {
      fetchMemberships();
    }
  }, [firebaseUser, authLoading, router]);

  const fetchMemberships = async () => {
    try {
      const q = query(
        collection(db, 'memberships'),
        where('userId', '==', firebaseUser!.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      })) as Membership[];

      // Fetch payment plans for memberships with pending_plan status
      const plansMap: { [key: string]: PaymentPlan } = {};
      for (const membership of data) {
        if (membership.paymentPlanId) {
          try {
            const plan = await getPaymentPlan(membership.paymentPlanId);
            if (plan) {
              plansMap[membership.paymentPlanId] = plan;
            }
          } catch (error) {
            console.error('Error fetching payment plan:', error);
          }
        }
      }
      setPaymentPlans(plansMap);

      setMemberships(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = memberships.filter((m) => {
    if (filter === 'paid') return m.status === 'paid';
    if (filter === 'pending') return m.status === 'pending_confirmation';
    return true;
  });

  const stats = {
    total: memberships.length,
    paid: memberships.filter((m) => m.status === 'paid').length,
    pending: memberships.filter((m) => m.status === 'pending_confirmation').length,
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div>
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour au dashboard
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold mt-4 mb-2">📋 Mes inscriptions</h1>
        <p className="text-gray-700 font-medium">Consultez vos inscriptions à nos stages</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-700 font-medium">Total</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          <p className="text-sm text-gray-700 font-medium">Validées</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          <p className="text-sm text-gray-700 font-medium">En attente</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'paid'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ✅ Validées
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'pending'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ⏳ En attente
        </button>
      </div>

      {/* Liste des inscriptions */}
      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-700 mb-4">
            {stats.total === 0
              ? 'Vous n\'avez pas encore d\'inscriptions'
              : 'Aucune inscription ne correspond à ce filtre'}
          </p>
          {stats.total === 0 && (
            <Link href="/stages" className="text-blue-600 hover:underline font-semibold">
              Découvrir les stages →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((membership) => (
            <div key={membership.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 sm:p-6 border-b bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{membership.stageName}</h2>
                  <p className="text-sm text-gray-700 font-medium">
                    {membership.createdAt.toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">{membership.amount}€</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      membership.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : membership.status === 'pending_confirmation'
                        ? 'bg-orange-100 text-orange-800'
                        : membership.status === 'pending_plan'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {membership.status === 'paid' && '✅ Validée'}
                    {membership.status === 'pending_confirmation' && '⏳ En attente'}
                    {membership.status === 'pending_plan' && '📋 Plan de paiement'}
                    {membership.status === 'cancelled' && '❌ Annulée'}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Détails */}
                <div className="bg-blue-50 rounded border border-blue-200 p-4 space-y-2 text-sm">
                  <p>
                    <strong>Danseurs:</strong> {membership.registrationDetails.danceType === 'solo' ? '1 danseur' : '2 danseurs'}
                    {membership.registrationDetails.dancers.some((d) => d.licensed) && ' (licencié FFDanse)'}
                  </p>
                  {membership.registrationDetails.accompanists > 0 && (
                    <p>
                      <strong>Accompagnateurs:</strong> {membership.registrationDetails.accompanists}
                    </p>
                  )}
                  {membership.registrationDetails.wantHousing && (
                    <p>
                      <strong>Hébergement:</strong>
                      {membership.registrationDetails.housingSolo > 0 && ` ${membership.registrationDetails.housingSolo} solo`}
                      {membership.registrationDetails.housingSolo > 0 && membership.registrationDetails.housingCouple > 0 && ' +'}
                      {membership.registrationDetails.housingCouple > 0 && ` ${membership.registrationDetails.housingCouple} couple`}
                    </p>
                  )}
                </div>

                {/* Mode de paiement et statut */}
                {membership.status === 'pending_confirmation' && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-4 text-sm">
                    <p className="mb-2">
                      <strong>Mode de paiement:</strong>{' '}
                      {membership.paymentMethod === 'cheque' && '💳 Chèque'}
                      {membership.paymentMethod === 'virement' && '🏦 Virement'}
                      {membership.paymentMethod === 'helloasso' && '📱 HelloAsso'}
                    </p>
                    <p className="text-orange-900">
                      Votre inscription est en attente de validation par l'administrateur. Vous serez informé dès que celle-ci sera confirmée.
                    </p>
                  </div>
                )}

                {membership.status === 'paid' && membership.paymentPlanId && paymentPlans[membership.paymentPlanId] && (
                  <div className="bg-green-50 border border-green-200 rounded p-4 space-y-4">
                    <div>
                      <p className="font-semibold text-green-900 mb-2">📋 Plan de paiement validé</p>
                    </div>

                    {/* Installments */}
                    <div className="space-y-3">
                      {paymentPlans[membership.paymentPlanId].installments.map((inst, idx) => (
                        <div key={inst.id} className="bg-white p-3 rounded border border-green-100 text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">Paiement {idx + 1}</span>
                            <span className="text-lg font-bold text-green-600">{inst.amount.toFixed(2)}€</span>
                          </div>
                          <div className="space-y-1 text-gray-700">
                            <p><strong>Date:</strong> {new Date(inst.dueDate).toLocaleDateString('fr-FR')}</p>
                            <p>
                              <strong>Mode:</strong> {inst.method === 'cheque' ? '💳 Chèque' : inst.method === 'virement' ? '🏦 Virement' : '🎟️ Chèques vacances'}
                            </p>
                            <p>
                              <strong>Statut:</strong>{' '}
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                inst.status === 'received' ? 'bg-green-100 text-green-800' :
                                inst.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {inst.status === 'received' && '✅ Encaissé'}
                                {inst.status === 'pending' && '⏳ En attente'}
                                {inst.status === 'cancelled' && '❌ Annulé'}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {membership.status === 'pending_plan' && membership.paymentPlanId && paymentPlans[membership.paymentPlanId] && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-4">
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">📋 Plan de paiement</p>
                      <p className="text-sm text-blue-900 mb-3">
                        Veuillez respecter les dates d'échéance et envoyer les paiements selon les modalités convenues.
                      </p>
                    </div>

                    {/* Installments */}
                    <div className="space-y-3">
                      {paymentPlans[membership.paymentPlanId].installments.map((inst, idx) => (
                        <div key={inst.id} className="bg-white p-3 rounded border border-blue-100 text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">Paiement {idx + 1}</span>
                            <span className="text-lg font-bold text-blue-600">{inst.amount.toFixed(2)}€</span>
                          </div>
                          <div className="space-y-1 text-gray-700">
                            <p><strong>Date:</strong> {new Date(inst.dueDate).toLocaleDateString('fr-FR')}</p>
                            <p>
                              <strong>Mode:</strong> {inst.method === 'cheque' ? '💳 Chèque' : inst.method === 'virement' ? '🏦 Virement' : '🎟️ Chèques vacances'}
                            </p>
                            <p>
                              <strong>Statut:</strong>{' '}
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                inst.status === 'received' ? 'bg-green-100 text-green-800' :
                                inst.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {inst.status === 'received' && '✅ Encaissé'}
                                {inst.status === 'pending' && '⏳ En attente'}
                                {inst.status === 'cancelled' && '❌ Annulé'}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
