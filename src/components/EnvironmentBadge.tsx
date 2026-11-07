'use client';

import { useEffect, useState } from 'react';

// Adresses de production : pas de badge. Partout ailleurs (local, previews
// Vercel) le badge « DEV » rappelle qu'on n'est pas sur le site public.
const PRODUCTION_HOSTS = ['inscription.stagededanse.net'];

export function EnvironmentBadge() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setIsDev(!PRODUCTION_HOSTS.includes(window.location.hostname));
  }, []);

  if (!isDev) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
        DEV
      </span>
    </div>
  );
}
