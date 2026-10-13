'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OtherPayment {
  key: string;
  method: 'virement' | 'helloasso';
  date: Date | null;
  donor: string;
  amount: number;
}

const METHOD_LABELS: Record<OtherPayment['method'], string> = {
  virement: 'Virement',
  helloasso: 'HelloAsso',
};

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const formatDate = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR') : '—');

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  return null;
};

export default function VirementsEncaissesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<OtherPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const [membershipsSnap, installmentsSnap] = await Promise.all([
          getDocs(collection(db, 'memberships')),
          getDocs(collection(db, 'paymentInstallments')),
        ]);

        const memberships: DocumentData[] = membershipsSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          paymentDate: toDate(d.data().paymentDate),
          updatedAt: toDate(d.data().updatedAt),
        }));
        const installments: DocumentData[] = installmentsSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          receivedDate: toDate(d.data().receivedDate),
        }));

        const planUser: Record<string, string> = {};
        memberships.forEach((m) => {
          if (m.paymentPlanId) planUser[m.paymentPlanId] = m.userId;
        });

        const uids = [
          ...new Set([
            ...memberships.map((m) => m.userId as string),
            ...installments.map((i) => planUser[i.paymentPlanId as string] ?? ''),
          ].filter(Boolean)),
        ];
        const nameEntries = await Promise.all(
          uids.map(async (uid) => {
            const data = (await getDoc(doc(db, 'users', uid))).data();
            return [uid, [data?.prenom, data?.nom].filter(Boolean).join(' ') || data?.email || 'Inconnu'] as const;
          })
        );
        const names: Record<string, string> = Object.fromEntries(nameEntries);

        const list: OtherPayment[] = [
          ...memberships
            .filter(
              (m) =>
                !m.paymentPlanId &&
                m.status === 'paid' &&
                (m.paymentMethod === 'virement' || m.paymentMethod === 'helloasso')
            )
            .map((m) => ({
              key: `m_${m.id}`,
              method: m.paymentMethod as OtherPayment['method'],
              date: (m.paymentDate ?? m.updatedAt) as Date | null,
              donor: names[m.userId as string] ?? 'Inconnu',
              amount: Number(m.amount ?? 0),
            })),
          ...installments
            .filter((i) => i.method === 'virement' && i.status === 'received')
            .map((i) => ({
              key: `i_${i.id}`,
              method: 'virement' as const,
              date: i.receivedDate as Date | null,
              donor: names[planUser[i.paymentPlanId as string] ?? ''] ?? 'Inconnu',
              amount: Number(i.amount ?? 0),
            })),
        ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

        setPayments(list);
      } catch (error) {
        console.error('Error loading virements:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, user, router]);

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8 space-y-6 print:p-0">
      <div className="flex flex-wrap justify-between items-start gap-4 print:hidden">
        <Link
          href="/admin/mises-en-banque"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          ← Mises en banque
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-ink hover:bg-ink-soft text-white px-4 py-2 rounded font-semibold transition"
        >
          🖨️ Imprimer
        </button>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Virements et HelloAsso encaissés</h1>
        <p className="text-gray-900 font-medium">
          {payments.length} encaissement(s) · {eur(total)} · sans remise à la banque
        </p>
      </div>

      {payments.length === 0 ? (
        <p className="text-gray-900 font-medium">Aucun virement ni paiement HelloAsso encaissé</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr className="text-left font-semibold text-gray-900">
                <th className="px-4 py-3">Reçu le</th>
                <th className="px-4 py-3">Donneur d&apos;ordre</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.key} className="text-gray-900">
                  <td className="px-4 py-3">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 font-semibold">{p.donor}</td>
                  <td className="px-4 py-3">{METHOD_LABELS[p.method]}</td>
                  <td className="px-4 py-3 text-right font-semibold">{eur(p.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2">
              <tr className="font-bold text-gray-900">
                <td className="px-4 py-3" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-right">{eur(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
