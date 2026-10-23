import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

export const startHelloAssoPayment = async (membershipIds: string[]): Promise<void> => {
  const callable = httpsCallable<{ membershipIds: string[]; origin: string }, { redirectUrl: string }>(
    getFunctions(app, 'europe-west3'),
    'createHelloAssoCheckout'
  );
  const result = await callable({ membershipIds, origin: window.location.origin });
  window.location.href = result.data.redirectUrl;
};
