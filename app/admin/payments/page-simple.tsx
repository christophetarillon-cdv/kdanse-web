'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Membership } from '@/types';

export default function AdminPaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      fetchPendingPayments();
    }
  }, [authLoading, user, router]);

  const fetchPendingPayments = async () => {
    try {
      const q = query(
        collection(db, 'memberships'),
        where('status', '==', 'pending_confirmation')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      })) as Membership[];
      setMemberships(data);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (membershipId: string) => {
    setConfirming(membershipId);
    try {
      await updateDoc(doc(db, 'memberships', membershipId), {
        status: 'paid',
        updatedAt: new Date(),
      });
      setMemberships(memberships.filter((m) => m.id !== membershipId));
      alert('Paiement validé!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Erreur lors de la validation du paiement');
    } finally {
      setConfirming(null);
    }
  };

  const rejectPayment = async (membershipId: string) => {
    const reason = prompt('Raison du refus (optionnel):');
    setConfirming(membershipId);
    try {
      await updateDoc(doc(db, 'memberships', membershipId), {
        status: 'cancelled',
        rejectionReason: reason || '',
        updatedAt: new Date(),
      });
      setMemberships(memberships.filter((m) => m.id !== membershipId));
      alert('Paiement refusé');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Erreur lors du refus du paiement');
    } finally {
      setConfirming(null);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">💳 Paiements en attente</h1>
          <p className="text-gray-900 font-medium">
            {memberships.length} paiement(s) en attente de confirmation
          </p>
        </div>
        <Link
          href="/dashboard"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
        >
          ← Accueil
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="bg-gold-50 border border-gold-200 rounded-lg p-6 text-center">
          <p className="text-gray-900">Aucun paiement en attente ✅</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((membership) => (
            <div key={membership.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{membership.stageName}</h2>
                  <p className="text-sm text-gray-900 font-medium">ID: {membership.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-orange-600">{membership.amount}€</span>
                  <p className="text-sm text-gray-900 font-medium">
                    {membership.paymentMethod === 'cheque' && '💳 Chèque'}
                    {membership.paymentMethod === 'virement' && '🏦 Virement'}
                    {membership.paymentMethod === 'helloasso' && '📱 HelloAsso'}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Détails de l'inscription */}
                <div className="bg-gold-50 rounded border border-gold-200 p-4 space-y-2 text-sm">
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

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => confirmPayment(membership.id)}
                    disabled={confirming === membership.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                  >
                    {confirming === membership.id ? 'Validation...' : '✅ Valider'}
                  </button>
                  <button
                    onClick={() => rejectPayment(membership.id)}
                    disabled={confirming === membership.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                  >
                    {confirming === membership.id ? 'Refus...' : '❌ Refuser'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
