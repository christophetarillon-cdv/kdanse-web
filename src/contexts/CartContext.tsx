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
  const [guestCartId, setGuestCartId] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    let userId: string | null = null;

    if (firebaseUser) {
      userId = firebaseUser.uid;
    } else if (guestCartId) {
      userId = guestCartId;
    }

    if (!userId) {
      setCart(null);
      setLoading(false);
      return;
    }

    try {
      const userCart = await getUserCart(userId);
      setCart(userCart);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, guestCartId]);

  useEffect(() => {
    // Réinitialiser le guestCartId quand l'utilisateur se connecte
    if (firebaseUser) {
      setGuestCartId(null);
    }
    refreshCart();
  }, [firebaseUser, refreshCart]);

  const addToCart = async (item: CartItem): Promise<Cart> => {
    // Permettre l'ajout au panier sans authentification
    // Pour les utilisateurs non-authentifiés, créer un cart ID temporaire
    let userId = firebaseUser?.uid;

    if (!userId) {
      userId = guestCartId || `guest-${Date.now()}`;
      setGuestCartId(userId);
    }

    try {
      const updatedCart = await addToCartService(userId, item);
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
