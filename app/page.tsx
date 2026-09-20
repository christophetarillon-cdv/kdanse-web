export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold mb-4">Kdanse</h1>
        <p className="text-gray-600 mb-6">Site de réservation et paiement</p>
        <p className="text-sm text-gray-500">Phase 1 : Fondations ✅</p>
        <script>{`window.location.href = '/login';`}</script>
        <p className="mt-4 text-sm">Redirection vers la connexion...</p>
      </div>
    </div>
  );
}
