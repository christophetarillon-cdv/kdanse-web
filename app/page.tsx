export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <script>{`window.location.href = '/login';`}</script>
      <p>Redirection vers la page de connexion...</p>
    </div>
  );
}
