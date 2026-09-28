import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Menu, MenuItem } from '@/types/menu';

const MENU_COLLECTION = 'menus';

export const getMenu = async (menuId: string): Promise<Menu | null> => {
  const menuDoc = await getDoc(doc(db, MENU_COLLECTION, menuId));
  if (!menuDoc.exists()) return null;

  const data = menuDoc.data();
  return {
    id: menuDoc.id,
    name: data.name,
    items: data.items || [],
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  };
};

export const getMenuByName = async (name: string): Promise<Menu | null> => {
  const q = query(collection(db, MENU_COLLECTION), orderBy('name'));
  const snapshot = await getDocs(q);

  for (const doc of snapshot.docs) {
    if (doc.data().name === name) {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        items: data.items || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    }
  }
  return null;
};

export const getAllMenus = async (): Promise<Menu[]> => {
  const snapshot = await getDocs(
    query(collection(db, MENU_COLLECTION), orderBy('name'))
  );

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      items: data.items || [],
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  });
};

export const createMenu = async (name: string, items: MenuItem[] = []): Promise<Menu> => {
  const menuId = doc(collection(db, MENU_COLLECTION)).id;
  const now = new Date();

  const newMenu: Menu = {
    id: menuId,
    name,
    items,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, MENU_COLLECTION, menuId), {
    name,
    items,
    createdAt: now,
    updatedAt: now,
  });

  return newMenu;
};

export const updateMenu = async (
  menuId: string,
  items: MenuItem[]
): Promise<void> => {
  await updateDoc(doc(db, MENU_COLLECTION, menuId), {
    items,
    updatedAt: new Date(),
  });
};

export const deleteMenu = async (menuId: string): Promise<void> => {
  await deleteDoc(doc(db, MENU_COLLECTION, menuId));
};
