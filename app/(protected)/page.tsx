'use client';

import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Bienvenue {user?.displayName}
      </h1>
      <p className="text-gray-600">
        Ceci est le dashboard Kdanse. Phase 1 en construction.
      </p>
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Vos rôles : {user?.roles.join(', ')}
        </p>
      </div>
    </div>
  );
}
