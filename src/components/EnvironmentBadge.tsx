'use client';

export function EnvironmentBadge() {
  const isDev = typeof window !== 'undefined' &&
    !window.location.hostname.includes('kdanse-booking-prod');

  if (!isDev) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
        DEV
      </span>
    </div>
  );
}
