import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Kdanse</h1>
        <p className="text-gray-600 mb-6">Site de réservation et paiement</p>
        <p className="text-sm text-gray-500 mb-8">Phase 1 : Fondations ✅</p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
