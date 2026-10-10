'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPendingInstallments, getInstallmentsByPlan } from '@/services/paymentPlanService';
import { PaymentInstallment } from '@/types';

export default function AdminPaymentPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      fetchPendingInstallments();
    }
  }, [authLoading, user, router]);

  const fetchPendingInstallments = async () => {
    try {
      const data = await getPendingInstallments();
      setInstallments(data);
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsReceived = async (installmentId: string) => {
    setConfirming(installmentId);
    try {
      await updateDoc(doc(db, 'paymentInstallments', installmentId), {
        status: 'received',
        receivedDate: new Date(),
        confirmedBy: user!.id,
        notes: notes[installmentId] || '',
        updatedAt: new Date(),
      });
      setInstallments(installments.filter((i) => i.id !== installmentId));
      alert('Paiement marqué comme reçu!');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la validation');
    } finally {
      setConfirming(null);
    }
  };

  const getMethodLabel = (method: 'cheque' | 'virement' | 'cheque_vacances'): string => {
    const labels: Record<'cheque' | 'virement' | 'cheque_vacances', string> = {
      cheque: '💳 Chèque',
      virement: '🏦 Virement',
      cheque_vacances: '🎟️ Chèques vacances',
    };
    return labels[method];
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;

  const groupedByPlan = installments.reduce(
    (acc, inst) => {
      if (!acc[inst.paymentPlanId]) {
        acc[inst.paymentPlanId] = [];
      }
      acc[inst.paymentPlanId].push(inst);
      return acc;
    },
    {} as { [key: string]: PaymentInstallment[] }
  );

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">💰 Plans de paiement</h1>
          <p className="text-gray-900 font-medium">
            {installments.length} paiement(s) en attente de validation
          </p>
        </div>
        <Link
          href="/dashboard"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
        >
          ← Accueil
        </Link>
      </div>

      {installments.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-gray-900">Aucun paiement en attente ✅</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByPlan).map(([planId, planInstallments]) => (
            <div key={planId} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setExpandedPlan(expandedPlan === planId ? null : planId)}
                className="w-full p-6 text-left font-semibold hover:bg-gray-50 flex justify-between items-center"
              >
                <span>Plan: {planId.substring(0, 8)}... ({planInstallments.length} paiements)</span>
                <span>{expandedPlan === planId ? '▼' : '▶'}</span>
              </button>

              {expandedPlan === planId && (
                <div className="border-t divide-y">
                  {planInstallments.map((inst) => (
                    <div key={inst.id} className="p-6 space-y-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{getMethodLabel(inst.method)}</h3>
                          <p className="text-sm text-gray-900 font-medium">
                            Échéance: {new Date(inst.dueDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-gold-deep">{inst.amount.toFixed(2)}€</span>
                      </div>

                      {/* Détails */}
                      <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                        {inst.method === 'cheque' && (
                          <>
                            {inst.chequeNumber && <p><strong>N° chèque:</strong> {inst.chequeNumber}</p>}
                            {inst.chequeBank && <p><strong>Banque:</strong> {inst.chequeBank}</p>}
                            {inst.chequeCity && <p><strong>Ville:</strong> {inst.chequeCity}</p>}
                            {inst.chequeName && <p><strong>Nom:</strong> {inst.chequeName}</p>}
                          </>
                        )}
                        {inst.method === 'cheque_vacances' && (
                          <p><strong>Nombre de chèques:</strong> {inst.chequeVacancesCount || 'N/A'}</p>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Notes (optionnel)</label>
                        <textarea
                          value={notes[inst.id] || ''}
                          onChange={(e) => setNotes({ ...notes, [inst.id]: e.target.value })}
                          placeholder="Notes internes..."
                          className="w-full border rounded px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>

                      {/* Boutons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => markAsReceived(inst.id)}
                          disabled={confirming === inst.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                        >
                          {confirming === inst.id ? 'Validation...' : '✅ Marquer reçu'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paramètres bancaires */}
      <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
        <h2 className="font-semibold text-ink mb-4">📋 Coordonnées bancaires Kdanse</h2>
        <p className="text-sm text-gold-deep">
          <Link href="/admin/bank-settings" className="underline font-semibold">
            Configurer les coordonnées bancaires →
          </Link>
        </p>
      </div>
    </div>
  );
}
