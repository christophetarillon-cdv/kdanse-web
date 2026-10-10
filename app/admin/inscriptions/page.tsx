'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDances, getLevels } from '@/services/coursesService';
import { Dance, Level } from '@/types/courses';

type StatusFilter = 'active' | 'paid' | 'pending' | 'cancelled';
type Courses = Record<string, string | null>;

interface StoredDancer {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Membership {
  id: string;
  userId: string;
  stageId: string;
  stageName: string;
  amount: number;
  paymentMethod: string;
  paymentPlanId: string | null;
  status: string;
  createdAt: Date | null;
  coursesConfirmedAt: Date | null;
  dancers: StoredDancer[];
}

interface Donor {
  name: string;
  email: string;
}

const PENDING_STATUSES = ['pending_confirmation', 'pending_plan'];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Payée', className: 'bg-green-100 text-green-800' },
  pending_confirmation: { label: 'À valider', className: 'bg-gold-100 text-gold-ink' },
  pending_plan: { label: 'Échéancier en attente', className: 'bg-gold-100 text-gold-ink' },
  active: { label: 'Active', className: 'bg-gold-100 text-gold-deep' },
  completed: { label: 'Terminée', className: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-800' },
};

const MODE_LABELS: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  helloasso: 'HelloAsso',
  plan: 'Échéancier',
};

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const formatDate = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR') : '—');

const toMembership = (id: string, data: DocumentData): Membership => ({
  id,
  userId: data.userId ?? '',
  stageId: data.stageId ?? '',
  stageName: data.stageName ?? '',
  amount: Number(data.amount ?? 0),
  paymentMethod: data.paymentMethod ?? '',
  paymentPlanId: data.paymentPlanId ?? null,
  status: data.status ?? '',
  createdAt: data.createdAt?.toDate?.() ?? null,
  coursesConfirmedAt: data.coursesConfirmedAt?.toDate?.() ?? null,
  dancers: data.registrationDetails?.dancers ?? [],
});

