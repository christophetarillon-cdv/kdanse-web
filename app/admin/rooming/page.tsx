'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  FieldPath,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { isStagePast } from '@/lib/stageDates';
import { capacityOf, RoomType } from '@/lib/rooming';
import {
  computeRooming,
  RoomingDoc,
  RoomingMembership,
  RoomingRow,
  RoomingSettings,
  roomingTotals,
} from '@/lib/roomingPlan';

interface StageOption {
  id: string;
  name: string;
  startDate?: string;
  endDate?: unknown;
}

const TABLES: { type: RoomType; title: string; tone: string }[] = [
  { type: 'double', title: 'Chambre COUPLE (lit double)', tone: 'bg-blue-50' },
  { type: 'twin', title: 'Chambre Twin (2 lits séparés)', tone: 'bg-amber-50' },
  { type: 'single', title: 'Chambre single (personne seule)', tone: 'bg-violet-50' },
];

const TYPE_SHORT: Record<RoomType, string> = { double: 'Lit double', twin: '2 lits', single: 'Single' };

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: 'paiement à recevoir',
  pending_plan: 'échéancier, aucune échéance reçue',
  pending_payment: 'paiement en ligne non abouti',
};

const toDate = (value: unknown): Date | undefined => {
  const v = value as { toDate?: () => Date } | undefined;
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (value instanceof Date) return value;
  return undefined;
};

export default function RoomingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-900">Chargement...</div>}>
      <Rooming />
    </Suspense>
  );
}

