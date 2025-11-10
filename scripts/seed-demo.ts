#!/usr/bin/env node
/*
  scripts/seed-demo.ts
  Seed demo data using the optional mock seeder. Never runs automatically.

  Usage:
    SEED_EXISTING=true CREATE_NEW=2 BATCHES=2 npm run seed:demo
*/

// Minimal interface to avoid any and DOM Storage dependency
interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

async function main() {
  // Minimal localStorage polyfill for Node execution
  const store = new Map<string, string>();
  // @ts-expect-error - Injecting a localStorage polyfill into Node's global scope for this script
  globalThis.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as LocalStorageLike;

  const { seedDemoData } = await import('../src/lib/mock/mockSeeders');
  const forExisting = String(process.env.SEED_EXISTING ?? 'true').toLowerCase();
  const createNew = Number(process.env.CREATE_NEW ?? '0');
  const batches = Number(process.env.BATCHES ?? '1');

  const opts = {
    forExistingStudents: !['0', 'false', 'no'].includes(forExisting),
    createNewStudents: Number.isFinite(createNew) ? createNew : 0,
    batchesPerStudent: Number.isFinite(batches) ? batches : 1,
  };

  const res = await seedDemoData(opts);

  console.log('[seed-demo] done', res);
}

main().catch((e) => {
  console.error('[seed-demo] failed', e);
  process.exit(1);
});
