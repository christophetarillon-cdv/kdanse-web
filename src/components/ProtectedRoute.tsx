'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRoles && !requiredRoles.some(role => user.roles.includes(role as any))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Accès refusé</p>
      </div>
    );
  }

  return <>{children}</>;
}
