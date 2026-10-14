// Un stage est terminé quand sa date de fin est passée (le jour de fin reste ouvert).
// endDate est une chaîne AAAA-MM-JJ (saisie admin), un Timestamp Firestore ou une Date.
export const isStagePast = (endDate: unknown, now: Date = new Date()): boolean => {
  if (!endDate) return false;
  const value = endDate as { toDate?: () => Date };
  const end =
    typeof value.toDate === 'function'
      ? value.toDate()
      : typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
        ? new Date(`${endDate}T23:59:59`)
        : new Date(endDate as string | number | Date);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < now.getTime();
};