export default function AdminInscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [donors, setDonors] = useState<Record<string, Donor>>({});
  const [coursesByDancer, setCoursesByDancer] = useState<Record<string, Courses>>({});
  const [dances, setDances] = useState<Dance[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [modeFilter, setModeFilter] = useState('all');
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
      const [membershipsSnap, coursesSnap, dancesData, levelsData] = await Promise.all([
        getDocs(collection(db, 'memberships')),
        getDocs(collection(db, 'membershipCourses')),
        getDances(),
        getLevels(),
      ]);

      const list = membershipsSnap.docs.map((d) => toMembership(d.id, d.data()));
      const userIds = [...new Set(list.map((m) => m.userId).filter(Boolean))];
      const donorEntries = await Promise.all(
        userIds.map(async (uid) => {
          const data = (await getDoc(doc(db, 'users', uid))).data();
          const donor: Donor = {
            name: [data?.prenom, data?.nom].filter(Boolean).join(' '),
            email: data?.email ?? '',
          };
          return [uid, donor] as const;
        })
      );

      setMemberships(list);
      setDonors(Object.fromEntries(donorEntries));
      setCoursesByDancer(
        Object.fromEntries(coursesSnap.docs.map((d) => [d.id, (d.data().courses ?? {}) as Courses]))
      );
      setDances([...dancesData].sort((a, b) => a.order - b.order));
      setLevels([...levelsData].sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading inscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const dancerNames = (m: Membership) =>
    m.dancers.map((d, i) => [d.firstName, d.lastName].filter(Boolean).join(' ') || `Danseur ${i + 1}`);
  const donorName = (m: Membership) => donors[m.userId]?.name || dancerNames(m)[0] || 'Inconnu';
  const donorEmail = (m: Membership) => donors[m.userId]?.email ?? '';
  const modeOf = (m: Membership) => (m.paymentPlanId || m.paymentMethod === 'plan' ? 'plan' : m.paymentMethod);
  const coursesOf = (m: Membership) => m.dancers.map((_, i) => coursesByDancer[`${m.id}_dancer_${i}`] ?? {});
  const danceName = (danceId: string) => dances.find((d) => d.id === danceId)?.name ?? 'Danse';

  const dancesOf = (m: Membership) => {
    const names = new Set<string>();
    coursesOf(m).forEach((courses) =>
      Object.entries(courses).forEach(([danceId, levelId]) => {
        if (levelId && levelId !== 'none') names.add(danceName(danceId));
      })
    );
    return [...names];
  };

  const stages = [...new Map(memberships.filter((m) => m.stageId).map((m) => [m.stageId, m.stageName])).entries()];

  const needle = search.trim().toLowerCase();
  const filtered = memberships
    .filter((m) => {
      if (stageFilter !== 'all' && m.stageId !== stageFilter) return false;
      if (statusFilter === 'active' && m.status === 'cancelled') return false;
      if (statusFilter === 'paid' && m.status !== 'paid') return false;
      if (statusFilter === 'pending' && !PENDING_STATUSES.includes(m.status)) return false;
      if (statusFilter === 'cancelled' && m.status !== 'cancelled') return false;
      if (modeFilter !== 'all' && modeOf(m) !== modeFilter) return false;
      if (needle) {
        const haystack = [
          donorName(m),
          donorEmail(m),
          ...dancerNames(m),
          ...m.dancers.map((d) => d.email ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

  const counted = filtered.filter((m) => m.status !== 'cancelled');
  const kpis = {
    count: filtered.length,
    paid: filtered.filter((m) => m.status === 'paid').length,
    pending: filtered.filter((m) => PENDING_STATUSES.includes(m.status)).length,
    notConfirmed: counted.filter((m) => !m.coursesConfirmedAt).length,
    total: counted.reduce((sum, m) => sum + m.amount, 0),
  };

  const confirmed = counted.filter((m) => m.coursesConfirmedAt);
  const bilan = dances.map((dance) => {
    const byLevel = levels.map((level) =>
      confirmed.reduce((n, m) => n + coursesOf(m).filter((c) => c[dance.id] === level.id).length, 0)
    );
    const none = confirmed.reduce((n, m) => n + coursesOf(m).filter((c) => c[dance.id] === 'none').length, 0);
    const total = byLevel.reduce((a, b) => a + b, 0) + none;
    return { dance, byLevel, none, total };
  });
  const bilanTotals = levels.map((_, i) => bilan.reduce((n, row) => n + row.byLevel[i], 0));
  const bilanNone = bilan.reduce((n, row) => n + row.none, 0);

  const selectClass = 'border rounded px-3 py-2 text-sm text-gray-900 bg-white';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📋 Inscriptions aux stages</h1>
            <p className="text-gray-900 font-medium">Une ligne par inscription, avec le bilan des cours par danse</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{kpis.count}</div>
            <div className="text-sm text-gray-900 font-medium">Inscriptions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-700">{kpis.paid}</div>
            <div className="text-sm text-gray-900 font-medium">Payées</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gold-ink">{kpis.pending}</div>
            <div className="text-sm text-gray-900 font-medium">En attente de paiement</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-700">{kpis.notConfirmed}</div>
            <div className="text-sm text-gray-900 font-medium">Cours non confirmés</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{eur(kpis.total)}</div>
            <div className="text-sm text-gray-900 font-medium">Montant total</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-center">
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous les stages</option>
            {stages.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClass}
          >
            <option value="active">Toutes sauf annulées</option>
            <option value="paid">Payées</option>
            <option value="pending">En attente de paiement</option>
            <option value="cancelled">Annulées</option>
          </select>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous les modes</option>
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email…"
            className="border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-500 flex-1 min-w-[200px]"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-900 font-medium">Aucune inscription ne correspond aux filtres</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr className="text-left text-sm font-semibold text-gray-900">
                  <th className="px-4 py-3">Donneur d'ordre</th>
                  <th className="px-4 py-3">Danseurs</th>
                  <th className="px-4 py-3">Danses</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Cours</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((m) => {
                  const status = STATUS_LABELS[m.status] ?? { label: m.status || '—', className: 'bg-gray-100 text-gray-800' };
                  const danses = dancesOf(m);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 text-sm text-gray-900 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{donorName(m)}</div>
                        <div className="text-gray-700">{donorEmail(m)}</div>
                        <div className="text-gray-700">{formatDate(m.createdAt)}</div>
                        <div className="text-gray-700">{m.stageName}</div>
                      </td>
                      <td className="px-4 py-3">{dancerNames(m).join(', ') || '—'}</td>
                      <td className="px-4 py-3">{danses.length > 0 ? danses.join(', ') : '—'}</td>
                      <td className="px-4 py-3">{MODE_LABELS[modeOf(m)] ?? (modeOf(m) || '—')}</td>
                      <td className="px-4 py-3 text-right font-semibold">{eur(m.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.coursesConfirmedAt ? (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            Confirmés
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                            Non confirmés
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bilan par danse</h2>
            <p className="text-sm text-gray-900 font-medium">
              Nombre de danseurs par niveau, pour les inscriptions non annulées dont les cours sont confirmés
            </p>
          </div>
          {dances.length === 0 ? (
            <p className="text-gray-900 font-medium">Aucune danse configurée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr className="text-left font-semibold text-gray-900">
                    <th className="px-4 py-3">Danse</th>
                    {levels.map((level) => (
                      <th key={level.id} className="px-4 py-3 text-right">
                        {level.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Pas de cours</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bilan.map((row) => (
                    <tr key={row.dance.id} className="text-gray-900">
                      <td className="px-4 py-3 font-semibold">{row.dance.name}</td>
                      {row.byLevel.map((count, i) => (
                        <td key={levels[i].id} className="px-4 py-3 text-right">
                          {count}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">{row.none}</td>
                      <td className="px-4 py-3 text-right font-bold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-900">
                  <tr className="text-gray-900 font-bold">
                    <td className="px-4 py-3">Total</td>
                    {bilanTotals.map((count, i) => (
                      <td key={levels[i].id} className="px-4 py-3 text-right">
                        {count}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">{bilanNone}</td>
                    <td className="px-4 py-3 text-right">
                      {bilanTotals.reduce((a, b) => a + b, 0) + bilanNone}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
