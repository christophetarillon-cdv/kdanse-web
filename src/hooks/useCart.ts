import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getUserCart } from '@/services/cartService';
import { Cart } from '@/types/cart';

export const useCart = () => {
  const { firebaseUser } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setCart(null);
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        const userCart = await getUserCart(firebaseUser.uid);
        setCart(userCart);
      } catch (error) {
        console.error('Error fetching cart:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [firebaseUser]);

  return { cart, loading };
};
