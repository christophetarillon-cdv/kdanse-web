'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserCart, addToCart as addToCartService, removeFromCart as removeFromCartService } from '@/services/cartService';
import { Cart, CartItem } from '@/types/cart';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (item: CartItem) => Promise<Cart>;
  removeFromCart: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    if (!firebaseUser) {
      setCart(null);
      setLoading(false);
      return;
    }

    try {
      const userCart = await getUserCart(firebaseUser.uid);
      setCart(userCart);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    refreshCart();
  }, [firebaseUser, refreshCart]);

  const addToCart = async (item: CartItem): Promise<Cart> => {
    if (!firebaseUser) throw new Error('User not authenticated');

    try {
      const updatedCart = await addToCartService(firebaseUser.uid, item);
      setCart(updatedCart);
      return updatedCart;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = async (itemId: string): Promise<void> => {
    if (!cart) return;

    try {
      const updatedCart = await removeFromCartService(cart.id, itemId);
      if (updatedCart.items.length === 0) {
        setCart(null);
      } else {
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}