function Rooming() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<StageOption[]>([]);
  const [stageId, setStageId] = useState(searchParams.get('stage') ?? '');
  const [memberships, setMemberships] = useState<RoomingMembership[]>([]);
  const [receivedPlanIds, setReceivedPlanIds] = useState<Set<string>>(new Set());
  const [roomingDoc, setRoomingDoc] = useState<RoomingDoc>({});
  const [roomingError, setRoomingError] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<RoomingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    getDocs(collection(db, 'stages')).then((snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, name: (d.data().name as string) ?? d.id, startDate: d.data().startDate, endDate: d.data().endDate }))
        .sort((a, b) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')));
      setStages(list);
      // Par défaut : le prochain stage à venir
      setStageId((current) => current || (list.find((s) => !isStagePast(s.endDate)) ?? list[list.length - 1])?.id || '');
    });
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!stageId) return;
    setLoading(true);
    try {
      const [membershipSnap, installmentSnap] = await Promise.all([
        getDocs(query(collection(db, 'memberships'), where('stageId', '==', stageId))),
        getDocs(query(collection(db, 'paymentInstallments'), where('status', '==', 'received'))),
      ]);
      setMemberships(
        membershipSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            status: data.status,
            paymentPlanId: data.paymentPlanId ?? null,
            freeRole: data.freeRole,
            createdAt: toDate(data.createdAt),
            registrationDetails: data.registrationDetails,
          };
        })
      );
      setReceivedPlanIds(new Set(installmentSnap.docs.map((d) => d.data().paymentPlanId as string)));
      try {
        const snap = await getDoc(doc(db, 'rooming', stageId));
        const data = (snap.data() ?? {}) as RoomingDoc;
        setRoomingDoc(data);
        setSettingsForm(data.settings ?? {});
        setRoomingError(null);
      } catch (error) {
        console.error('Rooming doc:', error);
        setRoomingDoc({});
        setRoomingError('Les corrections et réglages du rooming ne sont pas accessibles (règles Firestore à déployer).');
      }
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    if (!authLoading && user?.roles?.includes('admin')) load();
  }, [authLoading, user, load]);

  const result = useMemo(
    () => computeRooming(memberships, receivedPlanIds, roomingDoc.overrides ?? {}),
    [memberships, receivedPlanIds, roomingDoc]
  );
  const totals = roomingTotals(result.rows);
  const contractRooms = roomingDoc.settings?.contractRooms ?? null;

  const saveOverride = async (row: RoomingRow, changes: { type?: RoomType; comment?: string | null }) => {
    const current = roomingDoc.overrides?.[row.id] ?? {};
    const next = { ...current };
    if (changes.type !== undefined) {
      if (changes.type === row.requestedType) delete next.type;
      else next.type = changes.type;
    }
    if (changes.comment !== undefined) {
      if (changes.comment === null) delete next.comment;
      else next.comment = changes.comment;
    }
    setSaving(row.id);
    try {
      const ref = doc(db, 'rooming', stageId);
      if (Object.keys(next).length === 0) {
        await updateDoc(ref, new FieldPath('overrides', row.id), deleteField()).catch(() => undefined);
      } else {
        await setDoc(ref, { overrides: { [row.id]: next } }, { merge: true });
      }
      const overrides = { ...(roomingDoc.overrides ?? {}) };
      if (Object.keys(next).length === 0) delete overrides[row.id];
      else overrides[row.id] = next;
      setRoomingDoc({ ...roomingDoc, overrides });
    } catch (error) {
      console.error(error);
      alert('Enregistrement impossible (règles Firestore du rooming déployées ?)');
    } finally {
      setSaving(null);
    }
  };

  const saveSettings = async () => {
    setSaving('settings');
    try {
      const settings: RoomingSettings = {
        groupName: settingsForm.groupName?.trim() ?? '',
        bookingRef: settingsForm.bookingRef?.trim() ?? '',
        stayLabel: settingsForm.stayLabel?.trim() ?? '',
        contractRooms: settingsForm.contractRooms ? Number(settingsForm.contractRooms) : null,
      };
      await setDoc(doc(db, 'rooming', stageId), { settings }, { merge: true });
      setRoomingDoc({ ...roomingDoc, settings });
    } catch (error) {
      console.error(error);
      alert('Enregistrement impossible (règles Firestore du rooming déployées ?)');
    } finally {
      setSaving(null);
    }
  };

  const inputClass = 'border rounded px-3 py-2 text-gray-900';

  if (authLoading) return <div className="p-8 text-gray-900">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rooming</h1>
            <p className="text-gray-900 font-medium">
              Chambres des inscriptions avec au moins un paiement validé, au format du centre d&apos;hébergement
            </p>
          </div>
          <Link href="/dashboard" className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold whitespace-nowrap">
            ← Tableau de bord
          </Link>
        </div>

        <select
          value={stageId}
          onChange={(e) => {
            setStageId(e.target.value);
            router.replace(`/admin/rooming?stage=${e.target.value}`);
          }}
          className={`w-full sm:w-auto ${inputClass} bg-white`}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {roomingError && <div className="bg-orange-50 border border-orange-300 text-orange-900 rounded p-3 text-sm">{roomingError}</div>}

        {loading ? (
          <p className="text-gray-900">Chargement…</p>
        ) : (
          <>
            {/* Totaux, comme en bas du fichier du centre */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['Lit double', totals.doubles],
                ['2 lits séparés', totals.twins],
                ['Single', totals.singles],
                ['Chambres', totals.rooms],
                ['Personnes', totals.people],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-700">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            {contractRooms !== null && contractRooms !== totals.rooms && (
              <div className="bg-orange-50 border border-orange-300 text-orange-900 rounded p-3 text-sm">
                {totals.rooms} chambres au rooming pour {contractRooms} prévues au contrat ({totals.rooms > contractRooms ? '+' : ''}
                {totals.rooms - contractRooms}).
              </div>
            )}

            {result.issues.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 space-y-2">
                <h2 className="font-bold text-gray-900">À vérifier ({result.issues.length})</h2>
                <ul className="text-sm text-gray-900 space-y-1">
                  {result.issues.map((issue, i) => (
                    <li key={i}>
                      <Link href={`/admin/inscriptions/${issue.membershipId}`} className="font-semibold underline">
                        {issue.label}
                      </Link>{' '}
                      · {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {TABLES.map((table) => {
              const rows = result.rows.filter((r) => r.type === table.type);
              const twoPeople = capacityOf(table.type) === 2;
              return (
                <div key={table.type} className="bg-white rounded-lg shadow overflow-hidden">
                  <h2 className={`font-bold text-gray-900 px-4 py-3 ${table.tone}`}>
                    {table.title} · {rows.length}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr className="text-left font-semibold text-gray-900">
                          <th className="px-3 py-2 w-10">#</th>
                          <th className="px-3 py-2">Civilité NOM Prénom</th>
                          {twoPeople && <th className="px-3 py-2">Civilité NOM Prénom</th>}
                          <th className="px-3 py-2">Commentaire pour le centre</th>
                          <th className="px-3 py-2">Type attribué</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((row, i) => (
                          <tr key={row.id} className={`text-gray-900 align-top ${row.staff ? 'bg-green-50' : ''}`}>
                            <td className="px-3 py-2 font-semibold">{i + 1}</td>
                            <td className="px-3 py-2">
                              <Link href={`/admin/inscriptions/${row.membershipId}`} className="hover:underline">
                                {row.names[0] ?? '—'}
                              </Link>
                            </td>
                            {twoPeople && <td className="px-3 py-2">{row.names[1] ?? <span className="text-gray-500">place libre</span>}</td>}
                            <td className="px-3 py-2 min-w-[14rem]">
                              <input
                                key={`${row.id}-${row.comment}`}
                                defaultValue={row.comment}
                                onBlur={(e) => {
                                  if (e.target.value !== row.comment) saveOverride(row, { comment: e.target.value });
                                }}
                                className={`w-full ${inputClass}`}
                              />
                              {row.memberComment && roomingDoc.overrides?.[row.id]?.comment !== undefined && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Demande de l&apos;inscrit : {row.memberComment} ·{' '}
                                  <button className="underline" onClick={() => saveOverride(row, { comment: null })}>
                                    reprendre
                                  </button>
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <select
                                value={row.type}
                                disabled={saving === row.id}
                                onChange={(e) => saveOverride(row, { type: e.target.value as RoomType })}
                                className={`${inputClass} bg-white`}
                              >
                                {(['double', 'twin', 'single'] as RoomType[])
                                  .filter((t) => capacityOf(t) >= row.names.length)
                                  .map((t) => (
                                    <option key={t} value={t}>
                                      {TYPE_SHORT[t]}
                                    </option>
                                  ))}
                              </select>
                              {row.type !== row.requestedType && (
                                <p className="text-xs text-orange-800 mt-1">Demandé : {TYPE_SHORT[row.requestedType]}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-gray-600">
                              Aucune chambre
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {result.pending.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 space-y-2">
                <h2 className="font-bold text-gray-900">Pas encore dans le rooming : aucun paiement validé ({result.pending.length})</h2>
                <ul className="text-sm text-gray-900 space-y-1">
                  {result.pending.map((p) => (
                    <li key={p.membershipId}>
                      <Link href={`/admin/inscriptions/${p.membershipId}`} className="underline">
                        {p.label}
                      </Link>{' '}
                      · {STATUS_LABELS[p.status] ?? p.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* En-tête du fichier du centre */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Réglages du séjour</h2>
              <p className="text-sm text-gray-700">Repris en haut du fichier envoyé au centre.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ['groupName', 'Groupe', 'Club de Danse de Voiron'],
                  ['bookingRef', 'N° de réservation', '50858-35576'],
                  ['stayLabel', 'Date du séjour', 'du 14/08 au 21/08/2027'],
                ].map(([key, label, placeholder]) => (
                  <label key={key} className="block">
                    <span className="block text-sm font-medium text-gray-900 mb-1">{label}</span>
                    <input
                      value={(settingsForm[key as keyof RoomingSettings] as string) ?? ''}
                      placeholder={placeholder}
                      onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.value })}
                      className={`w-full ${inputClass}`}
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="block text-sm font-medium text-gray-900 mb-1">Chambres prévues au contrat</span>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.contractRooms ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contractRooms: e.target.value === '' ? null : Number(e.target.value) })}
                    className={`w-full ${inputClass}`}
                  />
                </label>
              </div>
              <button
                onClick={saveSettings}
                disabled={saving === 'settings'}
                className="bg-ink hover:bg-ink-soft text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                {saving === 'settings' ? 'Enregistrement…' : 'Enregistrer les réglages'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
