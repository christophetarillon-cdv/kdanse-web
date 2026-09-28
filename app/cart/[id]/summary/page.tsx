'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getCart, submitCart } from '@/services/cartService';
import { Cart } from '@/types/cart';

export default function CartSummaryPage() {
  const params = useParams();
  const cartId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      if (!cartData) {
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

  const handleContinueToPayment = async () => {
    if (!cart) return;

    setSubmitting(true);
    try {
      // Mark cart as submitted
      await submitCart(cart.id);
      // Redirect to payment page
      router.push(`/cart/${cart.id}/pay`);
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la validation du panier');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !cart) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/cart" className="text-blue-600 hover:underline">
            ← Retour au panier
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">📋 Résumé de votre commande</h1>
          <p className="text-gray-600">Vérifiez tous les détails avant de payer</p>
        </div>

        <div className="space-y-6">
          {/* Items recap */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Inscriptions</h2>
            </div>

            <div className="divide-y">
              {cart.items.map((item) => (
                <div key={item.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{item.stageName}</h3>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{item.totals?.total}€</span>
                  </div>

                  <div className="bg-blue-50 rounded p-4 space-y-2 text-sm">
                    <p>
                      <strong>Danseurs:</strong> {item.configuration.danceType === 'solo' ? '1 danseur' : '2 danseurs'}
                      {item.configuration.dancers.some((d) => d.licensed) && ' (licencié FFDanse)'}
                    </p>
                    {item.configuration.accompanists > 0 && (
                      <p>
                        <strong>Accompagnateurs:</strong> {item.configuration.accompanists}
                      </p>
                    )}
                    {item.configuration.wantHousing && (
                      <p>
                        <strong>Hébergement:</strong>
                        {item.configuration.housingSolo > 0 && ` ${item.configuration.housingSolo} solo`}
                        {item.configuration.housingSolo > 0 && item.configuration.housingCouple > 0 && ' +'}
                        {item.configuration.housingCouple > 0 && ` ${item.configuration.housingCouple} couple`}
                      </p>
                    )}
                    {!item.configuration.wantHousing && <p><strong>Hébergement:</strong> Aucun</p>}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Stage:</span>
                      <span className="font-medium">{item.totals?.stageTotal}€</span>
                    </div>
                    {item.totals?.housingTotal ? (
                      <div className="flex justify-between">
                        <span>Hébergement:</span>
                        <span className="font-medium">{item.totals.housingTotal}€</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Sous-total:</span>
                      <span>{item.totals?.total}€</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-6">
            <div className="space-y-3 mb-6">
              <div className="text-lg">
                <div className="flex justify-between text-gray-700 mb-2">
                  <span>Total stages:</span>
                  <span className="font-medium">{cart.totals.stageTotal}€</span>
                </div>
                {cart.totals.housingTotal > 0 && (
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Total hébergement:</span>
                    <span className="font-medium">{cart.totals.housingTotal}€</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-2xl font-bold text-orange-600 pt-4 border-t border-orange-300">
                <span>Montant à payer:</span>
                <span>{cart.totals.total}€</span>
              </div>
            </div>

            <button
              onClick={handleContinueToPayment}
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Validation en cours...' : 'Continuer vers le paiement'}
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="mb-2">
              <strong>ℹ️ Important :</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vérifiez vos informations avant de continuer</li>
              <li>Vous pourrez modifier votre configuration de paiement à l'étape suivante</li>
              <li>Les places d'hébergement sont réservées après paiement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
