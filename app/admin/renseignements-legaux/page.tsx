'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { isValidPostalCode, isValidEmail, isValidPhone } from '@/lib/validation';

export const LEGAL_SETTINGS_PATH = 'legalSettings/club';

const LEGAL_FORMS = ['Association loi 1901', 'SARL', 'SAS', 'SASU', 'EURL', 'Entreprise individuelle', 'Autre'];

interface LegalSettings {
  raisonSociale: string;
  formeJuridique: string;
  siret: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
}

const EMPTY: LegalSettings = {
  raisonSociale: '',
  formeJuridique: LEGAL_FORMS[0],
  siret: '',
  street: '',
  postalCode: '',
  city: '',
  country: 'France',
  email: '',
  phone: '',
};

const isValidSiret = (value: string) => /^\d{14}$/.test(value.replace(/\s/g, ''));

export default function LegalSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<LegalSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, LEGAL_SETTINGS_PATH));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            raisonSociale: data.raisonSociale ?? '',
            formeJuridique: data.formeJuridique ?? LEGAL_FORMS[0],
            siret: data.siret ?? '',
            street: data.street ?? '',
            postalCode: data.postalCode ?? '',
            city: data.city ?? '',
            country: data.country ?? 'France',
            email: data.email ?? '',
            phone: data.phone ?? '',
          });
        }
      } catch (error) {
        console.error('Error loading legal settings:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, user, router]);

  const handleSave = async () => {
    if (!form.raisonSociale.trim() || !form.street.trim() || !form.city.trim()) {
      alert('La raison sociale, l’adresse et la ville sont obligatoires');
      return;
    }
    if (!isValidSiret(form.siret)) {
      alert('Le SIRET doit comporter 14 chiffres');
      return;
    }
    if (!isValidPostalCode(form.postalCode)) {
      alert('Le code postal doit comporter 4 ou 5 chiffres');
      return;
    }
    if (form.email.trim() && !isValidEmail(form.email)) {
      alert('Adresse email invalide');
      return;
    }
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      alert('Numéro de téléphone invalide');
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, LEGAL_SETTINGS_PATH),
        {
          ...form,
          raisonSociale: form.raisonSociale.trim(),
          siret: form.siret.replace(/\s/g, ''),
          street: form.street.trim(),
          postalCode: form.postalCode.trim(),
          city: form.city.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      alert('Renseignements enregistrés');
    } catch (error) {
      console.error('Error saving legal settings:', error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const inputClass = 'w-full border rounded px-3 py-2 text-gray-900';
  const update = (changes: Partial<LegalSettings>) => setForm({ ...form, ...changes });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🧾 Renseignements légaux</h1>
            <p className="text-gray-900 font-medium">
              Identité figurant sur les factures et attestations de paiement
            </p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
          >
            ← Accueil
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Raison sociale (nom du club)</label>
            <input type="text" value={form.raisonSociale} onChange={(e) => update({ raisonSociale: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Forme juridique</label>
              <select value={form.formeJuridique} onChange={(e) => update({ formeJuridique: e.target.value })} className={inputClass}>
                {LEGAL_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">SIRET (14 chiffres)</label>
              <input type="text" inputMode="numeric" maxLength={17} value={form.siret} onChange={(e) => update({ siret: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Adresse</label>
            <input type="text" value={form.street} onChange={(e) => update({ street: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Code postal</label>
              <input type="text" inputMode="numeric" maxLength={5} value={form.postalCode} onChange={(e) => update({ postalCode: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Ville</label>
              <input type="text" value={form.city} onChange={(e) => update({ city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Pays</label>
              <input type="text" value={form.country} onChange={(e) => update({ country: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Email (facultatif)</label>
              <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Téléphone (facultatif)</label>
              <input type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} className={inputClass} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-ink hover:bg-ink-soft text-white py-3 rounded font-semibold disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
