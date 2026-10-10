'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from './Navigation';
import { getConfig } from '@/services/configService';
import type { SiteConfig } from '@/types/config';

export default function Header() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configData = await getConfig();
        setConfig(configData);
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <header className="bg-ink text-cream shadow">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 flex justify-between items-center flex-wrap gap-1 sm:gap-4">
        <Link href="/" className="font-serif text-lg sm:text-2xl font-bold text-gold whitespace-nowrap tracking-wide">
          Kdanse
        </Link>
        {loading ? null : config?.headerMenuId && (
          <Navigation menuName="" menuId={config.headerMenuId} className="flex gap-1 sm:gap-6 flex-wrap justify-end" />
        )}
      </div>
    </header>
  );
}
