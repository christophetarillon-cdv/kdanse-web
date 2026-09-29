'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMenuByName, getMenu } from '@/services/menuService';
import type { Menu } from '@/types/menu';

interface NavigationProps {
  menuName?: string;
  menuId?: string;
  className?: string;
}

export default function Navigation({ menuName, menuId, className = '' }: NavigationProps) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        let menuData: Menu | null = null;

        if (menuId) {
          menuData = await getMenu(menuId);
        } else if (menuName) {
          menuData = await getMenuByName(menuName);
        }

        setMenu(menuData);
      } catch (error) {
        console.error('Error loading menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [menuName, menuId]);

  if (loading || !menu) return null;

  return (
    <nav className={className}>
      <ul className="flex gap-6">
        {menu.items.map((item) => (
          <li key={item.id}>
            {item.url.startsWith('http') ? (
              <a
                href={item.url}
                className="hover:text-blue-600 transition"
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.url} className="hover:text-blue-600 transition">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
