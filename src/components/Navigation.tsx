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

  const renderItem = (item: any) => {
    const isExternal = item.url.startsWith('http');
    const link = isExternal ? (
      <a href={item.url} className="text-xs sm:text-base px-2 py-1 rounded whitespace-nowrap hover:text-blue-600 transition">
        {item.label}
      </a>
    ) : (
      <Link href={item.url} className="text-xs sm:text-base px-2 py-1 rounded whitespace-nowrap hover:text-blue-600 transition">
        {item.label}
      </Link>
    );

    if (!item.children || item.children.length === 0) {
      return link;
    }

    return (
      <div className="relative group">
        {link}
        <ul className="absolute left-0 mt-0 hidden group-hover:block bg-white shadow rounded min-w-48">
          {item.children.map((child: any) => (
            <li key={child.id} className="px-4 py-2 hover:bg-gray-100">
              {renderItem(child)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading || !menu) return null;

  const topLevelItems = menu.items.filter((item) => !item.parentId);

  return (
    <nav className={className}>
      <ul className="flex gap-6">
        {topLevelItems.map((item) => (
          <li key={item.id}>
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </nav>
  );
}
