'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, writeBatch, serverTimestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tab = 'to_deposit' | 'deposited' | 'all';

interface Membership {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  paymentPlanId: string | null;
  status: string;
  paymentDate: Date | null;
  updatedAt: Date | null;
  remiseId: string | null;
  chequeNumber: string;
  chequeBank: string;
  chequeCity: string;
  chequeName: string;
}

interface Installment {
  id: string;
  paymentPlanId: string;
  amount: number;
  method: string;
  status: string;
  receivedDate: Date | null;
  remiseId: string | null;
  chequeNumber: string;
  chequeBank: string;
  chequeCity: string;
  chequeName: string;
}

interface Cheque {
  key: string;
  kind: 'simple' | 'installment';
  sourceId: string;
  date: Date | null;
  donor: string;
  chequeNumber: string;
  chequeBank: string;
  chequeCity: string;
  chequeName: string;
  amount: number;
  remiseId: string | null;
}

interface Bordereau {
  id: string;
  reference: string;
  createdAt: Date | null;
  count: number;
  amount: number;
}

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
  amount: Number(data.amount ?? 0),
  paymentMethod: data.paymentMethod ?? '',
  paymentPlanId: data.paymentPlanId ?? null,
  status: data.status ?? '',
  paymentDate: toDate(data.paymentDate),
  updatedAt: toDate(data.updatedAt),
  remiseId: data.remiseId ?? null,
  chequeNumber: data.chequeNumber ?? '',
  chequeBank: data.chequeBank ?? '',
  chequeCity: data.chequeCity ?? '',
  chequeName: data.chequeName ?? '',
});

