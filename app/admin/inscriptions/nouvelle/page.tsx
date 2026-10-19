'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { getDances, getLevels } from '@/services/coursesService';
import { createAdminMembership, Snapshot } from '@/services/membershipAdminService';
import { calculateItemPrice } from '@/services/cartService';
import { CartItem } from '@/types/cart';
import { Dance, Level } from '@/types/courses';

interface UserOption {
  id: string;
  email: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
  pricing: { stage: CartItem['stagePrices']; housing: CartItem['housingPrices'] } | null;
}

interface EditableDancer {
  firstName: string;
  lastName: string;
  licensed: boolean;
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const PAYMENT_LABELS: Record<string, string> = {
  cheque: 'Chèque',
  virement: 'Virement',
  helloasso: 'HelloAsso',
};

export default function NewAdminMembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [dances, setDances] = useState<Dance[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [donor, setDonor] = useState<UserOption | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', prenom: '', nom: '' });

  const [stageId, setStageId] = useState('');
  const [danceType, setDanceType] = useState<'solo' | 'couple'>('solo');
  const [dancers, setDancers] = useState<EditableDancer[]>([{ firstName: '', lastName: '', licensed: false }]);
  const [accompanists, setAccompanists] = useState(0);
  const [wantHousing, setWantHousing] = useState(false);
  const [housingSolo, setHousingSolo] = useState(0);
  const [housingCouple, setHousingCouple] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>[]>([{}]);

  const [paymentMethod, setPaymentMethod] = useState('cheque');
  const [alreadyReceived, setAlreadyReceived] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const [usersSnap, stagesSnap, dancesData, levelsData] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'stages')),
          getDances(),
          getLevels(),
        ]);
        setUsers(
          usersSnap.docs
            .map((d) => {
              const data: DocumentData = d.data();
              const name = [data.prenom ?? data.profile?.firstName, data.nom ?? data.profile?.lastName]
                .filter(Boolean)
                .join(' ');
              return { id: d.id, email: data.email ?? '', name };
            })
            .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
        );
        setStages(
          stagesSnap.docs.map((d) => {
            const pricing = d.data().pricing;
            return {
              id: d.id,
              name: (d.data().name as string) ?? d.id,
              pricing: pricing?.stage && pricing?.housing ? { stage: pricing.stage, housing: pricing.housing } : null,
            };
          })
        );
        setDances(dancesData);
        setLevels(levelsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, user, router]);

  const stage = stages.find((s) => s.id === stageId) ?? null;

  const matchingUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return users
      .filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(needle))
      .slice(0, 15);
  }, [search, users]);

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

  const total = useMemo(() => {
    if (!stage?.pricing) return 0;
    const item: CartItem = {
      id: 'new',
      stageId: stage.id,
      stageName: stage.name,
      configuration: {
        danceType,
        dancers: dancers.slice(0, dancerCount).map((d) => ({ licensed: d.licensed })),
        accompanists,
        wantHousing,
        housingSolo: wantHousing ? housingSolo : 0,
        housingCouple: wantHousing ? housingCouple : 0,
      },
      stagePrices: stage.pricing.stage,
      housingPrices: stage.pricing.housing,
      quantity: 1,
      discount: null,
    };
    return calculateItemPrice(item).total;
  }, [stage, danceType, dancers, dancerCount, accompanists, wantHousing, housingSolo, housingCouple]);

  const handleCreateAccount = async () => {
    const { email, password, prenom, nom } = newAccount;
    if (!email.includes('@') || password.length < 6 || !prenom.trim() || !nom.trim()) {
      alert('Email valide, prénom, nom et mot de passe (6 caractères minimum) sont requis');
      return;
    }
    try {
      const callable = httpsCallable<
        { email: string; password: string; prenom: string; nom: string },
        { uid: string }
      >(getFunctions(app, 'europe-west3'), 'adminCreateAccount');
      const result = await callable({ email, password, prenom, nom });
      const created = { id: result.data.uid, email: email.trim().toLowerCase(), name: `${prenom.trim()} ${nom.trim()}` };
      setDonor(created);
      setUsers((prev) => [...prev, created]);
      setCreatingAccount(false);
      setNewAccount({ email: '', password: '', prenom: '', nom: '' });
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      alert(
        code.includes('already-exists')
          ? 'Un compte existe déjà avec cet email : sélectionnez-le plutôt que de le recréer'
          : 'Erreur lors de la création du compte'
      );
    }
  };

  const handleSave = async () => {
    if (!donor || !stage?.pricing || !user) {
      alert('Veuillez choisir le donneur d’ordre et le stage');
      return;
    }
    if (dancers.slice(0, dancerCount).some((d) => !d.firstName.trim() || !d.lastName.trim())) {
      alert('Veuillez renseigner le prénom et le nom de chaque danseur');
      return;
    }
    const people = dancers.slice(0, dancerCount).map((d) => ({
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      licensed: d.licensed,
    }));
    const extras = {
      accompanists,
      wantHousing,
      housingSolo: wantHousing ? housingSolo : 0,
      housingCouple: wantHousing ? housingCouple : 0,
    };
    const snapshot: Snapshot = {
      amount: total,
      danceType,
      dancers: people.map((d) => `${d.firstName} ${d.lastName}${d.licensed ? ' (licencié)' : ''}`),
      accompanists: extras.accompanists,
      wantHousing: extras.wantHousing,
      housingSolo: extras.housingSolo,
      housingCouple: extras.housingCouple,
      paymentMethod,
      status: alreadyReceived ? 'paid' : 'pending_confirmation',
    };

    setSaving(true);
    try {
      await createAdminMembership({
        userId: donor.id,
        stageId: stage.id,
        stageName: stage.name,
        registrationDetails: {
          danceType,
          dancers: people,
          ...extras,
        },
        amount: total,
        paymentMethod,
        status: alreadyReceived ? 'paid' : 'pending_confirmation',
        courses: people.map((d, index) => ({
          index,
          name: `${d.firstName} ${d.lastName}`,
          courses: selections[index] ?? {},
        })),
        snapshot,
        summary: `Inscription saisie par l’admin · ${PAYMENT_LABELS[paymentMethod]} · ${alreadyReceived ? 'déjà reçu' : 'à confirmer'}`,
        adminId: user.id,
      });
      router.push('/admin/inscriptions');
    } catch (error) {
      console.error('Error creating membership:', error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const inputClass = 'border rounded px-3 py-2 text-gray-900';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nouvelle inscription</h1>
            <p className="text-gray-900 font-medium">Saisie pour un donneur d&apos;ordre existant ou nouveau</p>
          </div>
          <Link
            href="/admin/inscriptions"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Inscriptions
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">1. Donneur d&apos;ordre</h2>
          {donor ? (
            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded p-3">
              <span className="text-gray-900">
                <strong>{donor.name || donor.email}</strong> · {donor.email}
              </span>
              <button onClick={() => setDonor(null)} className="text-red-600 underline text-sm">
                Changer
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou email"
                className={`w-full ${inputClass}`}
              />
              {matchingUsers.length > 0 && (
                <ul className="divide-y border rounded">
                  {matchingUsers.map((u) => (
                    <li key={u.id} className="flex justify-between items-center px-3 py-2 text-gray-900">
                      <span>
                        {u.name || '(sans nom)'} · {u.email}
                      </span>
                      <button onClick={() => setDonor(u)} className="text-gold-deep underline text-sm">
                        Choisir
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!creatingAccount ? (
                <button onClick={() => setCreatingAccount(true)} className="text-gold-deep underline text-sm">
                  Créer un nouveau compte
                </button>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded p-4">
                  <input type="text" placeholder="Prénom" value={newAccount.prenom} onChange={(e) => setNewAccount({ ...newAccount, prenom: e.target.value })} className={inputClass} />
                  <input type="text" placeholder="Nom" value={newAccount.nom} onChange={(e) => setNewAccount({ ...newAccount, nom: e.target.value })} className={inputClass} />
                  <input type="email" placeholder="Email" value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} className={inputClass} />
                  <input type="text" placeholder="Mot de passe provisoire (6 caractères min.)" value={newAccount.password} onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} className={inputClass} />
                  <p className="sm:col-span-2 text-sm text-gray-900">
                    Communiquez ce mot de passe de vive voix : le titulaire devra le changer à sa première connexion.
                  </p>
                  <div className="sm:col-span-2 flex gap-3">
                    <button onClick={handleCreateAccount} className="bg-ink hover:bg-ink-soft text-white px-4 py-2 rounded font-semibold">
                      Créer le compte
                    </button>
                    <button onClick={() => setCreatingAccount(false)} className="text-gray-900 underline">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">2. Stage et danseurs</h2>
          <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={`w-full ${inputClass}`}>
            <option value="">Choisir un stage</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={danceType} onChange={(e) => changeDanceType(e.target.value as 'solo' | 'couple')} className={inputClass}>
            <option value="solo">Solo (1 danseur)</option>
            <option value="couple">Couple (2 danseurs)</option>
          </select>
          {Array.from({ length: dancerCount }, (_, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <input type="text" placeholder={`Prénom danseur ${i + 1}`} value={dancers[i]?.firstName ?? ''} onChange={(e) => updateDancer(i, { firstName: e.target.value })} className={inputClass} />
              <input type="text" placeholder={`Nom danseur ${i + 1}`} value={dancers[i]?.lastName ?? ''} onChange={(e) => updateDancer(i, { lastName: e.target.value })} className={inputClass} />
              <label className="flex items-center gap-2 text-gray-900 pb-2">
                <input type="checkbox" checked={dancers[i]?.licensed ?? false} onChange={(e) => updateDancer(i, { licensed: e.target.checked })} />
                Licencié FFDanse
              </label>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Accompagnateurs</label>
            <input type="number" min={0} value={accompanists} onChange={(e) => setAccompanists(Number(e.target.value))} className={`w-32 ${inputClass}`} />
          </div>
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

        {stage && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">3. Cours</h2>
            {Array.from({ length: dancerCount }, (_, i) => (
              <div key={i} className="space-y-2">
                <p className="font-semibold text-gray-900">{dancers[i]?.firstName || `Danseur ${i + 1}`} {dancers[i]?.lastName}</p>
                {dances.map((dance) => (
                  <div key={dance.id} className="flex items-center justify-between gap-3">
                    <span className="text-gray-900">{dance.name}</span>
                    <select value={selections[i]?.[dance.id] ?? ''} onChange={(e) => setSelection(i, dance.id, e.target.value)} className={inputClass}>
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
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">4. Paiement</h2>
          <p className="text-gray-900">
            Montant : <strong>{stage?.pricing ? eur(total) : '—'}</strong>
          </p>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-gray-900">
            <input type="checkbox" checked={alreadyReceived} onChange={(e) => setAlreadyReceived(e.target.checked)} />
            Le paiement est déjà reçu
          </label>
          <p className="text-sm text-gray-900">
            Sans case cochée, l&apos;inscription reste « à valider » jusqu&apos;à la réception du paiement.
          </p>
          <p className="text-sm text-orange-800 font-medium">
            Pour un échéancier, créez l&apos;inscription ici puis ajustez les échéances depuis la page Paiements.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !donor || !stage}
          className="w-full bg-ink hover:bg-ink-soft text-white py-3 rounded font-semibold disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : "Enregistrer l'inscription"}
        </button>
      </div>
    </div>
  );
}
