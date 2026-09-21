'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Membership {
  id: string;
  stageName: string;
  stageId: string;
  pricingCategory: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function MembershipsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

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
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        stageName: doc.data().stageName,
        stageId: doc.data().stageId,
        pricingCategory: doc.data().pricingCategory,
        amount: doc.data().amount,
        status: doc.data().status,
        createdAt: doc.data().createdAt?.toDate?.()?.toLocaleDateString('fr-FR') || new Date().toLocaleDateString('fr-FR'),
      })) as Membership[];
      setMemberships(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_payment: '⏳ En attente de paiement',
      paid: '✅ Payé',
      confirmed: '✅ Confirmé',
      cancelled: '❌ Annulé',
    };
    return labels[status] || status;
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_payment: 'bg-yellow-50 border-yellow-200',
      paid: 'bg-green-50 border-green-200',
      confirmed: 'bg-green-50 border-green-200',
      cancelled: 'bg-red-50 border-red-200',
    };
    return colors[status] || 'bg-gray-50 border-gray-200';
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Retour au dashboard
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">Mes inscriptions</h1>
          <p className="text-gray-600">Gérez vos inscriptions aux stages</p>
        </div>

        {memberships.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-6">Vous n'avez pas d'inscriptions pour le moment</p>
            <Link
              href="/stages"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Voir les stages disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {memberships.map(membership => (
              <div
                key={membership.id}
                className={`border-l-4 rounded-lg p-6 ${statusColor(membership.status)}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{membership.stageName}</h3>
                    <p className="text-sm text-gray-600">ID: {membership.id.substring(0, 8)}</p>
                  </div>
                  <span className="text-sm font-semibold px-3 py-1 bg-white rounded">
                    {statusLabel(membership.status)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Catégorie</p>
                    <p className="font-semibold capitalize">
                      {membership.pricingCategory === 'withHousing'
                        ? 'Avec logement'
                        : membership.pricingCategory}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Montant</p>
                    <p className="text-2xl font-bold text-blue-600">{membership.amount}€</p>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Inscrit le {membership.createdAt}
                </p>

                {membership.status === 'pending_payment' && (
                  <div className="mt-4 pt-4 border-t">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Procéder au paiement
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
