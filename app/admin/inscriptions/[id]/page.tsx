'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { getDances, getLevels } from '@/services/coursesService';
import { getDiscountCode } from '@/services/discountCodeService';
import { updateMembershipDetails } from '@/services/membershipAdminService';
import { calculateItemPrice } from '@/services/cartService';
import { CartItem, ItemDiscount } from '@/types/cart';
import { Dance, Level } from '@/types/courses';

interface EditableDancer {
  firstName: string;
  lastName: string;
  licensed: boolean;
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const dancerLicensed = (d: DocumentData) => (typeof d.licensed === 'boolean' ? d.licensed : !!d.license?.active);

export default function EditMembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const membershipId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [stored, setStored] = useState<DocumentData | null>(null);
  const [stagePricing, setStagePricing] = useState<{ stage: CartItem['stagePrices']; housing: CartItem['housingPrices'] } | null>(null);
  const [discount, setDiscount] = useState<ItemDiscount | null>(null);
  const [dances, setDances] = useState<Dance[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);

  const [danceType, setDanceType] = useState<'solo' | 'couple'>('solo');
  const [dancers, setDancers] = useState<EditableDancer[]>([]);
  const [accompanists, setAccompanists] = useState(0);
  const [wantHousing, setWantHousing] = useState(false);
  const [housingSolo, setHousingSolo] = useState(0);
  const [housingCouple, setHousingCouple] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>[]>([]);

