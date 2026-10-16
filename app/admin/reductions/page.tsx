'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { DiscountCode } from '@/types/cart';
import {
  getDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  normalizeDiscountCode,
} from '@/services/discountCodeService';

interface StageOption {
  id: string;
  name: string;
}

interface Draft {
  code: string;
  label: string;
  target: DiscountCode['target'];
  type: DiscountCode['type'];
  value: number;
  stageId: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  maxUses: string;
}

const emptyDraft: Draft = {
  code: '',
  label: '',
  target: 'stage',
  type: 'percent',
  value: 10,
  stageId: '',
  active: true,
  startsAt: '',
  endsAt: '',
  maxUses: '',
};

const formatDate = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR') : '—');

const toDraft = (d: DiscountCode): Draft => ({
  code: d.code,
  label: d.label,
  target: d.target,
  type: d.type,
  value: d.value,
  stageId: d.stageId,
  active: d.active,
  startsAt: d.startsAt ? d.startsAt.toISOString().slice(0, 10) : '',
  endsAt: d.endsAt ? d.endsAt.toISOString().slice(0, 10) : '',
  maxUses: d.maxUses === null ? '' : String(d.maxUses),
});

export default function AdminDiscountCodesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [authLoading, user, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codesData, stagesSnap] = await Promise.all([getDiscountCodes(), getDocs(collection(db, 'stages'))]);
      setCodes(codesData);
      setStages(stagesSnap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) ?? d.id })));
    } catch (error) {
      console.error('Error loading discount codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingCode(null);
  };

  const handleSave = async () => {
    const code = normalizeDiscountCode(draft.code);
    if (!code || !/^[A-Z0-9-]+$/.test(code)) {
      alert('Le code ne doit contenir que des lettres, chiffres et tirets');
      return;
    }
    if (!draft.label.trim()) {
      alert('Veuillez saisir un libellé');
      return;
    }
    if (!(draft.value > 0)) {
      alert('La valeur doit être supérieure à 0');
      return;
    }
    if (draft.type === 'percent' && draft.value > 100) {
      alert('Un pourcentage ne peut pas dépasser 100');
      return;
    }
    if (!draft.stageId) {
      alert('Veuillez choisir un stage');
      return;
    }
    if (!editingCode && codes.some((c) => c.code === code)) {
      alert('Ce code existe déjà');
      return;
    }

    const payload = {
      label: draft.label.trim(),
      target: draft.target,
      type: draft.type,
      value: Number(draft.value),
      stageId: draft.stageId,
      active: draft.active,
      startsAt: draft.startsAt ? new Date(`${draft.startsAt}T00:00:00`) : null,
      endsAt: draft.endsAt ? new Date(`${draft.endsAt}T23:59:59`) : null,
      maxUses: draft.maxUses.trim() === '' ? null : Number(draft.maxUses),
    };

    setSaving(true);
    try {
      if (editingCode) {
        await updateDiscountCode(editingCode, payload);
      } else {
        await createDiscountCode({ code, ...payload });
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving discount code:', error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (discount: DiscountCode) => {
    setEditingCode(discount.code);
    setDraft(toDraft(discount));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggle = async (discount: DiscountCode) => {
    try {
      await updateDiscountCode(discount.code, { active: !discount.active });
      await loadData();
    } catch (error) {
      console.error('Error toggling discount code:', error);
      alert('Erreur lors de la modification');
    }
  };

  const handleDelete = async (discount: DiscountCode) => {
    if (!window.confirm(`Supprimer le code ${discount.code} ? Les paniers qui l'ont appliqué ne seront plus réduits.`)) {
      return;
    }
    try {
      await deleteDiscountCode(discount.code);
      await loadData();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? id;
  const describeValue = (d: DiscountCode) => (d.type === 'percent' ? `${d.value} %` : `${d.value} €`);
  const describeTarget = (d: DiscountCode) => (d.target === 'stage' ? 'Cours' : 'Hébergement');

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  const inputClass = 'w-full border rounded px-4 py-2 text-gray-900';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🏷️ Codes promo</h1>
            <p className="text-gray-900 font-medium">
              Réductions sur les cours ou l&apos;hébergement, applicables à un seul stage
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
          <h2 className="text-xl font-bold text-gray-900">{editingCode ? `Modifier ${editingCode}` : 'Créer un code'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Code</label>
              <input
                type="text"
                value={draft.code}
                disabled={editingCode !== null}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="ETE2027"
                className={`${inputClass} disabled:bg-gray-100`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Libellé</label>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Réduction fidélité"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Stage</label>
              <select
                value={draft.stageId}
                onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
                className={inputClass}
              >
                <option value="">Choisir un stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Appliquée sur</label>
              <select
                value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: e.target.value as Draft['target'] })}
                className={inputClass}
              >
                <option value="stage">Cours</option>
                <option value="housing">Hébergement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Type</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft['type'] })}
                className={inputClass}
              >
                <option value="percent">Pourcentage</option>
                <option value="amount">Montant fixe (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Valeur {draft.type === 'percent' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                min={0}
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Valable à partir du</label>
              <input
                type="date"
                value={draft.startsAt}
                onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Valable jusqu&apos;au</label>
              <input
                type="date"
                value={draft.endsAt}
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Nombre d&apos;utilisations max</label>
              <input
                type="number"
                min={1}
                value={draft.maxUses}
                onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })}
                placeholder="Illimité"
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-gray-900">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Code actif
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-ink hover:bg-ink-soft text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingCode ? 'Enregistrer les modifications' : 'Créer le code'}
            </button>
            {editingCode && (
              <button onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold">
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {codes.length === 0 ? (
            <p className="p-8 text-center text-gray-900 font-medium">Aucun code promo</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr className="text-left font-semibold text-gray-900">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Réduction</th>
                  <th className="px-4 py-3">Validité</th>
                  <th className="px-4 py-3">Utilisations</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {codes.map((d) => (
                  <tr key={d.code} className="text-gray-900">
                    <td className="px-4 py-3 font-mono font-semibold">{d.code}</td>
                    <td className="px-4 py-3">{d.label}</td>
                    <td className="px-4 py-3">{stageName(d.stageId)}</td>
                    <td className="px-4 py-3">
                      {describeValue(d)} sur {describeTarget(d).toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      {d.startsAt || d.endsAt ? `${formatDate(d.startsAt)} → ${formatDate(d.endsAt)}` : 'Sans limite'}
                    </td>
                    <td className="px-4 py-3">
                      {d.usedCount} / {d.maxUses ?? '∞'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(d)}
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          d.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {d.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => handleEdit(d)} className="text-gold-deep underline mr-3">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(d)} className="text-red-600 underline">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
