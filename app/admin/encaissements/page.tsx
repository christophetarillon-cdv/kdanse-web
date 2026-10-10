'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TypeFilter = 'all' | 'simple' | 'echeance';
type StatusFilter = 'all' | 'received' | 'pending';

interface Membership {
  id: string;
  userId: string;
  stageName: string;
  amount: number;
  paymentMethod: string;
  paymentPlanId: string | null;
  status: string;
  createdAt: Date | null;
  paymentDate: Date | null;
  updatedAt: Date | null;
  chequeNumber?: string;
  chequeBank?: string;
}

interface Installment {
  id: string;
  paymentPlanId: string;
  amount: number;
  dueDate: Date | null;
  method: string;
  status: string;
  receivedDate: Date | null;
  confirmedBy: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeVacancesCount?: number;
}

interface Encaissement {
  key: string;
  date: Date | null;
  donor: string;
  stage: string;
  kind: 'simple' | 'echeance';
  position: string;
  method: string;
  reference: string;
  amount: number;
  confirmedBy: string;
  received: boolean;
}

const MODE_LABELS: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  cheque_vacances: 'Chèques vacances',
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

const toMembership = (id: string, data: DocumentData): Membership => ({
  id,
  userId: data.userId ?? '',
  stageName: data.stageName ?? '',
  amount: Number(data.amount ?? 0),
  paymentMethod: data.paymentMethod ?? '',
  paymentPlanId: data.paymentPlanId ?? null,
  status: data.status ?? '',
  createdAt: toDate(data.createdAt),
  paymentDate: toDate(data.paymentDate),
  updatedAt: toDate(data.updatedAt),
  chequeNumber: data.chequeNumber,
  chequeBank: data.chequeBank,
});

const toInstallment = (id: string, data: DocumentData): Installment => ({
  id,
  paymentPlanId: data.paymentPlanId ?? '',
  amount: Number(data.amount ?? 0),
  dueDate: toDate(data.dueDate),
  method: data.method ?? '',
  status: data.status ?? '',
  receivedDate: toDate(data.receivedDate),
  confirmedBy: data.confirmedBy ?? '',
  chequeNumber: data.chequeNumber,
  chequeBank: data.chequeBank,
  chequeVacancesCount: data.chequeVacancesCount,
});

const referenceOf = (method: string, number?: string, bank?: string, count?: number) => {
  if (method === 'cheque') return [number && `n° ${number}`, bank].filter(Boolean).join(' · ') || '—';
  if (method === 'cheque_vacances') return count ? `${count} chèque${count > 1 ? 's' : ''} vacances` : '—';
  if (method === 'helloasso') return 'HelloAsso';
  return '—';
};