  const [refundAmount, setRefundAmount] = useState('0');
  const [refundDate, setRefundDate] = useState('');
  const [refundNote, setRefundNote] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'memberships', membershipId));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        const details = data.registrationDetails ?? {};
        const storedDancers: DocumentData[] = details.dancers ?? [];

        const [stageSnap, dancesData, levelsData, discountData, ...coursesSnaps] = await Promise.all([
          getDoc(doc(db, 'stages', data.stageId)),
          getDances(),
          getLevels(),
          data.discountCode ? getDiscountCode(data.discountCode) : Promise.resolve(null),
          ...storedDancers.map((_, i) => getDoc(doc(db, 'membershipCourses', `${membershipId}_dancer_${i}`))),
        ]);

        const pricing = stageSnap.data()?.pricing;
        setStagePricing(pricing?.stage && pricing?.housing ? { stage: pricing.stage, housing: pricing.housing } : null);
        setDiscount(
          discountData
            ? { code: discountData.code, target: discountData.target, type: discountData.type, value: discountData.value }
            : null
        );
        setDances(dancesData);
        setLevels(levelsData);

        setStored({ ...data, id: membershipId });
        const type: 'solo' | 'couple' = details.danceType === 'couple' ? 'couple' : 'solo';
        setDanceType(type);
        setDancers(
          storedDancers.map((d) => ({
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            licensed: dancerLicensed(d),
          }))
        );
        setAccompanists(Number(details.accompanists ?? 0));
        setWantHousing(!!details.wantHousing);
        setHousingSolo(Number(details.housingSolo ?? 0));
        setHousingCouple(Number(details.housingCouple ?? 0));
        setSelections(storedDancers.map((_, i) => ((coursesSnaps[i] as { data: () => DocumentData | undefined }).data()?.courses ?? {}) as Record<string, string>));
      } catch (error) {
        console.error('Error loading membership:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, user, router, membershipId]);

  const dancerCount = danceType === 'couple' ? 2 : 1;

  const changeDanceType = (type: 'solo' | 'couple') => {
    setDanceType(type);
    const count = type === 'couple' ? 2 : 1;
    setDancers((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? { firstName: '', lastName: '', licensed: false }));
    setSelections((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? {}));
  };

  const updateDancer = (index: number, changes: Partial<EditableDancer>) =>
    setDancers((prev) => prev.map((d, i) => (i === index ? { ...d, ...changes } : d)));

  const setSelection = (index: number, danceId: string, levelId: string) =>
    setSelections((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const next = { ...s };
        if (levelId) next[danceId] = levelId;
        else delete next[danceId];
        return next;
      })
    );

  const buildItem = (): CartItem | null => {
    if (!stored || !stagePricing) return null;
    return {
      id: membershipId,
      stageId: stored.stageId,
      stageName: stored.stageName,
      configuration: {
        danceType,
        dancers: dancers.slice(0, dancerCount).map((d) => ({ licensed: d.licensed })),
        accompanists,
        wantHousing,
        housingSolo,
        housingCouple,
      },
      stagePrices: stagePricing.stage,
      housingPrices: stagePricing.housing,
      quantity: 1,
      discount,
    };
  };

  const item = buildItem();
  const newTotals = item ? calculateItemPrice(item) : null;
  const oldAmount = Number(stored?.amount ?? 0);
  const newAmount = newTotals?.total ?? oldAmount;
  const delta = Math.round((newAmount - oldAmount) * 100) / 100;
  const hasPlan = !!stored?.paymentPlanId;

  useEffect(() => {
    if (delta < 0) setRefundAmount(String(-delta));
    else setRefundAmount('0');
  }, [delta]);

  const handleSave = async () => {
    if (!stored || !newTotals || !user) return;
    const incomplete = dancers.slice(0, dancerCount).some((d) => !d.firstName.trim() || !d.lastName.trim());
    if (incomplete) {
      alert('Veuillez renseigner le prénom et le nom de chaque danseur');
      return;
    }
    const refund = Number(refundAmount.replace(',', '.'));
    if (!(refund >= 0) || refund > Math.max(0, -delta)) {
      alert(`Le remboursement doit être compris entre 0 et ${eur(Math.max(0, -delta))}`);
      return;
    }

    const previousDetails = (stored.registrationDetails ?? {}) as Record<string, unknown>;
    const previousDancers: DocumentData[] = (previousDetails.dancers as DocumentData[]) ?? [];
    const nextDancers = dancers.slice(0, dancerCount).map((d, i) => ({
      ...(previousDancers[i] ?? {}),
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      licensed: d.licensed,
    }));

    const summary = [
      `Montant ${eur(oldAmount)} → ${eur(newAmount)}`,
      `Danse : ${danceType === 'couple' ? 'couple' : 'solo'}`,
      `Danseurs : ${nextDancers.map((d) => `${d.firstName} ${d.lastName}`).join(', ')}`,
      `Hébergement : ${wantHousing ? `${housingSolo} solo, ${housingCouple} couple` : 'non'}`,
      `Accompagnateurs : ${accompanists}`,
    ].join(' · ');

    setSaving(true);
    try {
      await updateMembershipDetails(membershipId, {
        registrationDetails: {
          ...previousDetails,
          danceType,
          dancers: nextDancers,
          accompanists,
          wantHousing,
          housingSolo: wantHousing ? housingSolo : 0,
          housingCouple: wantHousing ? housingCouple : 0,
        },
        amount: newAmount,
        discountAmount: newTotals.discount ?? 0,
        courses: nextDancers.map((d, index) => ({
          index,
          name: `${d.firstName} ${d.lastName}`,
          courses: selections[index] ?? {},
        })),
        refundAmount: refund,
        refundDate: refundDate || null,
        refundNote: refundNote.trim(),
        summary,
        adminId: user.id,
      });
      router.push('/admin/inscriptions');
    } catch (error) {
      console.error('Error updating membership:', error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  if (notFound || !stored) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-gray-900 font-medium">Inscription introuvable.</p>
        <Link href="/admin/inscriptions" className="text-gold-deep underline">
          ← Retour aux inscriptions
        </Link>
      </div>
    );
  }

  if (!stagePricing) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-gray-900 font-medium">Les tarifs du stage ne sont pas disponibles : modification impossible.</p>
        <Link href="/admin/inscriptions" className="text-gold-deep underline">
          ← Retour aux inscriptions
        </Link>
      </div>
    );
  }

  const inputClass = 'border rounded px-3 py-2 text-gray-900';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Modifier l&apos;inscription</h1>
            <p className="text-gray-900 font-medium">{stored.stageName}</p>
          </div>
          <Link
            href="/admin/inscriptions"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Inscriptions
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Danseurs et formule</h2>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Formule</label>
            <select value={danceType} onChange={(e) => changeDanceType(e.target.value as 'solo' | 'couple')} className={inputClass}>
              <option value="solo">Solo (1 danseur)</option>
              <option value="couple">Couple (2 danseurs)</option>
            </select>
          </div>
          {Array.from({ length: dancerCount }, (_, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Prénom danseur {i + 1}</label>
                <input
                  type="text"
                  value={dancers[i]?.firstName ?? ''}
                  onChange={(e) => updateDancer(i, { firstName: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Nom danseur {i + 1}</label>
                <input
                  type="text"
                  value={dancers[i]?.lastName ?? ''}
                  onChange={(e) => updateDancer(i, { lastName: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <label className="flex items-center gap-2 text-gray-900 pb-2">
                <input
                  type="checkbox"
                  checked={dancers[i]?.licensed ?? false}
                  onChange={(e) => updateDancer(i, { licensed: e.target.checked })}
                />
                Licencié FFDanse
              </label>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Accompagnateurs</label>
            <input
              type="number"
              min={0}
              value={accompanists}
              onChange={(e) => setAccompanists(Number(e.target.value))}
              className={`w-32 ${inputClass}`}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Hébergement</h2>
          <label className="flex items-center gap-2 text-gray-900">
            <input type="checkbox" checked={wantHousing} onChange={(e) => setWantHousing(e.target.checked)} />
            Hébergement demandé
          </label>
          {wantHousing && (
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Chambres 1 personne</label>
                <input type="number" min={0} value={housingSolo} onChange={(e) => setHousingSolo(Number(e.target.value))} className={`w-full ${inputClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Chambres 2 personnes</label>
                <input type="number" min={0} value={housingCouple} onChange={(e) => setHousingCouple(Number(e.target.value))} className={`w-full ${inputClass}`} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Cours</h2>
          {Array.from({ length: dancerCount }, (_, i) => (
            <div key={i} className="space-y-2">
              <p className="font-semibold text-gray-900">
                {dancers[i]?.firstName || `Danseur ${i + 1}`} {dancers[i]?.lastName}
              </p>
              {dances.map((dance) => (
                <div key={dance.id} className="flex items-center justify-between gap-3">
                  <span className="text-gray-900">{dance.name}</span>
                  <select
                    value={selections[i]?.[dance.id] ?? ''}
                    onChange={(e) => setSelection(i, dance.id, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Pas de cours</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Montant</h2>
          <div className="grid grid-cols-2 gap-2 text-gray-900 max-w-md">
            <span>Montant actuel</span>
            <span className="text-right font-semibold">{eur(oldAmount)}</span>
            <span>Nouveau montant</span>
            <span className="text-right font-semibold">{eur(newAmount)}</span>
            <span>Écart</span>
            <span className={`text-right font-semibold ${delta < 0 ? 'text-green-700' : delta > 0 ? 'text-orange-700' : ''}`}>
              {delta > 0 ? '+' : ''}
              {eur(delta)}
            </span>
          </div>
          {hasPlan && (
            <p className="text-sm text-orange-800 font-medium">
              Cette inscription fait partie d&apos;un échéancier : les échéances ne sont pas modifiées automatiquement. Ajustez-les sur la page Paiements.
            </p>
          )}
          {delta > 0 && (
            <p className="text-sm text-gray-900">Complément à régler par le client : {eur(delta)}</p>
          )}
          {delta < 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Remboursement (€)</label>
                <input type="text" inputMode="decimal" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className={`w-full ${inputClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Date</label>
                <input type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} className={`w-full ${inputClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Note</label>
                <input type="text" value={refundNote} onChange={(e) => setRefundNote(e.target.value)} className={`w-full ${inputClass}`} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-ink hover:bg-ink-soft text-white py-3 rounded font-semibold disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : "Enregistrer les modifications"}
          </button>
          <Link
            href="/admin/inscriptions"
            className="flex-1 text-center bg-gray-400 hover:bg-gray-500 text-white py-3 rounded font-semibold"
          >
            Annuler
          </Link>
        </div>
      </div>
    </div>
  );
}
