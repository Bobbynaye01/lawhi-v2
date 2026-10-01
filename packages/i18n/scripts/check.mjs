// Fails if a locale misses a key, has an extra key, an empty value, or
// mismatched {{interpolation}} variables compared with fr.json (reference).
import { readFileSync } from 'node:fs';

const load = (l) =>
  JSON.parse(readFileSync(new URL(`../locales/${l}.json`, import.meta.url), 'utf8'));
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
const vars = (s) =>
  [...s.matchAll(/{{(\w+)}}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

const reference = new Map(flatten(load('fr')));
let errors = 0;
for (const locale of ['ar', 'en']) {
  const entries = new Map(flatten(load(locale)));
  for (const [key, value] of reference) {
    const other = entries.get(key);
    if (other === undefined) {
      console.error(`${locale}: missing ${key}`);
      errors++;
      continue;
    }
    if (!String(other).trim()) {
      console.error(`${locale}: empty ${key}`);
      errors++;
    }
    if (vars(String(other)) !== vars(String(value))) {
      console.error(`${locale}: variables differ in ${key}`);
      errors++;
    }
  }
  for (const key of entries.keys())
    if (!reference.has(key)) {
      console.error(`${locale}: extra ${key}`);
      errors++;
    }
}
if (errors) process.exit(1);
console.warn(`i18n: ${reference.size} keys, ar/fr/en complete`);
