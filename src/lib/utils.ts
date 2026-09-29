export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export function cleanBlocks(blocks: any[]) {
  return blocks.map((block) => cleanObject(block));
}
