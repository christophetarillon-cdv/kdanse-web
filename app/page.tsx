export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '448px'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#111827'
        }}>
          Kdanse
        </h1>
        <p style={{
          color: '#4b5563',
          marginBottom: '24px'
        }}>
          Site de réservation et paiement
        </p>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          Phase 1 : Fondations ✅
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '8px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Se connecter
        </a>
      </div>
    </div>
  );
}
