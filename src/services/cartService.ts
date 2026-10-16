import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cart, CartItem, RegistrationConfiguration, CartTotals, DiscountCode, ItemDiscount } from '@/types/cart';
import { getDiscountCode, isDiscountUsable } from '@/services/discountCodeService';

const CART_COLLECTION = 'carts';
const CART_EXPIRY_HOURS = 24;

export const calculateItemPrice = (item: CartItem): CartTotals => {
  let stagePrice = 0;
  const { configuration, stagePrices, housingPrices } = item;

  // Calculate stage price
  if (configuration.danceType === 'solo') {
    stagePrice = configuration.dancers[0]?.licensed
      ? stagePrices.soloLicensed
      : stagePrices.soloUnlicensed;
  } else if (configuration.danceType === 'couple') {
    const d1Licensed = configuration.dancers[0]?.licensed;
    const d2Licensed = configuration.dancers[1]?.licensed;

    if (d1Licensed && d2Licensed) {
      stagePrice = stagePrices.coupleLicensed;
    } else if (!d1Licensed && !d2Licensed) {
      stagePrice = stagePrices.coupleUnlicensed;
    } else {
      stagePrice = stagePrices.coupleMixed;
    }
  }

  // Calculate housing price
  let housingTotal = 0;
  if (configuration.wantHousing) {
    housingTotal =
      configuration.housingSolo * housingPrices.solo +
      configuration.housingCouple * housingPrices.couple;
  }

  const stageDiscount = discountOn(stagePrice, item.discount, 'stage');
  const housingDiscount = discountOn(housingTotal, item.discount, 'housing');
  const discount = stageDiscount + housingDiscount;

  stagePrice -= stageDiscount;
  housingTotal -= housingDiscount;

  const subtotal = stagePrice + housingTotal;

  return {
    stageTotal: stagePrice,
    housingTotal,
    subtotal,
    tax: 0,
    total: subtotal,
    discount,
  };
};

const discountOn = (base: number, discount: ItemDiscount | null | undefined, target: 'stage' | 'housing') => {
  if (!discount || discount.target !== target || base <= 0) return 0;
  const raw = discount.type === 'percent' ? (base * discount.value) / 100 : discount.value;
  return Math.min(base, Math.round(raw * 100) / 100);
};

export const itemsWithDiscount = (items: CartItem[], discountCode: DiscountCode | null): CartItem[] =>
  items.map((item) => {
    const discount: ItemDiscount | null =
      discountCode && item.stageId === discountCode.stageId
        ? {
            code: discountCode.code,
            target: discountCode.target,
            type: discountCode.type,
            value: discountCode.value,
          }
        : null;
    const updated = { ...item, discount };
    updated.totals = calculateItemPrice(updated);
    return updated;
  });

export const calculateCartTotals = (items: CartItem[]): CartTotals => {
  let stageTotal = 0;
  let housingTotal = 0;
  let discount = 0;

  items.forEach((item) => {
    // Use cached totals if available, otherwise calculate
    const itemTotals = item.totals ?? calculateItemPrice(item);
    stageTotal += itemTotals.stageTotal;
    housingTotal += itemTotals.housingTotal;
    discount += itemTotals.discount ?? 0;
  });

  const subtotal = stageTotal + housingTotal;

  return {
    stageTotal,
    housingTotal,
    subtotal,
    tax: 0,
    total: subtotal,
    discount,
  };
};

export const createCart = async (userId: string, item: CartItem): Promise<Cart> => {
  const cartId = doc(collection(db, CART_COLLECTION)).id;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CART_EXPIRY_HOURS * 60 * 60 * 1000);

  // Ensure item has totals calculated
  if (!item.totals) {
    item.totals = calculateItemPrice(item);
  }

  const cart: Cart = {
    id: cartId,
    userId,
    status: 'pending',
    items: [item],
    totals: calculateCartTotals([item]),
    appliedCoupon: null,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await setDoc(doc(db, CART_COLLECTION, cartId), {
    ...cart,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  });

  return cart;
};

export const getCart = async (cartId: string): Promise<Cart | null> => {
  const cartDoc = await getDoc(doc(db, CART_COLLECTION, cartId));
  if (!cartDoc.exists()) return null;

  const data = cartDoc.data();
  return {
    id: cartDoc.id,
    userId: data.userId,
    status: data.status,
    items: data.items,
    totals: data.totals,
    appliedCoupon: data.appliedCoupon,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    expiresAt: data.expiresAt?.toDate?.() || new Date(),
  };
};

