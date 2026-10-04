'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { updateCartItem } from '@/services/cartService';
import { CartItem } from '@/types/cart';

export default function CartPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { cart, loading, removeFromCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }
  }, [firebaseUser, authLoading, router]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/stages" className="text-blue-600 hover:underline">
            ← Retour aux stages
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">🛒 Mon panier</h1>
          <p className="text-gray-600">Vérifiez vos inscriptions avant paiement</p>
        </div>

        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-6">Votre panier est vide</p>
            <Link
              href="/stages"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
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
                        <p className="text-sm text-gray-500">ID article: {item.id.substring(0, 8)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{item.totals?.total || 0}€</p>
                      </div>
                    </div>

                    {/* Configuration summary (collapsible) */}
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded border mb-4 flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-700">
                        📋 {item.configuration.danceType === 'solo' ? '1 danseur' : '2 danseurs'}
                        {item.configuration.accompanists > 0 && ` + ${item.configuration.accompanists} acc.`}
                        {item.configuration.wantHousing && ' + logement'}
                      </span>
                      <span className="text-gray-500">
                        {expandedItems.has(item.id) ? '▼' : '▶'}
                      </span>
                    </button>

                    {/* Expanded details */}
                    {expandedItems.has(item.id) && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 space-y-2 text-sm">
                        <p>
                          <strong>Danseurs:</strong> {item.configuration.danceType === 'solo' ? '1' : '2'}
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
                      </div>
                    )}

                    {/* Price breakdown */}
                    <div className="bg-gray-50 rounded p-3 mb-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Stage:</span>
                        <span className="font-medium">{item.totals?.stageTotal || 0}€</span>
                      </div>
                      {item.totals?.housingTotal ? (
                        <div className="flex justify-between">
                          <span>Hébergement:</span>
                          <span className="font-medium">{item.totals.housingTotal}€</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total:</span>
                        <span>{item.totals?.total || 0}€</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/stages/${item.stageId}`}
                        className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 text-sm font-medium"
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
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-6">
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
                <div className="flex justify-between text-lg font-bold text-orange-600 pt-3 border-t border-orange-200">
                  <span>Montant total:</span>
                  <span>{cart.totals.total}€</span>
                </div>
              </div>

              <Link
                href={`/cart/${cart.id}/summary`}
                className="w-full block text-center bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700"
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
