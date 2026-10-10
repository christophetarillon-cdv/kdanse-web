'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { collection, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDances, getLevels } from '@/services/coursesService';
import { Dance, Level } from '@/types/courses';

type Courses = Record<string, string | null>;

interface StoredDancer {
  firstName?: string;
  lastName?: string;
  email?: string;
  licensed?: boolean;
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
  danceType: string;
  accompanists: number;
  wantHousing: boolean;
  housingSolo: number;
  housingCouple: number;
  dancers: StoredDancer[];
}

interface Installment {
  id: string;
  amount: number;
  dueDate: Date | null;
  method: string;
  status: string;
  receivedDate: Date | null;
}

interface Stage {
  startDate: Date | null;
  endDate: Date | null;
}

interface Donor {
  name: string;
  email: string;
  validated: boolean;
}

interface Payment {
  label: string;
  className: string;
}

interface DancerRow {
  key: string;
  index: number;
  membership: Membership;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  licensed: boolean;
  courses: Courses;
  danseCount: number;
  share: number;
  received: number;
  restant: number;
  installments: Installment[];
  mode: string;
  payment: Payment;
}

const MODE_LABELS: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  cheque_vacances: 'Chèque vacances',
  helloasso: 'HelloAsso',
  plan: 'Échéancier',
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

const toMembership = (id: string, data: DocumentData): Membership => {
  const details = data.registrationDetails ?? {};
  return {
    id,
    userId: data.userId ?? '',
    stageId: data.stageId ?? '',
    stageName: data.stageName ?? '',
    amount: Number(data.amount ?? 0),
    paymentMethod: data.paymentMethod ?? '',
    paymentPlanId: data.paymentPlanId ?? null,
    status: data.status ?? '',
    createdAt: toDate(data.createdAt),
    coursesConfirmedAt: toDate(data.coursesConfirmedAt),
    danceType: details.danceType ?? '',
    accompanists: Number(details.accompanists ?? 0),
    wantHousing: Boolean(details.wantHousing),
    housingSolo: Number(details.housingSolo ?? 0),
    housingCouple: Number(details.housingCouple ?? 0),
    dancers: details.dancers ?? [],
  };
};

const toInstallment = (id: string, data: DocumentData): Installment => ({
  id,
  amount: Number(data.amount ?? 0),
  dueDate: toDate(data.dueDate),
  method: data.method ?? '',
  status: data.status ?? '',
  receivedDate: toDate(data.receivedDate),
});

const paymentOf = (m: Membership, isPlan: boolean, total: number, received: number): Payment => {
  if (isPlan) {
    if (total === 0) return { label: 'Échéancier à valider', className: 'bg-gold-100 text-gold-ink' };
    if (received === total) return { label: 'Payé', className: 'bg-green-100 text-green-800' };
    if (received === 0) return { label: `0 échéance sur ${total}`, className: 'bg-gold-100 text-gold-ink' };
    return { label: `${received} échéance${received > 1 ? 's' : ''} sur ${total}`, className: 'bg-gold-100 text-gold-deep' };
  }
  if (m.status === 'paid') return { label: 'Payé', className: 'bg-green-100 text-green-800' };
  if (m.status === 'pending_confirmation') return { label: 'À confirmer', className: 'bg-gold-100 text-gold-ink' };
  if (m.status === 'pending_plan') return { label: 'Échéancier à valider', className: 'bg-gold-100 text-gold-ink' };
  return { label: 'Non payé', className: 'bg-gray-100 text-gray-800' };
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-2 border-b last:border-0">
      <span className="text-gray-700 font-medium">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}

