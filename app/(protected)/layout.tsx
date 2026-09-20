'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { getAuth, signOut } from 'firebase/auth';

export const dynamic = 'force-dynamic';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
    }
  }, [loading, firebaseUser, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!firebaseUser) {
    return null;
  }

  const isAdmin = user?.roles?.includes('admin');

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Kdanse
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/stages" className="text-gray-700 hover:text-blue-600">
                Stages
              </Link>
              {isAdmin && (
                <>
                  <Link href="/admin/stages" className="text-gray-700 hover:text-blue-600">
                    Admin Stages
                  </Link>
                  <Link href="/admin/settings/page-permissions" className="text-gray-700 hover:text-blue-600">
                    Permissions
                  </Link>
                </>
              )}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={async () => {
                    const auth = getAuth();
                    await signOut(auth);
                    router.push('/login');
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  );
}
