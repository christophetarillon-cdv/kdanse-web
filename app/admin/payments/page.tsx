'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Membership, PaymentDetailsDraft, PaymentInstallment } from '@/types';
import {
  getPendingInstallments,
  getPaymentPlanWithMembership,
  updateInstallmentDetails,
} from '@/services/paymentPlanService';
import PaymentDetailsForm from '@/components/admin/PaymentDetailsForm';
import { draftFromInstallment, draftFromMembership, toPaymentDetailsUpdate } from '@/lib/paymentDetails';

const INSTALLMENT_METHODS: { value: PaymentDetailsDraft['method']; label: string }[] = [
  { value: 'cheque', label: '💳 Chèque' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'cheque_vacances', label: '🎟️ Chèques vacances' },
];

const SIMPLE_METHODS: { value: PaymentDetailsDraft['method']; label: string }[] = [
  { value: 'cheque', label: '💳 Chèque' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'helloasso', label: '📱 HelloAsso' },
];

export default function AdminPaymentsConsolidatedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Simple payments (memberships)
  const [memberships, setMemberships] = useState<Membership[]>([]);

  // Plan installments
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);

  // Plan info for display (planId -> membership)
  const [planMemberships, setPlanMemberships] = useState<{ [key: string]: Membership }>({});

  // Plan totals vs. sum of all its installments (received ones included)
  const [planTotals, setPlanTotals] = useState<{ [key: string]: { total: number; sum: number } }>({});

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [tab, setTab] = useState<'installments' | 'simple'>('installments');
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<{
    id: string;
    planId: string;
    draft: PaymentDetailsDraft;
  } | null>(null);
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [membershipDraft, setMembershipDraft] = useState<PaymentDetailsDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      fetchAllPayments();
    }
  }, [authLoading, user, router]);

  const fetchAllPayments = async () => {
    try {
      // Fetch pending installments
      const installmentsData = await getPendingInstallments();
      setInstallments(installmentsData);

      // Fetch membership info for each plan (for display labels)
      const planIds = [...new Set(installmentsData.map(inst => inst.paymentPlanId))];
      const planMembershipMap: { [key: string]: Membership } = {};
      const planTotalMap: { [key: string]: { total: number; sum: number } } = {};

      for (const planId of planIds) {
        try {
          const planData = await getPaymentPlanWithMembership(planId);
          if (planData) {
            planTotalMap[planId] = {
              total: planData.totalAmount,
              sum: planData.installments.reduce((acc, inst) => acc + inst.amount, 0),
            };
          }
          if (planData?.membership) {
            planMembershipMap[planId] = planData.membership;
          }
        } catch (err) {
          console.error(`Error fetching membership for plan ${planId}:`, err);
        }
      }
      setPlanMemberships(planMembershipMap);
      setPlanTotals(planTotalMap);

      // Fetch pending simple payments
      const q = query(
        collection(db, 'memberships'),
        where('status', '==', 'pending_confirmation')
      );
      const snapshot = await getDocs(q);
      const membershipsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      })) as Membership[];
      setMemberships(membershipsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const markInstallmentAsReceived = async (installmentId: string) => {
    setConfirming(installmentId);
    try {
      await updateDoc(doc(db, 'paymentInstallments', installmentId), {
        status: 'received',
        receivedDate: new Date(),
        confirmedBy: user!.id,
        notes: notes[installmentId] || '',
        updatedAt: serverTimestamp(),
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

  const confirmSimplePayment = async (membershipId: string) => {
    setConfirming(membershipId);
    try {
      await updateDoc(doc(db, 'memberships', membershipId), {
        status: 'paid',
        updatedAt: serverTimestamp(),
      });
      setMemberships(memberships.filter((m) => m.id !== membershipId));
      alert('Paiement validé!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Erreur lors de la validation du paiement');
    } finally {
      setConfirming(null);
    }
  };

  const rejectSimplePayment = async (membershipId: string) => {
    const reason = prompt('Raison du refus (optionnel):');
    setConfirming(membershipId);
    try {
      await updateDoc(doc(db, 'memberships', membershipId), {
        status: 'cancelled',
        rejectionReason: reason || '',
        updatedAt: serverTimestamp(),
      });
      setMemberships(memberships.filter((m) => m.id !== membershipId));
      alert('Paiement refusé');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Erreur lors du refus du paiement');
    } finally {
      setConfirming(null);
    }
  };

  const startEditInstallment = (inst: PaymentInstallment) => {
    setEditingInstallment({ id: inst.id, planId: inst.paymentPlanId, draft: draftFromInstallment(inst) });
  };

  const saveInstallment = async () => {
    if (!editingInstallment) return;
    const { id, draft } = editingInstallment;
    if (!(draft.amount > 0) || !draft.date) {
      alert('Le montant et la date sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      await updateInstallmentDetails(id, draft);
      setEditingInstallment(null);
      await fetchAllPayments();
    } catch (error) {
      console.error('Error updating installment:', error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const startEditMembership = (membership: Membership) => {
    setEditingMembershipId(membership.id);
    setMembershipDraft(draftFromMembership(membership));
  };

  const saveMembership = async () => {
    if (!editingMembershipId || !membershipDraft) return;
    if (!(membershipDraft.amount > 0) || !membershipDraft.date) {
      alert('Le montant et la date sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'memberships', editingMembershipId), {
        amount: membershipDraft.amount,
        paymentMethod: membershipDraft.method,
        paymentDate: new Date(membershipDraft.date),
        ...toPaymentDetailsUpdate(membershipDraft),
        updatedAt: serverTimestamp(),
      });
      setEditingMembershipId(null);
      setMembershipDraft(null);
      await fetchAllPayments();
    } catch (error) {
      console.error('Error updating membership payment:', error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Écart entre le total des échéances du plan et son montant, en tenant compte de la saisie en cours
  const getPlanGap = (planId: string): number | null => {
    const totals = planTotals[planId];
    if (!totals) return null;
    let sum = totals.sum;
    if (editingInstallment?.planId === planId) {
      const original = installments.find((i) => i.id === editingInstallment.id);
      if (original) sum += editingInstallment.draft.amount - original.amount;
    }
    return Math.round((sum - totals.total) * 100) / 100;
  };

  const getMethodLabel = (method: 'cheque' | 'virement' | 'cheque_vacances'): string => {
    const labels: Record<'cheque' | 'virement' | 'cheque_vacances', string> = {
      cheque: '💳 Chèque',
      virement: '🏦 Virement',
      cheque_vacances: '🎟️ Chèques vacances',
    };
    return labels[method];
  };

  const getPlanLabel = (planId: string, planInstallments: PaymentInstallment[]): string => {
    const membership = planMemberships[planId];
    const totalAmount = planInstallments.reduce((sum, inst) => sum + inst.amount, 0).toFixed(2);
    const installmentCount = planInstallments.length;

    console.log(`getPlanLabel called for planId ${planId}:`, {
      hasMembergship: !!membership,
      stageName: membership?.stageName,
      allPlanIds: Object.keys(planMemberships),
    });

    if (!membership) {
      return `Plan de paiement (${totalAmount}€ • ${installmentCount} versements)`;
    }

    const danceTypeLabel = membership.registrationDetails?.danceType === 'solo' ? '1 danseur' : '2 danseurs';
    return `${danceTypeLabel} - Inscription au ${membership.stageName} (${totalAmount}€, ${installmentCount} versements)`;
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

  const totalPendingPayments = installments.length + memberships.length;

  return (
    <div className="min-h-screen bg-white space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">💰 Gestion des paiements</h1>
          <p className="text-gray-900 font-medium">
            {totalPendingPayments} paiement(s) en attente
          </p>
        </div>
        <Link
          href="/dashboard"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
        >
          ← Accueil
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('installments')}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            tab === 'installments'
              ? 'border-ink text-gold-deep'
              : 'border-transparent text-gray-900 font-medium hover:text-gray-900'
          }`}
        >
          📋 Paiements échelonnés ({installments.length})
        </button>
        <button
          onClick={() => setTab('simple')}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            tab === 'simple'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-900 font-medium hover:text-gray-900'
          }`}
        >
          💳 Paiements simples ({memberships.length})
        </button>
      </div>

      {/* Installments Tab */}
      {tab === 'installments' && (
        <div className="space-y-4">
          {installments.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-gray-900">Aucun paiement échelonné en attente ✅</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedByPlan).map(([planId, planInstallments]) => {
                const gap = getPlanGap(planId);
                return (
                <div key={planId} className="bg-white rounded-lg shadow overflow-hidden">
                  <button
                    onClick={() => setExpandedPlan(expandedPlan === planId ? null : planId)}
                    className="w-full p-6 text-left font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center"
                  >
                    <span>{getPlanLabel(planId, planInstallments)}</span>
                    <span>{expandedPlan === planId ? '▼' : '▶'}</span>
                  </button>

                  {gap !== null && Math.abs(gap) > 0.005 && (
                    <p className="px-6 pb-4 text-sm font-medium text-orange-800">
                      ⚠️ Les échéances ne correspondent pas au montant du plan ({planTotals[planId].total.toFixed(2)}€) : écart de {gap.toFixed(2)}€
                    </p>
                  )}

                  {expandedPlan === planId && (
                    <div className="border-t divide-y">
                      {planInstallments.map((inst) => {
                        const isEditing = editingInstallment?.id === inst.id;
                        return (
                        <div key={inst.id} className="p-6 space-y-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{getMethodLabel(inst.method)}</h3>
                              <p className="text-sm text-gray-900 font-medium">
                                Échéance: {new Date(inst.dueDate).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <span className="text-2xl font-bold text-gold-deep">{inst.amount.toFixed(2)}€</span>
                          </div>

                          {isEditing ? (
                            <PaymentDetailsForm
                              draft={editingInstallment.draft}
                              onChange={(draft) => setEditingInstallment((prev) => prev && { ...prev, draft })}
                              methods={INSTALLMENT_METHODS}
                              dateLabel="Date d'échéance"
                            />
                          ) : (
                            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                              {inst.method === 'cheque' && (
                                <>
                                  {inst.chequeNumber && <p className="text-gray-900"><strong>N° chèque:</strong> {inst.chequeNumber}</p>}
                                  {inst.chequeBank && <p className="text-gray-900"><strong>Banque:</strong> {inst.chequeBank}</p>}
                                  {inst.chequeCity && <p className="text-gray-900"><strong>Ville:</strong> {inst.chequeCity}</p>}
                                  {inst.chequeName && <p className="text-gray-900"><strong>Nom:</strong> {inst.chequeName}</p>}
                                </>
                              )}
                              {inst.method === 'cheque_vacances' && (
                                <p className="text-gray-900"><strong>Nombre de chèques:</strong> {inst.chequeVacancesCount || 'N/A'}</p>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Notes (optionnel)</label>
                            <textarea
                              value={notes[inst.id] || ''}
                              onChange={(e) => setNotes({ ...notes, [inst.id]: e.target.value })}
                              placeholder="Notes internes..."
                              className="w-full border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-500"
                              rows={2}
                            />
                          </div>

                          {/* Boutons */}
                          <div className="flex gap-3 pt-4">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={saveInstallment}
                                  disabled={saving}
                                  className="flex-1 bg-ink hover:bg-ink-soft text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                                >
                                  {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                                </button>
                                <button
                                  onClick={() => setEditingInstallment(null)}
                                  disabled={saving}
                                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                                >
                                  Annuler
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditInstallment(inst)}
                                  disabled={confirming === inst.id}
                                  className="flex-1 bg-ink hover:bg-ink-soft text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={() => markInstallmentAsReceived(inst.id)}
                                  disabled={confirming === inst.id}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                                >
                                  {confirming === inst.id ? 'Validation...' : '✅ Marquer reçu'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Simple Payments Tab */}
      {tab === 'simple' && (
        <div className="space-y-4">
          {memberships.length === 0 ? (
            <div className="bg-gold-50 border border-gold-200 rounded-lg p-6 text-center">
              <p className="text-gray-900">Aucun paiement simple en attente ✅</p>
            </div>
          ) : (
            <>
              {memberships.map((membership) => {
                const isEditing = editingMembershipId === membership.id;
                return (
                <div key={membership.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{membership.stageName}</h2>
                      <p className="text-sm text-gray-900 font-medium">ID: {membership.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-orange-600">{membership.amount}€</span>
                      <p className="text-sm text-gray-900 font-medium">
                        {membership.paymentMethod === 'cheque' && '💳 Chèque'}
                        {membership.paymentMethod === 'virement' && '🏦 Virement'}
                        {membership.paymentMethod === 'helloasso' && '📱 HelloAsso'}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Détails de l'inscription */}
                    <div className="bg-gold-50 rounded border border-gold-200 p-4 space-y-2 text-sm">
                      <p className="text-gray-900">
                        <strong>Danseurs:</strong> {membership.registrationDetails.danceType === 'solo' ? '1 danseur' : '2 danseurs'}
                        {membership.registrationDetails.dancers.some((d) => d.licensed) && ' (licencié FFDanse)'}
                      </p>
                      {membership.registrationDetails.accompanists > 0 && (
                        <p className="text-gray-900">
                          <strong>Accompagnateurs:</strong> {membership.registrationDetails.accompanists}
                        </p>
                      )}
                      {membership.registrationDetails.wantHousing && (
                        <p className="text-gray-900">
                          <strong>Hébergement:</strong>
                          {membership.registrationDetails.housingSolo > 0 && ` ${membership.registrationDetails.housingSolo} solo`}
                          {membership.registrationDetails.housingSolo > 0 && membership.registrationDetails.housingCouple > 0 && ' +'}
                          {membership.registrationDetails.housingCouple > 0 && ` ${membership.registrationDetails.housingCouple} couple`}
                        </p>
                      )}
                    </div>

                    {isEditing && membershipDraft ? (
                      <PaymentDetailsForm
                        draft={membershipDraft}
                        onChange={setMembershipDraft}
                        methods={SIMPLE_METHODS}
                        dateLabel="Date de réception"
                      />
                    ) : (
                      membership.paymentMethod === 'cheque' && (
                        <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                          {membership.chequeNumber && <p className="text-gray-900"><strong>N° chèque:</strong> {membership.chequeNumber}</p>}
                          {membership.chequeBank && <p className="text-gray-900"><strong>Banque:</strong> {membership.chequeBank}</p>}
                          {membership.chequeCity && <p className="text-gray-900"><strong>Ville:</strong> {membership.chequeCity}</p>}
                          {membership.chequeName && <p className="text-gray-900"><strong>Nom:</strong> {membership.chequeName}</p>}
                        </div>
                      )
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveMembership}
                            disabled={saving}
                            className="flex-1 bg-ink hover:bg-ink-soft text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                          >
                            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMembershipId(null);
                              setMembershipDraft(null);
                            }}
                            disabled={saving}
                            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditMembership(membership)}
                            disabled={confirming === membership.id}
                            className="flex-1 bg-ink hover:bg-ink-soft text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={() => confirmSimplePayment(membership.id)}
                            disabled={confirming === membership.id}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                          >
                            {confirming === membership.id ? 'Validation...' : '✅ Valider'}
                          </button>
                          <button
                            onClick={() => rejectSimplePayment(membership.id)}
                            disabled={confirming === membership.id}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                          >
                            {confirming === membership.id ? 'Refus...' : '❌ Refuser'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
