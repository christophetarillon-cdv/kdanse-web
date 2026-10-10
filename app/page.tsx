'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function HomePage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [pendingPlansCount, setPendingPlansCount] = useState(0);

  useEffect(() => {
    if (firebaseUser && user?.roles?.includes('admin')) {
      fetchPendingPlans();
    }
  }, [firebaseUser, user]);

  const fetchPendingPlans = async () => {
    try {
      const q = query(
        collection(db, 'memberships'),
        where('status', '==', 'pending_plan')
      );
      const snapshot = await getDocs(q);
      setPendingPlansCount(snapshot.size);
    } catch (error) {
      console.error('Error fetching pending plans:', error);
    }
  };

  const isAdmin = user?.roles?.includes('admin');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9f7f4',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
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

        {/* Admin CTA */}
        {isAdmin && pendingPlansCount > 0 && (
          <div style={{
            backgroundColor: '#faf6ea',
            border: '2px solid #c9a84c',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#5f4b17',
              marginBottom: '12px',
              fontWeight: '500'
            }}>
              📋 {pendingPlansCount} plan{pendingPlansCount > 1 ? 's' : ''} de paiement à valider
            </p>
            <Link
              href="/admin/payment-plans-validation"
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Gérer les paiements →
            </Link>
          </div>
        )}

        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '8px 24px',
            backgroundColor: '#1a1a1a',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