const toInstallment = (id: string, data: DocumentData): Installment => ({
  id,
  paymentPlanId: data.paymentPlanId ?? '',
  amount: Number(data.amount ?? 0),
  method: data.method ?? '',
  status: data.status ?? '',
  receivedDate: toDate(data.receivedDate),
  remiseId: data.remiseId ?? null,
  chequeNumber: data.chequeNumber ?? '',
  chequeBank: data.chequeBank ?? '',
  chequeCity: data.chequeCity ?? '',
  chequeName: data.chequeName ?? '',
});

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export default function AdminMisesEnBanquePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [bordereaux, setBordereaux] = useState<Bordereau[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<Tab>('to_deposit');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      const [membershipsSnap, installmentsSnap, bordereauxSnap] = await Promise.all([
        getDocs(collection(db, 'memberships')),
        getDocs(collection(db, 'paymentInstallments')),
        getDocs(collection(db, 'bordereaux')),
      ]);

      const memberships = membershipsSnap.docs.map((d) => toMembership(d.id, d.data()));
      const installments = installmentsSnap.docs
        .map((d) => toInstallment(d.id, d.data()))
        .filter((i) => i.paymentPlanId && i.method === 'cheque' && i.status === 'received');

      const planUser: Record<string, string> = {};
      memberships.forEach((m) => {
        if (m.paymentPlanId) planUser[m.paymentPlanId] = m.userId;
      });

      const uids = [
        ...new Set([
          ...memberships.map((m) => m.userId),
          ...installments.map((i) => planUser[i.paymentPlanId] ?? ''),
        ].filter(Boolean)),
      ];
      const nameEntries = await Promise.all(
        uids.map(async (uid) => {
          const data = (await getDoc(doc(db, 'users', uid))).data();
          return [uid, [data?.prenom, data?.nom].filter(Boolean).join(' ') || data?.email || 'Inconnu'] as const;
        })
      );
      const names: Record<string, string> = Object.fromEntries(nameEntries);

      const simpleCheques: Cheque[] = memberships
        .filter((m) => !m.paymentPlanId && m.paymentMethod === 'cheque' && m.status === 'paid')
        .map((m) => ({
          key: `m_${m.id}`,
          kind: 'simple',
          sourceId: m.id,
          date: m.paymentDate ?? m.updatedAt,
          donor: names[m.userId] ?? 'Inconnu',
          chequeNumber: m.chequeNumber,
          chequeBank: m.chequeBank,
          chequeCity: m.chequeCity,
          chequeName: m.chequeName,
          amount: m.amount,
          remiseId: m.remiseId,
        }));

      const installmentCheques: Cheque[] = installments.map((i) => ({
        key: `i_${i.id}`,
        kind: 'installment',
        sourceId: i.id,
        date: i.receivedDate,
        donor: names[planUser[i.paymentPlanId] ?? ''] ?? 'Inconnu',
        chequeNumber: i.chequeNumber,
        chequeBank: i.chequeBank,
        chequeCity: i.chequeCity,
        chequeName: i.chequeName,
        amount: i.amount,
        remiseId: i.remiseId,
      }));

      setCheques(
        [...simpleCheques, ...installmentCheques].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
      );
      setBordereaux(
        bordereauxSnap.docs
          .map((d) => ({
            id: d.id,
            reference: d.data().reference ?? '',
            createdAt: toDate(d.data().createdAt),
            count: Number(d.data().count ?? 0),
            amount: Number(d.data().amount ?? 0),
          }))
          .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      );
    } catch (error) {
      console.error('Error loading mises en banque:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const refById = Object.fromEntries(bordereaux.map((b) => [b.id, b.reference]));
  const sum = (list: Cheque[]) => list.reduce((total, c) => total + c.amount, 0);

  const toDeposit = cheques.filter((c) => !c.remiseId);
  const deposited = cheques.filter((c) => c.remiseId);
  const visible = tab === 'to_deposit' ? toDeposit : tab === 'deposited' ? deposited : cheques;
  const selectedCheques = toDeposit.filter((c) => selected.has(c.key));

  const prefix = `BDR-${new Date().getFullYear()}-`;
  const lastSequence = Math.max(
    0,
    ...bordereaux
      .map((b) => b.reference)
      .filter((ref) => ref.startsWith(prefix))
      .map((ref) => Number(ref.slice(prefix.length)))
      .filter((n) => !isNaN(n))
  );
  const nextReference = `${prefix}${String(lastSequence + 1).padStart(2, '0')}`;

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const toggleAll = () => {
    const keys = visible.filter((c) => !c.remiseId).map((c) => c.key);
    const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
    setSelected(allSelected ? new Set([...selected].filter((k) => !keys.includes(k))) : new Set([...selected, ...keys]));
  };

  const createBordereau = async () => {
    if (!user || selectedCheques.length === 0) return;
    const total = sum(selectedCheques);
    if (!window.confirm(`Créer le bordereau ${nextReference} : ${selectedCheques.length} chèque(s) pour ${eur(total)} ?`)) {
      return;
    }
    setSaving(true);
    try {
      const bordereauRef = doc(collection(db, 'bordereaux'));
      const batch = writeBatch(db);
      batch.set(bordereauRef, {
        reference: nextReference,
        createdAt: serverTimestamp(),
        createdBy: user.id,
        count: selectedCheques.length,
        amount: total,
        items: selectedCheques.map((c) => ({
          kind: c.kind,
          sourceId: c.sourceId,
          donor: c.donor,
          chequeNumber: c.chequeNumber,
          chequeBank: c.chequeBank,
          chequeCity: c.chequeCity,
          chequeName: c.chequeName,
          amount: c.amount,
          date: c.date,
        })),
      });
      selectedCheques.forEach((c) =>
        batch.update(doc(db, c.kind === 'simple' ? 'memberships' : 'paymentInstallments', c.sourceId), {
          remiseId: bordereauRef.id,
          updatedAt: serverTimestamp(),
        })
      );
      await batch.commit();
      setSelected(new Set());
      await load();
    } catch (error) {
      console.error('Error creating bordereau:', error);
      alert('Erreur lors de la création du bordereau');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const source = selectedCheques.length > 0 ? selectedCheques : toDeposit;
    const header = ['Reçu le', 'Donneur', 'N° chèque', 'Banque', 'Ville', 'Nom sur le chèque', 'Montant'];
    const lines = [
      header,
      ...source.map((c) => [
        formatDate(c.date),
        c.donor,
        c.chequeNumber,
        c.chequeBank,
        c.chequeCity,
        c.chequeName,
        c.amount.toFixed(2).replace('.', ','),
      ]),
    ].map((cols) => cols.map(csvCell).join(';'));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cheques-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabClass = (value: Tab) =>
    `px-4 py-2 text-sm font-semibold rounded ${
      tab === value ? 'bg-ink text-white' : 'bg-white text-gray-900 border hover:bg-gray-50'
    }`;

  const selectableVisible = visible.filter((c) => !c.remiseId);
  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((c) => selected.has(c.key));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🏦 Mises en banque</h1>
            <p className="text-gray-900 font-medium">
              Chèques reçus à regrouper dans un bordereau de remise à la banque
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
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-700">{toDeposit.length}</div>
            <div className="text-sm text-gray-900 font-medium">Chèques non déposés</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{eur(sum(toDeposit))}</div>
            <div className="text-sm text-gray-900 font-medium">Montant non déposé</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-700">{eur(sum(deposited))}</div>
            <div className="text-sm text-gray-900 font-medium">Chèques déposés</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gold-deep">{selectedCheques.length}</div>
            <div className="text-sm text-gray-900 font-medium">
              Sélection ({eur(sum(selectedCheques))})
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <button className={tabClass('to_deposit')} onClick={() => setTab('to_deposit')}>
              À déposer
            </button>
            <button className={tabClass('deposited')} onClick={() => setTab('deposited')}>
              Déposés
            </button>
            <button className={tabClass('all')} onClick={() => setTab('all')}>
              Tous
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              disabled={toDeposit.length === 0 && selectedCheques.length === 0}
              className="bg-white border px-4 py-2 rounded text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              Exporter en CSV
            </button>
            <button
              onClick={createBordereau}
              disabled={selectedCheques.length === 0 || saving}
              className="bg-ink text-white px-4 py-2 rounded text-sm font-semibold hover:bg-ink-soft disabled:opacity-50"
            >
              {saving ? 'Création…' : `Créer le bordereau ${nextReference} (${eur(sum(selectedCheques))})`}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {visible.length === 0 ? (
            <p className="p-8 text-center text-gray-900 font-medium">Aucun chèque dans cette liste</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr className="text-left text-sm font-semibold text-gray-900">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      disabled={selectableVisible.length === 0}
                    />
                  </th>
                  <th className="px-4 py-3">Reçu le</th>
                  <th className="px-4 py-3">Donneur d'ordre</th>
                  <th className="px-4 py-3">N° chèque</th>
                  <th className="px-4 py-3">Banque</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Nom sur le chèque</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3">Remise</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((c) => (
                  <tr key={c.key} className="text-sm text-gray-900 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${c.donor}`}
                        checked={selected.has(c.key)}
                        onChange={() => toggle(c.key)}
                        disabled={Boolean(c.remiseId)}
                      />
                    </td>
                    <td className="px-4 py-3">{formatDate(c.date)}</td>
                    <td className="px-4 py-3 font-semibold">{c.donor}</td>
                    <td className="px-4 py-3">{c.chequeNumber || '—'}</td>
                    <td className="px-4 py-3">{c.chequeBank || '—'}</td>
                    <td className="px-4 py-3">{c.chequeCity || '—'}</td>
                    <td className="px-4 py-3">{c.chequeName || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{eur(c.amount)}</td>
                    <td className="px-4 py-3">
                      {c.remiseId ? (
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                          {refById[c.remiseId] ?? 'Déposé'}
                        </span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bordereaux créés</h2>
            <p className="text-sm text-gray-900 font-medium">Historique des remises à la banque</p>
          </div>
          {bordereaux.length === 0 ? (
            <p className="text-gray-900 font-medium">Aucun bordereau créé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr className="text-left font-semibold text-gray-900">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3 text-right">Nombre</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bordereaux.map((b) => (
                    <tr key={b.id} className="text-gray-900">
                      <td className="px-4 py-3">{formatDate(b.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold">{b.reference}</td>
                      <td className="px-4 py-3 text-right">{b.count} chèque(s)</td>
                      <td className="px-4 py-3 text-right">{eur(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
