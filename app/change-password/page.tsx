'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export default function ChangePasswordPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !firebaseUser) router.push('/login');
  }, [loading, firebaseUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }
    const current = auth.currentUser;
    if (!current) return;
    setSaving(true);
    try {
      await updatePassword(current, password);
      await updateDoc(doc(db, 'users', current.uid), {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });
      router.push('/dashboard');
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === 'auth/requires-recent-login'
          ? 'Reconnectez-vous puis recommencez le changement de mot de passe'
          : 'Erreur lors du changement de mot de passe'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !firebaseUser) return <div className="p-8 text-gray-900">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Choisissez votre mot de passe</h1>
        <p className="text-gray-900">
          Un mot de passe provisoire vous a été communiqué. Merci de le remplacer par un mot de passe personnel avant de continuer.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-gray-900"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full border rounded px-3 py-2 text-gray-900"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-700 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ink hover:bg-ink-soft text-white py-3 rounded font-semibold disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Valider'}
          </button>
        </form>
      </div>
    </div>
  );
}