export const getUserCart = async (userId: string): Promise<Cart | null> => {
  const q = query(
    collection(db, CART_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const cartDoc = snapshot.docs[0];
  const data = cartDoc.data();

  return {
    id: cartDoc.id,
    userId: data.userId,
    status: data.status,
    items: data.items,
    totals: data.totals,
    appliedCoupon: data.appliedCoupon,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    expiresAt: data.expiresAt?.toDate?.() || new Date(),
  };
};

export const addToCart = async (
  userId: string,
  item: CartItem
): Promise<Cart> => {
  // Calculate item totals
  const itemTotals = calculateItemPrice(item);
  item.totals = itemTotals;

  // Check if user has existing pending cart
  let cart = await getUserCart(userId);

  if (!cart) {
    // Create new cart
    return createCart(userId, item);
  }

  // Check if item for same stage already exists
  const existingItemIndex = cart.items.findIndex((i) => i.stageId === item.stageId);

  if (existingItemIndex >= 0) {
    // Update existing item
    cart.items[existingItemIndex] = item;
  } else {
    // Add new item
    cart.items.push(item);
  }

  if (cart.appliedCoupon) {
    cart.items = itemsWithDiscount(cart.items, await getDiscountCode(cart.appliedCoupon));
  }

  // Update cart
  cart.totals = calculateCartTotals(cart.items);
  cart.updatedAt = new Date();

  await updateDoc(doc(db, CART_COLLECTION, cart.id), {
    items: cart.items,
    totals: cart.totals,
    updatedAt: cart.updatedAt,
  });

  return cart;
};

export const removeFromCart = async (cartId: string, itemId: string): Promise<Cart> => {
  const cart = await getCart(cartId);
  if (!cart) throw new Error('Cart not found');

  cart.items = cart.items.filter((item) => item.id !== itemId);
  cart.totals = calculateCartTotals(cart.items);
  cart.updatedAt = new Date();

  if (cart.items.length === 0) {
    // Delete cart if empty
    await deleteDoc(doc(db, CART_COLLECTION, cartId));
  } else {
    await updateDoc(doc(db, CART_COLLECTION, cartId), {
      items: cart.items,
      totals: cart.totals,
      updatedAt: cart.updatedAt,
    });
  }

  return cart;
};

export const updateCartItem = async (
  cartId: string,
  itemId: string,
  configuration: RegistrationConfiguration
): Promise<Cart> => {
  const cart = await getCart(cartId);
  if (!cart) throw new Error('Cart not found');

  const itemIndex = cart.items.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) throw new Error('Item not found in cart');

  cart.items[itemIndex].configuration = configuration;
  cart.items[itemIndex].totals = calculateItemPrice(cart.items[itemIndex]);
  cart.totals = calculateCartTotals(cart.items);
  cart.updatedAt = new Date();

  await updateDoc(doc(db, CART_COLLECTION, cartId), {
    items: cart.items,
    totals: cart.totals,
    updatedAt: cart.updatedAt,
  });

  return cart;
};

export const applyDiscountCodeToCart = async (cartId: string, code: string): Promise<Cart> => {
  const cart = await getCart(cartId);
  if (!cart) throw new Error('Cart not found');

  const discount = await getDiscountCode(code);
  if (!discount) throw new Error('Code promo inconnu');

  const matchingItem = cart.items.find((item) => item.stageId === discount.stageId);
  if (!matchingItem) throw new Error("Ce code promo ne s'applique à aucun stage de votre panier");

  const reason = isDiscountUsable(discount, matchingItem.stageId);
  if (reason) throw new Error(reason);

  cart.items = itemsWithDiscount(cart.items, discount);
  cart.totals = calculateCartTotals(cart.items);
  cart.appliedCoupon = discount.code;
  cart.updatedAt = new Date();

  await updateDoc(doc(db, CART_COLLECTION, cartId), {
    items: cart.items,
    totals: cart.totals,
    appliedCoupon: cart.appliedCoupon,
    updatedAt: cart.updatedAt,
  });

  return cart;
};

export const removeDiscountCodeFromCart = async (cartId: string): Promise<Cart> => {
  const cart = await getCart(cartId);
  if (!cart) throw new Error('Cart not found');

  cart.items = itemsWithDiscount(cart.items, null);
  cart.totals = calculateCartTotals(cart.items);
  cart.appliedCoupon = null;
  cart.updatedAt = new Date();

  await updateDoc(doc(db, CART_COLLECTION, cartId), {
    items: cart.items,
    totals: cart.totals,
    appliedCoupon: null,
    updatedAt: cart.updatedAt,
  });

  return cart;
};

export const submitCart = async (cartId: string): Promise<Cart> => {
  const cart = await getCart(cartId);
  if (!cart) throw new Error('Cart not found');

  cart.status = 'submitted';
  cart.updatedAt = new Date();

  await updateDoc(doc(db, CART_COLLECTION, cartId), {
    status: 'submitted',
    updatedAt: cart.updatedAt,
  });

  return cart;
};

export const clearCart = async (cartId: string): Promise<void> => {
  await deleteDoc(doc(db, CART_COLLECTION, cartId));
};

export const mergeGuestCartWithUserCart = async (
  guestCartId: string,
  authenticatedUserId: string
): Promise<Cart> => {
  // Get guest cart
  const guestCart = await getUserCart(guestCartId);
  if (!guestCart) {
    throw new Error('Guest cart not found');
  }

  // Get or create user's authenticated cart
  let userCart = await getUserCart(authenticatedUserId);

  if (!userCart) {
    if (guestCart.items.length === 0) {
      throw new Error('Guest cart has no items');
    }
    await updateDoc(doc(db, CART_COLLECTION, guestCart.id), { userId: authenticatedUserId });
    userCart = { ...guestCart, userId: authenticatedUserId };
  }

  // Merge items: add guest items to user cart (avoid duplicates for same stage)
  for (const guestItem of guestCart.items) {
    const existingItemIndex = userCart.items.findIndex((i) => i.stageId === guestItem.stageId);

    if (existingItemIndex >= 0) {
      // Replace with guest item (newer data)
      userCart.items[existingItemIndex] = guestItem;
    } else {
      // Add guest item
      userCart.items.push(guestItem);
    }
  }

  // Recalculate totals
  userCart.totals = calculateCartTotals(userCart.items);
  userCart.updatedAt = new Date();

  // Update user cart in Firestore
  await updateDoc(doc(db, CART_COLLECTION, userCart.id), {
    items: userCart.items,
    totals: userCart.totals,
    updatedAt: userCart.updatedAt,
  });

  if (guestCart.id !== userCart.id) {
    await clearCart(guestCart.id);
  }

  return userCart;
};
