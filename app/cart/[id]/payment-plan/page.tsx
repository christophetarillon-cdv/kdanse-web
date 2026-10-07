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

interface Stats {
  total: number;
  allocated: number;
  remaining: number;
  isComplete: boolean;
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
  const [installmentCount, setInstallmentCount] = useState<2 | 3 | 4>(3);
  const [installments, setInstallments] = useState<InstallmentConfig[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const calculateHotelBudget = () => {
    if (!cart?.items || cart.items.length === 0) return 0;

    let totalHousing = 0;
    cart.items.forEach((item) => {
      if (item.configuration.wantHousing) {
        totalHousing +=
          (item.configuration.housingSolo || 0) * (item.housingPrices?.solo || 0) +
          (item.configuration.housingCouple || 0) * (item.housingPrices?.couple || 0);
      }
    });
    return totalHousing;
  };

  const hotelBudget = calculateHotelBudget();
  const vacationChecksTotal = installments
    .filter(i => i.method === 'cheque_vacances')
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const isVacationChecksValid = vacationChecksTotal <= hotelBudget;

  const stats: Stats = {
    total: cart?.totals.total || 0,
    allocated: installments.reduce((sum, i) => sum + (i.amount || 0), 0),
    remaining: (cart?.totals.total || 0) - installments.reduce((sum, i) => sum + (i.amount || 0), 0),
    isComplete: installments.reduce((sum, i) => sum + (i.amount || 0), 0) === (cart?.totals.total || 0) && installments.every(i => i.method),
  };

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

      // Initialize installments with empty amounts
      const defaultInstallments: InstallmentConfig[] = Array.from({ length: 3 }, (_, i) => ({
        id: `inst-${i}`,
        method: 'cheque',
        amount: 0,
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

  const updateInstallmentCount = (count: 2 | 3 | 4) => {
    setInstallmentCount(count);
    const newInstallments: InstallmentConfig[] = Array.from({ length: count }, (_, i) => ({
      id: `inst-${i}`,
      method: installments[i]?.method || 'cheque',
      amount: 0,
      dueDate: installments[i]?.dueDate || new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }));
    setInstallments(newInstallments);
  };

  const updateInstallment = (id: string, updates: Partial<InstallmentConfig>) => {
    setInstallments(
      installments.map((inst) => (inst.id === id ? { ...inst, ...updates } : inst))
    );
  };

  const getMaxForInstallment = (index: number) => {
    const currentAmount = installments[index]?.amount || 0;
    const otherVacationChecks = installments
      .filter((_, idx) => idx !== index && _.method === 'cheque_vacances')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    return hotelBudget - otherVacationChecks;
  };

  const handleSubmit = async () => {
    if (!cart || !firebaseUser) return;
    if (!isVacationChecksValid) {
      alert(`Chèques vacances (${vacationChecksTotal.toFixed(2)}€) ne peuvent pas dépasser l'hébergement (${hotelBudget.toFixed(2)}€)`);
      return;
    }

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

      const result = await createPaymentPlan(
        cart.id,
        firebaseUser.uid,
        cart.totals.total,
        installmentCount,
        plansData,
        cart
      );

      alert('Plan de paiement créé! Vous serez redirigé vers la sélection des cours.');

      // Redirect to course selection for first membership
      if (result.membershipIds && result.membershipIds.length > 0) {
        router.push(`/memberships/${result.membershipIds[0]}/courses`);
      } else {
        router.push('/memberships');
      }
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
            <p className="text-gray-700 font-medium">Configurez vos échéances de paiement</p>
          </div>

          {/* Résumé */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Montant total à payer</h2>
            <div className="text-3xl font-bold text-blue-600 mb-4">{cart.totals.total}€</div>

            {/* Nombre d'échéances */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">Nombre d'échéances</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => updateInstallmentCount(2)}
                  className={`flex-1 min-w-[120px] py-2 rounded font-semibold transition ${
                    installmentCount === 2
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  2 paiements
                </button>
                <button
                  onClick={() => updateInstallmentCount(3)}
                  className={`flex-1 min-w-[120px] py-2 rounded font-semibold transition ${
                    installmentCount === 3
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  3 paiements
                </button>
                <button
                  onClick={() => updateInstallmentCount(4)}
                  className={`flex-1 min-w-[120px] py-2 rounded font-semibold transition ${
                    installmentCount === 4
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  4 paiements
                </button>
              </div>
            </div>

            {/* Montants */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-700 font-medium">Total</p>
                  <p className="text-xl font-bold text-blue-600">{stats.total.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Alloué</p>
                  <p className="text-xl font-bold text-green-600">{stats.allocated.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Restant</p>
                  <p className={`text-xl font-bold ${stats.remaining === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {stats.remaining.toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Échéances */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Détails des paiements</h2>

            {installments.map((inst, idx) => (
              <div key={inst.id} className={`border-2 rounded-lg p-6 space-y-4 ${
                inst.amount > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">Paiement {idx + 1}</h3>
                  <span className={`text-2xl font-bold ${inst.amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {inst.amount.toFixed(2)}€
                  </span>
                </div>

                {/* Montant */}
                <div>
                  <label className="block text-sm font-medium mb-2">Montant à payer</label>
                  <input
                    type="number"
                    value={inst.amount || ''}
                    onChange={(e) => updateInstallment(inst.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                    max={inst.method === 'cheque_vacances' ? getMaxForInstallment(idx) : stats.total}
                  />
                  {inst.amount > 0 && (
                    <p className="text-xs text-gray-900 font-medium mt-1">
                      {((inst.amount / stats.total) * 100).toFixed(0)}% du total
                    </p>
                  )}
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

                  {/* Hint pour chèques vacances */}
                  {inst.method === 'cheque_vacances' && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Max:</strong> {getMaxForInstallment(idx).toFixed(2)}€ (hébergement)
                    </p>
                  )}

                  {/* Warning si dépassement */}
                  {inst.method === 'cheque_vacances' && inst.amount > getMaxForInstallment(idx) && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mt-2">
                      Dépasse de {(inst.amount - getMaxForInstallment(idx)).toFixed(2)}€
                    </div>
                  )}
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
                    <p className="text-gray-900 font-medium mt-3">Référence: {cart.id.substring(0, 8)}</p>
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
                    <p className="text-sm text-gray-700 font-medium">
                      💡 Vous pouvez combiner les chèques vacances avec d'autres modes de paiement
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Avertissement montants */}
          {!stats.isComplete && stats.allocated > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900">
                <strong>⚠️ Montants incomplets:</strong> Vous avez alloué {stats.allocated.toFixed(2)}€ sur {stats.total.toFixed(2)}€.
                Il reste {stats.remaining.toFixed(2)}€ à répartir.
              </p>
            </div>
          )}

          {stats.allocated === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Conseil:</strong> Entrez les montants pour chaque paiement. Le total doit correspondre exactement à {stats.total.toFixed(2)}€.
              </p>
            </div>
          )}

          {/* Avertissement chèques vacances */}
          {!isVacationChecksValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                <strong>⚠️ Chèques vacances trop élevés:</strong> Chèques vacances ({vacationChecksTotal.toFixed(2)}€) ne peuvent pas dépasser l'hébergement ({hotelBudget.toFixed(2)}€).
              </p>
            </div>
          )}

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
              disabled={submitting || !acceptedTerms || !stats.isComplete || !isVacationChecksValid}
              className="flex-1 bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Création en cours...' : (
                !isVacationChecksValid
                  ? `Chèques vacances invalides`
                  : !stats.isComplete
                  ? `Montants incomplets (${stats.allocated.toFixed(2)}€ / ${stats.total.toFixed(2)}€)`
                  : 'Créer le plan de paiement'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
