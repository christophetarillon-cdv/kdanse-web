const stripSeparators = (value: string) => value.replace(/[\s.-]/g, '');

export const isValidPhone = (value: string) => /^\+?\d{8,15}$/.test(stripSeparators(value).replace(/[()]/g, ''));

export const isValidPostalCode = (value: string) => /^\d{4,5}$/.test(value.trim());

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isValidPassword = (value: string) => value.length >= 6;

export const isValidIban = (value: string) => /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value.replace(/\s/g, '').toUpperCase());

export const isValidBic = (value: string) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value.replace(/\s/g, '').toUpperCase());

export const isValidAmount = (value: number) =>
  Number.isFinite(value) && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
