'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { getCart, clearCart } from '@/services/cartService';
import { Cart } from '@/types/cart';

type PaymentMethod = 'helloasso' | 'virement' | 'cheque';

export default function CartPaymentPage() {
  const params = useParams();
  const cartId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('helloasso');

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser && cartId) {
      fetchCart();
    }
  }, [firebaseUser, authLoading, cartId, router]);

  const fetchCart = async () => {
    try {
      const cartData = await getCart(cartId);
      if (!cartData || cartData.status !== 'submitted') {
        router.push('/cart');
        return;
      }
      // Verify ownership
      if (cartData.userId !== firebaseUser!.uid) {
        router.push('/cart');
        return;
      }
      setCart(cartData);
    } catch (error) {
      console.error('Error fetching cart:', error);
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!cart || !firebaseUser) return;

    setSubmitting(true);
    try {
      // Create memberships from cart items
      const membershipPromises = cart.items.map((item) =>
        addDoc(collection(db, 'memberships'), {
          userId: firebaseUser.uid,
          stageId: item.stageId,
          stageName: item.stageName,
          registrationDetails: item.configuration,
          amount: item.totals?.total || 0,
          paymentMethod: method,
          status: method === 'helloasso' ? 'paid' : 'pending_confirmation',
          cartId: cart.id,
          createdAt: new Date(),
        })
      );

      await Promise.all(membershipPromises);

      // Clear cart
      await clearCart(cart.id);

      // Show success message
      alert('Paiement enregistré ! Vous serez redirigé vers vos inscriptions.');
      router.push('/memberships');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors du traitement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !cart) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href={`/cart/${cart.id}/summary`} className="text-blue-600 hover:underline mb-6 inline-block">
          ← Retour au résumé
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">💳 Paiement</h1>

          {/* Résumé rapide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">Résumé de votre commande</h2>
            <div className="space-y-2 mb-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.stageName}</span>
                  <span className="font-medium">{item.totals?.total}€</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xl font-bold text-blue-600 pt-4 border-t border-blue-200">
              <span>Total:</span>
              <span>{cart.totals.total}€</span>
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
                    <p className="text-sm text-gray-600">Paiement sécurisé en ligne (CB, PayPal, etc.)</p>
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

          {/* Bouton paiement */}
          <button
            onClick={handleSubmitPayment}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
          >
            {submitting ? 'Traitement en cours...' : `Confirmer le paiement (${cart.totals.total}€)`}
          </button>

          {/* Instructions */}
          {method === 'virement' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>Virement bancaire :</strong> Après confirmation, vous recevrez les coordonnées bancaires par email.
                Votre inscription sera confirmée une fois le virement reçu.
              </p>
            </div>
          )}

          {method === 'cheque' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>Chèque :</strong> Après confirmation, vous recevrez l'adresse d'envoi par email.
                Votre inscription sera confirmée une fois le chèque reçu.
              </p>
            </div>
          )}

          {method === 'helloasso' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>HelloAsso :</strong> Vous serez redirigé vers le paiement sécurisé HelloAsso.
                Votre inscription sera confirmée immédiatement après le paiement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