export default function AdminEncaissementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Encaissement[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [authLoading, user, router]);

  const load = async () => {
    try {
      const [membershipsSnap, installmentsSnap] = await Promise.all([
        getDocs(collection(db, 'memberships')),
        getDocs(collection(db, 'paymentInstallments')),
      ]);

      const memberships = membershipsSnap.docs.map((d) => toMembership(d.id, d.data()));
      const installments = installmentsSnap.docs
        .map((d) => toInstallment(d.id, d.data()))
        .filter((i) => i.status !== 'cancelled' && i.paymentPlanId);

      const uids = [
        ...new Set([...memberships.map((m) => m.userId), ...installments.map((i) => i.confirmedBy)].filter(Boolean)),
      ];
      const nameEntries = await Promise.all(
        uids.map(async (uid) => {
          const data = (await getDoc(doc(db, 'users', uid))).data();
          const name = [data?.prenom, data?.nom].filter(Boolean).join(' ') || data?.email || 'Inconnu';
          return [uid, name] as const;
        })
      );
      const names: Record<string, string> = Object.fromEntries(nameEntries);
      const nameOf = (uid: string) => names[uid] ?? 'Inconnu';

      const planMembership: Record<string, Membership> = {};
      memberships.forEach((m) => {
        if (m.paymentPlanId) planMembership[m.paymentPlanId] = m;
      });

      const simpleRows: Encaissement[] = memberships
        .filter(
          (m) =>
            !m.paymentPlanId &&
            m.paymentMethod !== 'plan' &&
            (m.status === 'paid' || m.status === 'pending_confirmation')
        )
        .map((m) => ({
          key: `m_${m.id}`,
          date: m.status === 'paid' ? m.paymentDate ?? m.updatedAt : m.createdAt,
          donor: nameOf(m.userId),
          stage: m.stageName,
          kind: 'simple',
          position: 'Simple',
          method: m.paymentMethod,
          reference: referenceOf(m.paymentMethod, m.chequeNumber, m.chequeBank),
          amount: m.amount,
          confirmedBy: m.paymentMethod === 'helloasso' ? 'Automatique' : '—',
          received: m.status === 'paid',
        }));

      const byPlan: Record<string, Installment[]> = {};
      installments.forEach((i) => {
        byPlan[i.paymentPlanId] = [...(byPlan[i.paymentPlanId] ?? []), i];
      });

      const installmentRows: Encaissement[] = Object.entries(byPlan).flatMap(([planId, list]) => {
        const m = planMembership[planId];
        if (!m || m.status === 'cancelled') return [];
        const sorted = [...list].sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
        return sorted.map((i, index) => {
          const received = i.status === 'received';
          return {
            key: `i_${i.id}`,
            date: received ? i.receivedDate : i.dueDate,
            donor: nameOf(m.userId),
            stage: m.stageName,
            kind: 'echeance',
            position: `Échéance ${index + 1}/${sorted.length}`,
            method: i.method,
            reference: referenceOf(i.method, i.chequeNumber, i.chequeBank, i.chequeVacancesCount),
            amount: i.amount,
            confirmedBy: received && i.confirmedBy ? nameOf(i.confirmedBy) : '—',
            received,
          };
        });
      });

      setRows([...simpleRows, ...installmentRows].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)));
    } catch (error) {
      console.error('Error loading encaissements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const fromBound = from ? new Date(from) : null;
  const toBound = to ? new Date(`${to}T23:59:59`) : null;
  const needle = search.trim().toLowerCase();

  const base = rows.filter((r) => {
    if (fromBound && (!r.date || r.date < fromBound)) return false;
    if (toBound && (!r.date || r.date > toBound)) return false;
    if (modeFilter !== 'all' && r.method !== modeFilter) return false;
    if (typeFilter !== 'all' && r.kind !== typeFilter) return false;
    if (needle && !`${r.donor} ${r.stage} ${r.reference}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  const listed = base.filter((r) => {
    if (statusFilter === 'received') return r.received;
    if (statusFilter === 'pending') return !r.received;
    return true;
  });

  const received = base.filter((r) => r.received);
  const pending = base.filter((r) => !r.received);
  const sum = (list: Encaissement[]) => list.reduce((total, r) => total + r.amount, 0);
  const modeTotals = Object.entries(MODE_LABELS).map(([mode, label]) => ({
    label,
    total: sum(received.filter((r) => r.method === mode)),
  }));

  const selectClass = 'border rounded px-3 py-2 text-sm text-gray-900 bg-white';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">💶 Encaissements</h1>
            <p className="text-gray-900 font-medium">
              Tout l'argent reçu, paiements simples et échéances, avec totaux par mode
            </p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Accueil
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 col-span-2 md:col-span-1">
            <div className="text-2xl font-bold text-green-700">{eur(sum(received))}</div>
            <div className="text-sm text-gray-900 font-medium">Encaissé sur la période</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 col-span-2 md:col-span-1">
            <div className="text-2xl font-bold text-gold-ink">{eur(sum(pending))}</div>
            <div className="text-sm text-gray-900 font-medium">En attente de réception</div>
          </div>
          {modeTotals.map((mode) => (
            <div key={mode.label} className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-gray-900">{eur(mode.total)}</div>
              <div className="text-sm text-gray-900 font-medium">{mode.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-center">
          <label className="text-sm text-gray-900 font-medium flex items-center gap-2">
            Du
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
          </label>
          <label className="text-sm text-gray-900 font-medium flex items-center gap-2">
            au
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
          </label>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous les modes</option>
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className={selectClass}>
            <option value="all">Paiement simple et échéance</option>
            <option value="simple">Paiement simple</option>
            <option value="echeance">Échéance</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClass}
          >
            <option value="all">Reçus et en attente</option>
            <option value="received">Reçus</option>
            <option value="pending">En attente</option>
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Donneur, stage, référence…"
            className="border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-500 flex-1 min-w-[200px]"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {listed.length === 0 ? (
            <p className="p-8 text-center text-gray-900 font-medium">Aucun encaissement ne correspond aux filtres</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr className="text-left text-sm font-semibold text-gray-900">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donneur d'ordre</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3">Confirmé par</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listed.map((r) => (
                  <tr key={r.key} className="text-sm text-gray-900 align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{formatDate(r.date)}</div>
                      <div className="text-xs text-gray-700">{r.received ? 'Reçu' : 'Prévu'}</div>
                    </td>
                    <td className="px-4 py-3">{r.donor}</td>
                    <td className="px-4 py-3">{r.stage}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          r.kind === 'echeance' ? 'bg-gold-100 text-gold-deep' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {r.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">{MODE_LABELS[r.method] ?? (r.method || '—')}</td>
                    <td className="px-4 py-3">{r.reference}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={r.received ? '' : 'text-gold-ink'}>{eur(r.amount)}</span>
                    </td>
                    <td className="px-4 py-3">{r.confirmedBy}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-900">
                <tr className="text-gray-900 font-bold">
                  <td className="px-4 py-3" colSpan={6}>
                    Total affiché ({listed.length})
                  </td>
                  <td className="px-4 py-3 text-right">{eur(sum(listed))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
