'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getCart } from '@/services/cartService';
import { getPaymentSettings, createPaymentPlan } from '@/services/paymentPlanService';
import { Cart, PaymentSettings } from '@/types';

type InstallmentMethod = 'cheque' | 'virement' | 'cheque_vacances';

interface InstallmentConfig {
  id: string;
  method: InstallmentMethod;
  amount: number;
  dueDate: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeCity?: string;
  chequeName?: string;
  chequeVacancesCount?: number;
}

export default function PaymentPlanPage() {
  const params = useParams();
  const cartId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<3 | 4>(3);
  const [installments, setInstallments] = useState<InstallmentConfig[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser && cartId) {
      fetchData();
    }
  }, [firebaseUser, authLoading, cartId, router]);

  const fetchData = async () => {
    try {
      const cartData = await getCart(cartId);
      if (!cartData || cartData.userId !== firebaseUser!.uid) {
        router.push('/cart');
        return;
      }
      const settingsData = await getPaymentSettings();
      setCart(cartData);
      setSettings(settingsData);

      // Initialize installments
      const amountPerInstallment = cartData.totals.total / 3;
      const defaultInstallments: InstallmentConfig[] = Array.from({ length: 3 }, (_, i) => ({
        id: `inst-${i}`,
        method: 'cheque',
        amount: amountPerInstallment,
        dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      setInstallments(defaultInstallments);
    } catch (error) {
      console.error('Error:', error);
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  };

  const updateInstallmentCount = (count: 3 | 4) => {
    setInstallmentCount(count);
    const amountPerInstallment = (cart?.totals.total || 0) / count;
    const newInstallments: InstallmentConfig[] = Array.from({ length: count }, (_, i) => ({
      id: `inst-${i}`,
      method: installments[i]?.method || 'cheque',
      amount: amountPerInstallment,
      dueDate: installments[i]?.dueDate || new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }));
    setInstallments(newInstallments);
  };

  const updateInstallment = (id: string, updates: Partial<InstallmentConfig>) => {
    setInstallments(
      installments.map((inst) => (inst.id === id ? { ...inst, ...updates } : inst))
    );
  };

  const handleSubmit = async () => {
    if (!cart || !firebaseUser) return;

    setSubmitting(true);
    try {
      const plansData = installments.map(({ id, ...rest }) => ({
        method: rest.method as 'cheque' | 'virement' | 'cheque_vacances',
        amount: rest.amount,
        dueDate: rest.dueDate,
        chequeNumber: rest.chequeNumber,
        chequeBank: rest.chequeBank,
        chequeCity: rest.chequeCity,
        chequeName: rest.chequeName,
        chequeVacancesCount: rest.chequeVacancesCount,
      }));

      await createPaymentPlan(
        cart.id,
        firebaseUser.uid,
        cart.totals.total,
        installmentCount,
        plansData
      );

      alert('Plan de paiement créé! Vous recevrez un email de confirmation.');
      router.push('/memberships');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la création du plan de paiement');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser || !cart) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href={`/cart/${cart.id}/pay`} className="text-blue-600 hover:underline mb-6 inline-block">
          ← Retour au paiement
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">📋 Plan de paiement</h1>
            <p className="text-gray-600">Configurez vos échéances de paiement</p>
          </div>

          {/* Résumé */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Montant total à payer</h2>
            <div className="text-3xl font-bold text-blue-600 mb-4">{cart.totals.total}€</div>

            {/* Nombre d'échéances */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">Nombre d'échéances</label>
              <div className="flex gap-3">
                <button
                  onClick={() => updateInstallmentCount(3)}
                  className={`flex-1 py-2 rounded font-semibold transition ${
                    installmentCount === 3
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  3 paiements
                </button>
                <button
                  onClick={() => updateInstallmentCount(4)}
                  className={`flex-1 py-2 rounded font-semibold transition ${
                    installmentCount === 4
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  4 paiements
                </button>
              </div>
            </div>
          </div>

          {/* Échéances */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Détails des paiements</h2>

            {installments.map((inst, idx) => (
              <div key={inst.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">Paiement {idx + 1}</h3>
                  <span className="text-2xl font-bold text-blue-600">{inst.amount.toFixed(2)}€</span>
                </div>

                {/* Date d'échéance */}
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'échéance</label>
                  <input
                    type="date"
                    value={inst.dueDate}
                    onChange={(e) => updateInstallment(inst.id, { dueDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                {/* Mode de paiement */}
                <div>
                  <label className="block text-sm font-medium mb-2">Mode de paiement</label>
                  <select
                    value={inst.method}
                    onChange={(e) =>
                      updateInstallment(inst.id, { method: e.target.value as InstallmentMethod })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="cheque">💳 Chèque</option>
                    <option value="virement">🏦 Virement</option>
                    <option value="cheque_vacances">🎟️ Chèques vacances</option>
                  </select>
                </div>

                {/* Détails selon le mode */}
                {inst.method === 'cheque' && (
                  <div className="space-y-3 bg-blue-50 p-4 rounded">
                    <input
                      type="text"
                      placeholder="Numéro du chèque"
                      value={inst.chequeNumber || ''}
                      onChange={(e) => updateInstallment(inst.id, { chequeNumber: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Banque (ex: BNP Paribas)"
                      value={inst.chequeBank || ''}
                      onChange={(e) => updateInstallment(inst.id, { chequeBank: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Ville"
                      value={inst.chequeCity || ''}
                      onChange={(e) => updateInstallment(inst.id, { chequeCity: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Nom sur le chèque (si différent)"
                      value={inst.chequeName || ''}
                      onChange={(e) => updateInstallment(inst.id, { chequeName: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {inst.method === 'virement' && settings?.bankAccount && (
                  <div className="bg-green-50 p-4 rounded text-sm space-y-2">
                    <p><strong>IBAN:</strong> {settings.bankAccount.iban}</p>
                    <p><strong>BIC:</strong> {settings.bankAccount.bic}</p>
                    <p><strong>Titulaire:</strong> {settings.bankAccount.accountName}</p>
                    <p className="text-gray-600 mt-3">Référence: {cart.id.substring(0, 8)}</p>
                  </div>
                )}

                {inst.method === 'cheque_vacances' && (
                  <div className="bg-yellow-50 p-4 rounded space-y-3">
                    <input
                      type="number"
                      placeholder="Nombre de chèques vacances"
                      value={inst.chequeVacancesCount || ''}
                      onChange={(e) =>
                        updateInstallment(inst.id, { chequeVacancesCount: parseInt(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min="1"
                    />
                    <p className="text-sm text-gray-600">
                      💡 Vous pouvez combiner les chèques vacances avec d'autres modes de paiement
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Conditions */}
          <div className="border-t pt-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 mt-1"
              />
              <span className="text-sm text-gray-700">
                J'accepte les conditions du plan de paiement. Je m'engage à envoyer les paiements aux dates prévues à l'adresse indiquée.
              </span>
            </label>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || !acceptedTerms}
              className="flex-1 bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Création en cours...' : 'Créer le plan de paiement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
