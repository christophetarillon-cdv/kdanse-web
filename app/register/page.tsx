'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { registerEmailIndex } from '@/services/userService';

// Création de compte hors commande : pour un danseur inscrit à un stage par quelqu'un d'autre.
// Le compte est relié à ses inscriptions par l'email (Cloud Function onUserCreatedSyncStageAccess
// dans kdanse-app). Il est validé dans l'app au premier paiement d'une commande où figure cet email,
// sinon par un admin. Pas de champ validated : l'app le traite comme un compte à valider.

const errorMessage = (code?: string) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cet email : connectez-vous.';
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    default:
      return 'Impossible de créer le compte. Réessayez dans un instant.';
  }
};

const inputClass =
  'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-gold focus:border-gold sm:text-sm';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const prenom = firstName.trim();
      const nom = lastName.trim();
      await setDoc(doc(db, 'users', user.uid), {
        email: cleanEmail,
        displayName: `${prenom} ${nom}`.trim(),
        prenom,
        nom,
        role: 'user',
        createdFrom: 'register',
        profile: { firstName: prenom, lastName: nom, dancers: [], lastUpdated: new Date() },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Un ancien index peut appartenir à un compte supprimé : la création reste valable sans lui
      await registerEmailIndex(user.uid, cleanEmail).catch((err) =>
        console.error('Error registering email index:', err)
      );
      setCreated(true);
    } catch (err) {
      setError(errorMessage((err as { code?: string }).code));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Compte créé</h2>
          <p className="text-gray-900">
            Vos inscriptions faites avec l&apos;adresse <strong>{email.trim().toLowerCase()}</strong> sont
            reliées à votre compte.
          </p>
          <p className="text-gray-700 text-sm">
            Votre accès à l&apos;application mobile s&apos;ouvre dès le premier paiement de votre inscription
            reçu. Vous pouvez déjà utiliser le site.
          </p>
          {/* Rechargement complet : le profil vient d'être créé, le contexte d'authentification doit le relire */}
          <a
            href="/dashboard"
            className="inline-block py-2 px-4 rounded-md text-sm font-medium text-white bg-ink hover:bg-ink-soft"
          >
            Accéder à mon espace
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Créer mon compte</h2>
          <p className="mt-2 text-center text-sm text-gray-700 font-medium">
            Vous avez été inscrit à un stage par une autre personne ? Utilisez l&apos;email donné lors de
            l&apos;inscription pour retrouver votre stage dans l&apos;application Kdanse.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-1">
                Prénom
              </label>
              <input
                id="firstName"
                autoComplete="given-name"
                required
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-1">
                Nom
              </label>
              <input
                id="lastName"
                autoComplete="family-name"
                required
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-900 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-ink hover:bg-ink-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>

          <p className="text-center text-sm text-gray-700">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-gray-900 underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
