/// <reference types="node" />
import { PRAYER_METHODS, PRAYERS } from '@lawhi/shared';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ar from '@lawhi/i18n/ar.json';
import en from '@lawhi/i18n/en.json';
import fr from '@lawhi/i18n/fr.json';

type Tree = { [key: string]: string | Tree };

function has(tree: Tree, key: string): boolean {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return false;
    node = node[part];
  }
  return typeof node === 'string' && node.trim().length > 0;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

const locales = { ar, fr, en } as Record<string, Tree>;

describe('translations', () => {
  const files = [...sourceFiles(join(__dirname, '..')), join(__dirname, '..', '..', 'App.tsx')];
  const code = files.map((f) => readFileSync(f, 'utf8')).join('\n');

  it('defines every static key used in the code, in every language', () => {
    const keys = new Set<string>();
    for (const match of code.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(match[1]!);
    for (const match of code.matchAll(
      /'((?:quran|prayer|qibla|library|auth|errors|donations|common)\.[a-zA-Z0-9_.]+)'/g,
    )) {
      keys.add(match[1]!);
    }
    expect(keys.size).toBeGreaterThan(150);
    const missing = [...keys].flatMap((key) =>
      Object.entries(locales)
        .filter(([, tree]) => !has(tree, key))
        .map(([locale]) => `${locale}:${key}`),
    );
    expect(missing).toEqual([]);
  });

  it('covers every dynamic key family', () => {
    const dynamic = [
      ...PRAYERS.map((p) => `prayer.names.${p}`),
      'prayer.names.sunrise',
      ...PRAYER_METHODS.map((m) => `prayer.methods.${m.id}`),
      ...['pending', 'submitted', 'confirmed', 'rejected', 'cancelled'].flatMap((s) => [
        `donations.status.${s}`,
        `donations.statusHelp.${s}`,
      ]),
      ...[
        'causeId',
        'paymentMethodId',
        'amount',
        'currency',
        'donorName',
        'donorPhone',
        'reference',
      ].map((f) => `donations.errors.${f}`),
      ...['quran', 'prayer', 'qibla', 'adhkar', 'library', 'donations'].map(
        (s) => `home.shortcuts.${s}`,
      ),
      'quran.juzNumber',
      'quran.hizbNumber',
      'quran.rubNumber',
      'quran.revelation.makkah',
      'quran.revelation.madinah',
      'quran.riwaya.hafs',
      'quran.riwaya.warsh',
    ];
    for (const key of dynamic) {
      for (const [locale, tree] of Object.entries(locales)) {
        expect(`${locale}:${key}:${has(tree, key)}`).toBe(`${locale}:${key}:true`);
      }
    }
  });

  it('translates every error code the API can return', () => {
    const apiDir = join(__dirname, '..', '..', '..', 'api', 'src');
    const apiCode = sourceFiles(apiDir)
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const codes = new Set([...apiCode.matchAll(/error: '([a-z_]+)'/g)].map((m) => m[1]!));
    expect(codes.size).toBeGreaterThan(10);
    const missing = [...codes].filter(
      (c) => !has(fr as Tree, `errors.${c}`) && c !== 'validation_failed',
    );
    // Codes that only an admin can trigger are shown in the admin app, not here.
    const adminOnly = new Set([
      'cannot_review_own_donation',
      'enabled_method_requires_phone',
      'payment_method_not_found',
      'cause_not_found',
      'code_generation_failed',
      'category_not_found',
      'book_not_found',
      'chapter_not_found',
      'surah_not_found',
      'division_not_found',
      'bookmark_not_found',
      'verse_not_found',
      'database_unavailable',
      'proof_not_found',
    ]);
    expect(missing.filter((c) => !adminOnly.has(c))).toEqual([]);
  });
});