export default function AdminDancersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [donors, setDonors] = useState<Record<string, Donor>>({});
  const [coursesByDancer, setCoursesByDancer] = useState<Record<string, Courses>>({});
  const [installmentsByPlan, setInstallmentsByPlan] = useState<Record<string, Installment[]>>({});
  const [stages, setStages] = useState<Record<string, Stage>>({});
  const [dances, setDances] = useState<Dance[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  const [stageFilter, setStageFilter] = useState('all');
  const [licenceFilter, setLicenceFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
      const [membershipsSnap, coursesSnap, installmentsSnap, stagesSnap, dancesData, levelsData] = await Promise.all([
        getDocs(collection(db, 'memberships')),
        getDocs(collection(db, 'membershipCourses')),
        getDocs(collection(db, 'paymentInstallments')),
        getDocs(collection(db, 'stages')),
        getDances(),
        getLevels(),
      ]);

      const list = membershipsSnap.docs
        .map((d) => toMembership(d.id, d.data()))
        .filter((m) => m.status !== 'cancelled');
      const userIds = [...new Set(list.map((m) => m.userId).filter(Boolean))];
      const donorEntries = await Promise.all(
        userIds.map(async (uid) => {
          const data = (await getDoc(doc(db, 'users', uid))).data();
          const donor: Donor = {
            name: [data?.prenom, data?.nom].filter(Boolean).join(' '),
            email: data?.email ?? '',
            validated: data?.validated === true,
          };
          return [uid, donor] as const;
        })
      );

      const grouped: Record<string, Installment[]> = {};
      installmentsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'cancelled' || !data.paymentPlanId) return;
        grouped[data.paymentPlanId] = [...(grouped[data.paymentPlanId] ?? []), toInstallment(d.id, data)];
      });

      setMemberships(list);
      setDonors(Object.fromEntries(donorEntries));
      setCoursesByDancer(
        Object.fromEntries(coursesSnap.docs.map((d) => [d.id, (d.data().courses ?? {}) as Courses]))
      );
      setInstallmentsByPlan(grouped);
      setStages(
        Object.fromEntries(
          stagesSnap.docs.map((d) => [
            d.id,
            { startDate: toDate(d.data().startDate), endDate: toDate(d.data().endDate) },
          ])
        )
      );
      setDances([...dancesData].sort((a, b) => a.order - b.order));
      setLevels([...levelsData].sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading danseurs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const donorName = (m: Membership) => donors[m.userId]?.name || 'Inconnu';
  const danceName = (id: string) => dances.find((d) => d.id === id)?.name ?? id;
  const levelName = (id: string) => levels.find((l) => l.id === id)?.name ?? id;

  const allRows: DancerRow[] = memberships
    .flatMap((m) => {
      const n = m.dancers.length || 1;
      const share = m.amount / n;
      const isPlan = Boolean(m.paymentPlanId) || m.paymentMethod === 'plan';
      const installments = [...(m.paymentPlanId ? installmentsByPlan[m.paymentPlanId] ?? [] : [])].sort(
        (a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)
      );
      const receivedCount = installments.filter((i) => i.status === 'received').length;
      const receivedPlan = installments
        .filter((i) => i.status === 'received')
        .reduce((sum, i) => sum + i.amount, 0);
      const methods = [...new Set(installments.map((i) => MODE_LABELS[i.method] ?? i.method))];
      const mode = isPlan
        ? ['Échéancier', methods.join(', ')].filter(Boolean).join(' · ')
        : MODE_LABELS[m.paymentMethod] ?? (m.paymentMethod || '—');
      const received = isPlan ? receivedPlan / n : m.status === 'paid' ? share : 0;
      const payment = paymentOf(m, isPlan, installments.length, receivedCount);

      return m.dancers.map((d, index) => {
        const courses = coursesByDancer[`${m.id}_dancer_${index}`] ?? {};
        const firstName = d.firstName ?? '';
        const lastName = d.lastName ?? '';
        return {
          key: `${m.id}_${index}`,
          index,
          membership: m,
          name: [firstName, lastName].filter(Boolean).join(' ') || `Danseur ${index + 1}`,
          firstName,
          lastName,
          email: d.email ?? '',
          licensed: Boolean(d.licensed),
          courses,
          danseCount: Object.values(courses).filter((level) => level && level !== 'none').length,
          share,
          received,
          restant: Math.max(share - received, 0),
          installments: installments.map((i) => ({ ...i, amount: i.amount / n })),
          mode,
          payment,
        };
      });
    })
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'));

  const stageOptions = [...new Map(memberships.filter((m) => m.stageId).map((m) => [m.stageId, m.stageName])).entries()];

  const needle = search.trim().toLowerCase();
  const rows = allRows.filter((r) => {
    if (stageFilter !== 'all' && r.membership.stageId !== stageFilter) return false;
    if (licenceFilter === 'yes' && !r.licensed) return false;
    if (licenceFilter === 'no' && r.licensed) return false;
    if (emailFilter === 'with' && !r.email) return false;
    if (emailFilter === 'without' && r.email) return false;
    if (needle) {
      const haystack = [
        r.name,
        r.email,
        donorName(r.membership),
        donors[r.membership.userId]?.email ?? '',
        r.membership.stageName,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const kpis = {
    count: rows.length,
    licensed: rows.filter((r) => r.licensed).length,
    noEmail: rows.filter((r) => !r.email).length,
    restant: rows.reduce((sum, r) => sum + r.restant, 0),
  };

  const selected = allRows.find((r) => r.key === selectedKey) ?? null;
  const selectedStage = selected ? stages[selected.membership.stageId] : undefined;
  const selectedOthers = selected
    ? selected.membership.dancers
        .filter((_, i) => i !== selected.index)
        .map((d) => [d.firstName, d.lastName].filter(Boolean).join(' '))
        .filter(Boolean)
    : [];

  const selectClass = 'border rounded px-3 py-2 text-sm text-gray-900 bg-white';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👤 Danseurs</h1>
            <p className="text-gray-900 font-medium">Un danseur par ligne, avec le détail de son inscription, de ses cours et de son paiement</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{kpis.count}</div>
            <div className="text-sm text-gray-900 font-medium">Danseurs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{kpis.licensed}</div>
            <div className="text-sm text-gray-900 font-medium">Licenciés FFDanse</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-700">{kpis.noEmail}</div>
            <div className="text-sm text-gray-900 font-medium">Sans email</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-700">{eur(kpis.restant)}</div>
            <div className="text-sm text-gray-900 font-medium">Restant à encaisser</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-center">
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous les stages</option>
            {stageOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select value={licenceFilter} onChange={(e) => setLicenceFilter(e.target.value)} className={selectClass}>
            <option value="all">Licence : tous</option>
            <option value="yes">Licenciés FFDanse</option>
            <option value="no">Non licenciés</option>
          </select>
          <select value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} className={selectClass}>
            <option value="all">Email : tous</option>
            <option value="with">Email renseigné</option>
            <option value="without">Sans email</option>
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email…"
            className="border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-500 flex-1 min-w-[200px]"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-x-auto">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-gray-900 font-medium">Aucun danseur ne correspond aux filtres</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr className="text-left text-sm font-semibold text-gray-900">
                    <th className="px-4 py-3">Danseur</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Licence</th>
                    <th className="px-4 py-3 text-right">Danses</th>
                    <th className="px-4 py-3">Paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr
                      key={r.key}
                      onClick={() => setSelectedKey(r.key)}
                      className={`cursor-pointer text-sm text-gray-900 align-top hover:bg-gold-50 ${
                        selectedKey === r.key ? 'bg-gold-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-gray-700">{r.membership.stageName}</div>
                      </td>
                      <td className="px-4 py-3">
                        {r.email || <span className="text-gray-700">Via le donneur d'ordre</span>}
                      </td>
                      <td className="px-4 py-3">{r.licensed ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-3 text-right">{r.danseCount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${r.payment.className}`}>
                          {r.payment.label}
                        </span>
                        <div className="text-gray-700 mt-1">{r.mode}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className="bg-white rounded-lg shadow p-6 lg:sticky lg:top-6">
            {!selected ? (
              <p className="text-gray-900 font-medium">Sélectionnez un danseur pour voir son détail</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-700">Donneur d'ordre : {donorName(selected.membership)}</p>
                </div>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Identité</h3>
                  <Field label="Email">{selected.email || 'Aucun, reçoit les mails via le donneur'}</Field>
                  <Field label="Licence FFDanse">{selected.licensed ? 'Oui' : 'Non'}</Field>
                  <Field label="Compte donneur">
                    {donors[selected.membership.userId]?.validated ? 'Validé' : 'Non validé'}
                  </Field>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Inscription</h3>
                  <Field label="Stage">{selected.membership.stageName}</Field>
                  <Field label="Dates">
                    {selectedStage?.startDate
                      ? `du ${formatDate(selectedStage.startDate)}${
                          selectedStage.endDate ? ` au ${formatDate(selectedStage.endDate)}` : ''
                        }`
                      : '—'}
                  </Field>
                  <Field label="Formule">
                    {selected.membership.danceType === 'solo'
                      ? 'Solo'
                      : selected.membership.danceType === 'couple'
                        ? `Couple${selectedOthers.length ? `, avec ${selectedOthers.join(', ')}` : ''}`
                        : '—'}
                  </Field>
                  <Field label="Hébergement">
                    {!selected.membership.wantHousing
                      ? 'Non'
                      : [
                          selected.membership.housingSolo > 0 ? `${selected.membership.housingSolo} solo` : '',
                          selected.membership.housingCouple > 0 ? `${selected.membership.housingCouple} couple` : '',
                        ]
                          .filter(Boolean)
                          .join(' + ') || 'Oui'}
                  </Field>
                  <Field label="Accompagnants">{selected.membership.accompanists}</Field>
                  <Field label="Inscription le">{formatDate(selected.membership.createdAt)}</Field>
                  <Field label="Cours validés">
                    {selected.membership.coursesConfirmedAt ? (
                      <span className="text-green-700 font-semibold">
                        {formatDate(selected.membership.coursesConfirmedAt)}
                      </span>
                    ) : (
                      <span className="text-orange-700 font-semibold">Non confirmés</span>
                    )}
                  </Field>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Cours</h3>
                  {dances.length === 0 ? (
                    <p className="text-sm text-gray-900">Aucune danse configurée</p>
                  ) : (
                    dances.map((dance) => {
                      const value = selected.courses[dance.id];
                      const text =
                        value === undefined || value === null
                          ? 'Non renseigné'
                          : value === 'none'
                            ? 'Pas de cours'
                            : levelName(value);
                      return (
                        <Field key={dance.id} label={danceName(dance.id)}>
                          {text}
                        </Field>
                      );
                    })
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Paiement</h3>
                  <p className="text-xs text-gray-700 mb-2">
                    Montant de l'inscription partagé entre les {selected.membership.dancers.length} danseur(s)
                  </p>
                  <Field label="Part du montant">
                    {eur(selected.share)} <span className="text-gray-700">(sur {eur(selected.membership.amount)})</span>
                  </Field>
                  <Field label="Mode">{selected.mode}</Field>
                  <Field label="Statut">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${selected.payment.className}`}>
                      {selected.payment.label}
                    </span>
                  </Field>
                  <Field label="Reçu">{eur(selected.received)}</Field>
                  <Field label="Restant">
                    <span className={selected.restant > 0 ? 'text-red-700 font-semibold' : 'text-green-700 font-semibold'}>
                      {eur(selected.restant)}
                    </span>
                  </Field>
                  {selected.installments.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm">
                      {selected.installments.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3">
                          <span className="text-gray-900">
                            {formatDate(i.dueDate)} · {MODE_LABELS[i.method] ?? i.method}
                          </span>
                          <span
                            className={
                              i.status === 'received' ? 'text-green-700 font-semibold' : 'text-gray-700'
                            }
                          >
                            {eur(i.amount)} · {i.status === 'received' ? `reçu le ${formatDate(i.receivedDate)}` : 'à recevoir'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
