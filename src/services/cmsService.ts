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
import type { CMSPage } from '@/types/cms';

const CMS_COLLECTION = 'cmsPages';

export const getPageBySlug = async (slug: string): Promise<CMSPage | null> => {
  const q = query(
    collection(db, CMS_COLLECTION),
    where('slug', '==', slug),
    where('published', '==', true)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    content: data.content,
    published: data.published,
    metadata: data.metadata,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    publishedAt: data.publishedAt?.toDate?.(),
  };
};

export const getPage = async (pageId: string): Promise<CMSPage | null> => {
  const pageDoc = await getDoc(doc(db, CMS_COLLECTION, pageId));
  if (!pageDoc.exists()) return null;

  const data = pageDoc.data();
  return {
    id: pageDoc.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    content: data.content,
    published: data.published,
    metadata: data.metadata,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    publishedAt: data.publishedAt?.toDate?.(),
  };
};

export const getAllPages = async (): Promise<CMSPage[]> => {
  const snapshot = await getDocs(collection(db, CMS_COLLECTION));

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      content: data.content,
      published: data.published,
      metadata: data.metadata,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      publishedAt: data.publishedAt?.toDate?.(),
    };
  });
};

export const createPage = async (page: Omit<CMSPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<CMSPage> => {
  const pageId = doc(collection(db, CMS_COLLECTION)).id;
  const now = new Date();

  const { publishedAt, ...pageWithoutPublishedAt } = page;

  const newPage: CMSPage = {
    ...page,
    id: pageId,
    createdAt: now,
    updatedAt: now,
    publishedAt: page.published ? now : undefined,
  };

  const docData: any = {
    ...pageWithoutPublishedAt,
    createdAt: now,
    updatedAt: now,
  };

  if (page.published) {
    docData.publishedAt = now;
  }

  await setDoc(doc(db, CMS_COLLECTION, pageId), docData);

  return newPage;
};

export const updatePage = async (pageId: string, updates: Partial<Omit<CMSPage, 'id' | 'createdAt'>>): Promise<CMSPage> => {
  const page = await getPage(pageId);
  if (!page) throw new Error('Page not found');

  const now = new Date();
  const { publishedAt, ...updatesWithoutPublishedAt } = updates;

  const updatedPage = {
    ...page,
    ...updates,
    updatedAt: now,
    publishedAt: updates.published && !page.published ? now : page.publishedAt,
  };

  const docData: any = {
    ...updatesWithoutPublishedAt,
    updatedAt: now,
  };

  if (updates.published && !page.published) {
    docData.publishedAt = now;
  }

  await updateDoc(doc(db, CMS_COLLECTION, pageId), docData);

  return updatedPage;
};

export const deletePage = async (pageId: string): Promise<void> => {
  await deleteDoc(doc(db, CMS_COLLECTION, pageId));
};

export const autoSavePage = async (pageId: string, updates: any): Promise<void> => {
  console.log('autoSavePage called with pageId:', pageId);
  console.log('updates:', updates);

  const docData: any = {
    slug: updates.slug,
    title: updates.title,
    description: updates.description,
    published: updates.published,
    metadata: updates.metadata,
    content: updates.content,
    updatedAt: new Date(),
  };

  console.log('docData to save:', docData);

  try {
    await updateDoc(doc(db, CMS_COLLECTION, pageId), docData);
    console.log('updateDoc completed successfully');
  } catch (error) {
    console.error('updateDoc failed:', error);
    throw error;
  }
};
