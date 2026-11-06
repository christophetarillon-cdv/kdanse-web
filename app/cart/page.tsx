'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { orderSummaryOfItem } from '@/services/cartService';
import MembershipOrderSummary from '@/components/MembershipOrderSummary';

export default function CartPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { cart, loading, removeFromCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pas besoin de redirection - permettre l'accès au panier sans connexion

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/stages" className="text-gold-deep hover:underline">
            ← Retour aux stages
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">🛒 Mon panier</h1>
          <p className="text-gray-700 font-medium">Vérifiez vos inscriptions avant paiement</p>
        </div>

        {/* Option de connexion si pas connecté */}
        {!firebaseUser && cart && (
          <div className="bg-gold-50 border-2 border-gold-200 rounded-lg p-6 mb-8">
            <p className="text-gray-900 font-medium mb-4">Vous avez déjà un compte?</p>
            <div className="flex gap-3">
              <Link
                href="/login?redirect=/cart"
                className="flex-1 text-center bg-ink hover:bg-ink-soft text-white py-3 rounded font-semibold transition"
              >
                Connectez-vous
              </Link>
              <p className="flex items-center text-gray-700 font-medium">ou continuez</p>
            </div>
          </div>
        )}

        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-900 font-medium mb-6">Votre panier est vide</p>
            <Link
              href="/stages"
              className="inline-block bg-ink text-white px-6 py-3 rounded-lg hover:bg-ink-soft"
            >
              Voir les stages disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Items */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Articles du panier ({cart.items.length})
                </h2>
              </div>

              <div className="divide-y">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{item.stageName}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gold-deep">{item.totals?.total || 0}€</p>
                      </div>
                    </div>

                    {/* Récapitulatif de commande */}
                    <div className="mb-4">
                      <MembershipOrderSummary order={orderSummaryOfItem(item)} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/stages/${item.stageId}?editItem=${item.id}`}
                        className="px-4 py-2 text-gold-deep border border-ink rounded hover:bg-gold-50 text-sm font-medium"
                      >
                        Modifier configuration
                      </Link>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 text-sm font-medium"
                      >
                        Supprimer du panier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals and CTA */}
            <div className="bg-gradient-to-r from-gold-50 to-orange-50 border-2 border-orange-300 rounded-lg p-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Total stages:</span>
                  <span className="font-medium">{cart.totals.stageTotal}€</span>
                </div>
                {cart.totals.housingTotal > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Total hébergement:</span>
                    <span className="font-medium">{cart.totals.housingTotal}€</span>
                  </div>
                )}
                {(cart.totals.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Réduction{cart.appliedCoupon ? ` (${cart.appliedCoupon})` : ''} :</span>
                    <span className="font-medium">-{cart.totals.discount}€</span>
                  </div>
                )}
                {cart.items.some((item) => item.insurance) && (
                  <div className="flex justify-between text-gray-700">
                    <span>Assurance annulation:</span>
                    <span className="font-medium">{cart.totals.insurance ? `${cart.totals.insurance}€` : 'pas souscrite'}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-orange-600 pt-3 border-t border-orange-200">
                  <span>Montant total:</span>
                  <span>{cart.totals.total}€</span>
                </div>
              </div>

              <Link
                href={`/cart/${cart.id}/summary`}
                className="w-full block text-center bg-ink text-white py-4 rounded-lg font-semibold hover:bg-ink-soft"
              >
                Continuer vers le paiement
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
