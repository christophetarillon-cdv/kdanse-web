export function cleanValue(value: any): any {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(cleanValue).filter(v => v !== undefined);
  if (typeof value === 'object') return cleanObject(value);
  return value;
}

export function cleanObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  return Object.fromEntries(
    Object.entries(obj)
      .map(([key, value]) => [key, cleanValue(value)])
      .filter(([, value]) => value !== undefined)
  );
}

export function cleanBlocks(blocks: any[]) {
  return blocks.map(block => cleanObject(block)).filter(b => b && Object.keys(b).length > 0);
}
