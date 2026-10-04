'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPaymentPlan } from '@/services/paymentPlanService';
import { PaymentPlan, PaymentInstallment, Membership } from '@/types';

export default function AdminPaymentPlansValidationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<(PaymentPlan & { membership?: Membership })[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editedInstallments, setEditedInstallments] = useState<{ [key: string]: PaymentInstallment[] }>({});

  useEffect(() => {
    if (!authLoading) {
      if (!user?.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      fetchPlans();
    }
  }, [authLoading, user, router]);

  const fetchPlans = async () => {
    try {
      const q = query(
        collection(db, 'memberships'),
        where('status', '==', 'pending_plan')
      );
      const snapshot = await getDocs(q);
      const plansData: (PaymentPlan & { membership?: Membership })[] = [];

      for (const doc of snapshot.docs) {
        const membership = { id: doc.id, ...doc.data() } as Membership;
        if (membership.paymentPlanId) {
          const plan = await getPaymentPlan(membership.paymentPlanId);
          if (plan) {
            plansData.push({ ...plan, membership });
          }
        }
      }

      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvePlan = async (planId: string) => {
    console.log('approvePlan called with planId:', planId);
    setValidating(planId);
    try {
      // Update membership status to paid
      const plan = plans.find(p => p.id === planId);
      console.log('Found plan:', plan?.id, 'membership:', plan?.membership?.id);

      if (plan?.membership) {
        console.log('Updating membership to paid');
        await updateDoc(doc(db, 'memberships', plan.membership.id), {
          status: 'paid',
          updatedAt: serverTimestamp(),
        });
      }

      // Update all installments in this plan
      const updatedInstallments = editedInstallments[planId] || plan?.installments || [];
      console.log('updatedInstallments count:', updatedInstallments.length);

      for (const inst of updatedInstallments) {
        let dueDateValue = inst.dueDate;
        if (!(inst.dueDate instanceof Date)) {
          dueDateValue = new Date(inst.dueDate);
        }

        if (isNaN(dueDateValue.getTime())) {
          throw new Error(`Date invalide pour le paiement: ${inst.dueDate}`);
        }

        // Build update object with clean values
        const updateData: any = {
          amount: inst.amount || 0,
          dueDate: dueDateValue,
          method: inst.method || 'cheque',
          status: inst.status || 'pending',
          updatedAt: serverTimestamp(),
        };

        // Add cheque fields only if non-empty
        if (inst.chequeNumber && inst.chequeNumber.trim()) {
          updateData.chequeNumber = inst.chequeNumber;
        }
        if (inst.chequeBank && inst.chequeBank.trim()) {
          updateData.chequeBank = inst.chequeBank;
        }
        if (inst.chequeCity && inst.chequeCity.trim()) {
          updateData.chequeCity = inst.chequeCity;
        }
        if (inst.chequeName && inst.chequeName.trim()) {
          updateData.chequeName = inst.chequeName;
        }
        if (typeof inst.chequeVacancesCount === 'number' && inst.chequeVacancesCount > 0) {
          updateData.chequeVacancesCount = inst.chequeVacancesCount;
        }
        if (Array.isArray(inst.chequeVacancesSerialNumbers) && inst.chequeVacancesSerialNumbers.length > 0) {
          updateData.chequeVacancesSerialNumbers = inst.chequeVacancesSerialNumbers;
        }

        console.log('Updating installment', inst.id, 'with data:', updateData);
        await updateDoc(doc(db, 'paymentInstallments', inst.id), updateData);
      }

      setPlans(plans.filter(p => p.id !== planId));
      alert('Plan validé et membership confirmée!');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la validation');
    } finally {
      setValidating(null);
      setEditingPlan(null);
    }
  };

  const rejectPlan = async (planId: string) => {
    if (!confirm('Rejeter ce plan de paiement?')) return;

    setValidating(planId);
    try {
      const plan = plans.find(p => p.id === planId);
      if (plan?.membership) {
        await updateDoc(doc(db, 'memberships', plan.membership.id), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      }

      setPlans(plans.filter(p => p.id !== planId));
      alert('Plan rejeté');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors du refus');
    } finally {
      setValidating(null);
    }
  };

  const updateInstallment = (planId: string, instId: string, updates: Partial<PaymentInstallment>) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setEditedInstallments(prev => {
      const planInstallments = prev[planId] || plan.installments;
      return {
        ...prev,
        [planId]: planInstallments.map(inst =>
          inst.id === instId ? { ...inst, ...updates } : inst
        ),
      };
    });
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">📋 Plans de paiement à valider</h1>
          <p className="text-gray-600">
            {plans.length} plan(s) en attente de validation
          </p>
        </div>
        <Link
          href="/admin/payment-plans"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
        >
          ← Paiements individuels
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-gray-700">Aucun plan en attente ✅</p>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {plan.membership?.stageName}
                    </h2>
                    <p className="text-sm text-gray-600">Plan ID: {plan.id.substring(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{plan.totalAmount.toFixed(2)}€</p>
                    <p className="text-sm text-gray-600">{plan.installmentCount} paiements</p>
                  </div>
                </div>
              </div>

              {/* Installments */}
              <div className="divide-y">
                {plan.installments.map((inst, idx) => (
                  <div key={inst.id} className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">Paiement {idx + 1}</h3>
                      <span className="text-2xl font-bold text-blue-600">
                        {inst.amount.toFixed(2)}€
                      </span>
                    </div>

                    {editingPlan === plan.id ? (
                      <div className="bg-gray-50 p-4 rounded space-y-3">
                        <input
                          type="number"
                          value={inst.amount}
                          onChange={(e) => updateInstallment(plan.id, inst.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="Montant"
                          step="0.01"
                        />
                        <input
                          type="date"
                          value={new Date(inst.dueDate).toISOString().split('T')[0]}
                          onChange={(e) => updateInstallment(plan.id, inst.id, { dueDate: new Date(e.target.value) })}
                          className="w-full border rounded px-3 py-2"
                        />
                        <select
                          value={inst.method}
                          onChange={(e) => updateInstallment(plan.id, inst.id, { method: e.target.value as any })}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="cheque">💳 Chèque</option>
                          <option value="virement">🏦 Virement</option>
                          <option value="cheque_vacances">🎟️ Chèques vacances</option>
                        </select>

                        {inst.method === 'cheque' && (
                          <>
                            <input
                              type="text"
                              value={inst.chequeNumber || ''}
                              onChange={(e) => updateInstallment(plan.id, inst.id, { chequeNumber: e.target.value })}
                              placeholder="N° chèque"
                              className="w-full border rounded px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              value={inst.chequeBank || ''}
                              onChange={(e) => updateInstallment(plan.id, inst.id, { chequeBank: e.target.value })}
                              placeholder="Banque"
                              className="w-full border rounded px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              value={inst.chequeCity || ''}
                              onChange={(e) => updateInstallment(plan.id, inst.id, { chequeCity: e.target.value })}
                              placeholder="Ville"
                              className="w-full border rounded px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              value={inst.chequeName || ''}
                              onChange={(e) => updateInstallment(plan.id, inst.id, { chequeName: e.target.value })}
                              placeholder="Nom (optionnel)"
                              className="w-full border rounded px-3 py-2 text-sm"
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                        <p><strong>Date:</strong> {new Date(inst.dueDate).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Mode:</strong> {inst.method === 'cheque' ? '💳 Chèque' : inst.method === 'virement' ? '🏦 Virement' : '🎟️ Chèques vacances'}</p>
                        {inst.chequeNumber && <p><strong>N° chèque:</strong> {inst.chequeNumber}</p>}
                        {inst.chequeBank && <p><strong>Banque:</strong> {inst.chequeBank}</p>}
                        {inst.chequeCity && <p><strong>Ville:</strong> {inst.chequeCity}</p>}
                        {inst.chequeName && <p><strong>Nom:</strong> {inst.chequeName}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-6 bg-gray-50 border-t flex gap-3">
                {editingPlan === plan.id ? (
                  <>
                    <button
                      onClick={() => approvePlan(plan.id)}
                      disabled={validating === plan.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-50"
                    >
                      {validating === plan.id ? 'Validation...' : '✅ Valider le plan'}
                    </button>
                    <button
                      onClick={() => setEditingPlan(null)}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingPlan(plan.id);
                        setEditedInstallments(prev => ({ ...prev, [plan.id]: plan.installments }));
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => approvePlan(plan.id)}
                      disabled={validating === plan.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-50"
                    >
                      {validating === plan.id ? 'Validation...' : '✅ Valider'}
                    </button>
                    <button
                      onClick={() => rejectPlan(plan.id)}
                      disabled={validating === plan.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold disabled:opacity-50"
                    >
                      ❌ Rejeter
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
