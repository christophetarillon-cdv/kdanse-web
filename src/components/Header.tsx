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
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Kdanse
        </Link>
        {!loading && config?.headerMenuId && (
          <Navigation menuName="" menuId={config.headerMenuId} className="flex gap-6" />
        )}
      </div>
    </header>
  );
}
