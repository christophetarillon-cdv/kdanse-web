'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Membership } from '@/types';

export default function MembershipsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
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
        <p className="text-gray-600">Consultez vos inscriptions à nos stages</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          <p className="text-sm text-gray-600">Validées</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          <p className="text-sm text-gray-600">En attente</p>
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
                  <p className="text-sm text-gray-600">
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
                <div className="bg-blue-50 rounded p-4 space-y-2 text-sm">
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

                {membership.status === 'pending_plan' && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
                    <p className="mb-2">
                      <strong>📋 Plan de paiement en cours</strong>
                    </p>
                    <p className="text-blue-900">
                      Vous avez mis en place un plan de paiement. Veuillez respecter les dates d'échéance et envoyer les paiements selon les modalités convenues. Votre inscription sera confirmée après validation du dernier paiement par l'administrateur.
                    </p>
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
