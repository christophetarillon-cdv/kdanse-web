'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '@/lib/firebase';

// Arrivée depuis l'app mobile : /auth/app?code=…&next=/stages
// Le code à usage unique (2 min) est échangé contre un jeton de connexion par
// la Cloud Function exchangeWebLoginCode, puis on redirige vers `next`.

const safeNext = (raw: string | null) =>
  raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\') ? raw : '/dashboard';

function AppLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);
  const started = useRef(false);

  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  useEffect(() => {
    // Un seul échange : le code est consommé au premier appel
    if (started.current) return;
    started.current = true;

    if (!code) {
      setError(true);
      return;
    }
    (async () => {
      try {
        const exchange = httpsCallable<{ code: string }, { token: string }>(
          getFunctions(app, 'europe-west3'),
          'exchangeWebLoginCode'
        );
        const { data } = await exchange({ code });
        // Une autre personne était peut-être connectée sur ce navigateur
        if (auth.currentUser) await signOut(auth);
        await signInWithCustomToken(auth, data.token);
        router.replace(next);
      } catch {
        setError(true);
      }
    })();
  }, [code, next, router]);

  if (error) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Lien expiré</h1>
        <p className="text-gray-700">
          Ce lien de connexion n&apos;est plus valable. Retourne dans l&apos;app Kdanse et touche
          à nouveau le bouton, ou connecte-toi avec ton e-mail et ton mot de passe.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(next)}`}
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-white"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return <Loading />;
}

function Loading() {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      <p className="text-gray-900">Connexion en cours…</p>
    </div>
  );
}

export default function AppLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <Suspense fallback={<Loading />}>
          <AppLogin />
        </Suspense>
      </div>
    </div>
  );
}
