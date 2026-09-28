import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadImage = async (file: File, path: string = 'cms-images'): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('L\'image ne doit pas dépasser 5MB');
  }

  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storageRef = ref(storage, `${path}/${filename}`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return url;
};
