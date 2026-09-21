'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Membership {
  id: string;
  stageName: string;
  amount: number;
  status: string;
  pricingCategory: string;
}

type PaymentMethod = 'helloasso' | 'virement' | 'cheque';

export default function PaymentPage() {
  const params = useParams();
  const membershipId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('helloasso');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser && membershipId) {
      fetchMembership();
    }
  }, [firebaseUser, authLoading, membershipId, router]);

  const fetchMembership = async () => {
    try {
      const docRef = doc(db, 'memberships', membershipId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId !== firebaseUser!.uid) {
          router.push('/memberships');
          return;
        }

        setMembership({
          id: membershipId,
          stageName: data.stageName,
          amount: data.amount,
          status: data.status,
          pricingCategory: data.pricingCategory,
        });
      } else {
        router.push('/memberships');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!membership) return;

    setSubmitting(true);
    try {
      // Update membership status based on payment method
      const newStatus = method === 'helloasso' ? 'paid' : 'pending_confirmation';

      await updateDoc(doc(db, 'memberships', membershipId), {
        status: newStatus,
        paymentMethod: method,
        paymentDate: new Date(),
      });

      alert(`Paiement enregistré ! Méthode: ${method}`);
      router.push('/memberships');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !membership) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/memberships" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Retour aux inscriptions
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">Paiement</h1>

          {/* Résumé */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">Résumé de l'inscription</h2>
            <div className="space-y-2">
              <p><strong>Stage :</strong> {membership.stageName}</p>
              <p><strong>Catégorie :</strong> {membership.pricingCategory}</p>
              <p className="text-2xl font-bold text-blue-600">Total : {membership.amount}€</p>
            </div>
          </div>

          {/* Méthodes de paiement */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choisissez une méthode de paiement</h2>

            <div className="space-y-3">
              {/* HelloAsso */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  method === 'helloasso'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setMethod('helloasso')}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="helloasso"
                    checked={method === 'helloasso'}
                    onChange={() => setMethod('helloasso')}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold">HelloAsso</p>
                    <p className="text-sm text-gray-600">Paiement sécurisé en ligne (CB, Paypal, etc.)</p>
                  </div>
                </div>
              </div>

              {/* Virement */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  method === 'virement'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => setMethod('virement')}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="virement"
                    checked={method === 'virement'}
                    onChange={() => setMethod('virement')}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold">Virement bancaire</p>
                    <p className="text-sm text-gray-600">Vous recevrez les coordonnées bancaires</p>
                  </div>
                </div>
              </div>

              {/* Chèque */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  method === 'cheque'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setMethod('cheque')}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="cheque"
                    checked={method === 'cheque'}
                    onChange={() => setMethod('cheque')}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold">Chèque</p>
                    <p className="text-sm text-gray-600">À envoyer à Kdanse</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de paiement */}
          <button
            onClick={handleSubmitPayment}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Traitement...' : `Confirmer le paiement (${membership.amount}€)`}
          </button>

          {method === 'virement' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>Virement :</strong> Après confirmation, vous recevrez les coordonnées bancaires par email.
              </p>
            </div>
          )}

          {method === 'cheque' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>Chèque :</strong> Après confirmation, vous recevrez l'adresse d'envoi par email.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
