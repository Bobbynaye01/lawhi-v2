/**
 * One-off migration tool: extracts the validated religious content of the
 * Flutter app (adhkar, ad'iya, library) into JSON seed files — byte for byte,
 * without any manual retyping.
 *
 *   node scripts/extract-flutter-content.mts <path-to-flutter-lawhi>
 *
 * It understands the subset of Dart used by those files: const declarations,
 * constructor calls with named arguments, lists, maps, string literals
 * (including adjacent-string concatenation and escapes), numbers and booleans.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Value =
  | string
  | number
  | boolean
  | null
  | Value[]
  | { [key: string]: Value }
  | { __call: string; args: Record<string, Value> }
  | { __ref: string };

type Token = { kind: 'str' | 'num' | 'id' | 'punct'; value: string; interpolated?: boolean };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c) || c === '\uFEFF') {
      i++;
    } else if (src.startsWith('//', i)) {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (src.startsWith('/*', i)) {
      i = src.indexOf('*/', i) + 2;
    } else if (c === "'" || c === '"') {
      const triple = src.startsWith(c.repeat(3), i);
      const quote = triple ? c.repeat(3) : c;
      i += quote.length;
      let out = '';
      let interpolated = false;
      while (!src.startsWith(quote, i)) {
        if (i >= src.length) throw new Error('Unterminated string');
        if (src[i] === '\\') {
          const n = src[i + 1]!;
          out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          i += 2;
        } else {
          if (src[i] === '$') interpolated = true;
          out += src[i];
          i++;
        }
      }
      i += quote.length;
      tokens.push({ kind: 'str', value: out, interpolated });
    } else if (/[0-9]/.test(c)) {
      const m = /^0x[0-9a-fA-F]+|^\d+(\.\d+)?/.exec(src.slice(i))!;
      tokens.push({ kind: 'num', value: m[0] });
      i += m[0].length;
    } else if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i))!;
      tokens.push({ kind: 'id', value: m[0] });
      i += m[0].length;
    } else {
      tokens.push({ kind: 'punct', value: c });
      i++;
    }
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private readonly tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }
  private next() {
    return this.tokens[this.pos++]!;
  }
  private expect(value: string) {
    const t = this.next();
    if (t.value !== value) throw new Error(`Expected "${value}", got "${t.value}"`);
  }

  /** Top-level `const|final [Type] name = expr;` declarations. */
  declarations(): Map<string, Value> {
    const out = new Map<string, Value>();
    while (this.pos < this.tokens.length) {
      const t = this.next();
      if (t.kind !== 'id' || (t.value !== 'const' && t.value !== 'final')) continue;
      // Skip an optional type (possibly generic) until `name =`.
      let name: string | null = null;
      while (this.pos < this.tokens.length) {
        const a = this.peek();
        const b = this.peek(1);
        if (a?.kind === 'id' && b?.value === '=') {
          name = a.value;
          this.pos += 2;
          break;
        }
        if (a?.value === ';' || a?.value === '(') break;
        this.pos++;
      }
      if (!name) continue;
      try {
        out.set(name, this.expr());
      } catch {
        // Not a data declaration (e.g. a widget field): ignore.
      }
    }
    return out;
  }

  expr(): Value {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end');
    if (t.kind === 'id' && t.value === 'const') {
      this.next();
      return this.expr();
    }
    if (t.kind === 'str') {
      let s = '';
      while (this.peek()?.kind === 'str') {
        const part = this.next();
        // Interpolated strings only occur in UI code, never in content data.
        if (part.interpolated) throw new Error('Interpolated string');
        s += part.value;
      }
      return s;
    }
    if (t.kind === 'num') return Number(this.next().value);
    if (t.value === '[') return this.list();
    if (t.value === '{') return this.map();
    if (t.value === '<') {
      // Generic type argument before a literal: <String, dynamic>{...}
      let depth = 0;
      do {
        const v = this.next().value;
        if (v === '<') depth++;
        if (v === '>') depth--;
      } while (depth > 0);
      return this.expr();
    }
    if (t.kind === 'id') {
      this.next();
      if (t.value === 'true' || t.value === 'false') return t.value === 'true';
      if (t.value === 'null') return null;
      let name = t.value;
      while (this.peek()?.value === '.' && this.peek(1)?.kind === 'id') {
        this.pos++;
        name += `.${this.next().value}`;
      }
      if (this.peek()?.value === '(') return { __call: name, args: this.args() };
      return { __ref: name };
    }
    throw new Error(`Unexpected token "${t.value}"`);
  }

  private list(): Value[] {
    this.expect('[');
    const items: Value[] = [];
    while (this.peek()?.value !== ']') {
      items.push(this.expr());
      if (this.peek()?.value === ',') this.next();
    }
    this.expect(']');
    return items;
  }

  private map(): Record<string, Value> {
    this.expect('{');
    const out: Record<string, Value> = {};
    while (this.peek()?.value !== '}') {
      const key = this.expr();
      this.expect(':');
      out[String(key)] = this.expr();
      if (this.peek()?.value === ',') this.next();
    }
    this.expect('}');
    return out;
  }

  private args(): Record<string, Value> {
    this.expect('(');
    const out: Record<string, Value> = {};
    let positional = 0;
    while (this.peek()?.value !== ')') {
      if (this.peek()?.kind === 'id' && this.peek(1)?.value === ':') {
        const key = this.next().value;
        this.next();
        out[key] = this.expr();
      } else {
        out[`_${positional++}`] = this.expr();
      }
      if (this.peek()?.value === ',') this.next();
    }
    this.expect(')');
    return out;
  }
}

function load(file: string): Map<string, Value> {
  return new Parser(tokenize(readFileSync(file, 'utf8'))).declarations();
}

function resolve(value: Value, scope: Map<string, Value>): Value {
  if (value && typeof value === 'object' && '__ref' in value) {
    const target = scope.get((value as { __ref: string }).__ref);
    return target === undefined ? value : resolve(target, scope);
  }
  if (Array.isArray(value)) return value.map((v) => resolve(v, scope));
  return value;
}

const callArgs = (v: Value) => (v as { args: Record<string, Value> }).args;
const str = (v: Value | undefined) => (typeof v === 'string' ? v : null);

// ─── Main ───────────────────────────────────────────────────────────────────

const flutterRoot = process.argv[2];
if (!flutterRoot) throw new Error('Usage: node scripts/extract-flutter-content.mts <flutter-project>');
const feat = join(flutterRoot, 'lib', 'features');
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'database', 'seed', 'data');

// Adhkar
const adhkarScope = load(join(feat, 'adhkar/presentation/adhkar_screen.dart'));
const adhkarCategories = [
  { id: 'morning', list: '_sabah', icon: 'sunny', titleFr: 'Adhkar du matin', titleEn: 'Morning adhkar' },
  { id: 'evening', list: '_masaa', icon: 'night', titleFr: 'Adhkar du soir', titleEn: 'Evening adhkar' },
  { id: 'sleep', list: '_nawm', icon: 'bed', titleFr: 'Adhkar du coucher', titleEn: 'Bedtime adhkar' },
  { id: 'prayer', list: '_salah', icon: 'mosque', titleFr: 'Adhkar de la prière', titleEn: 'Prayer adhkar' },
  { id: 'after-prayer', list: '_baadSalah', icon: 'sparkle', titleFr: 'Adhkar après la prière', titleEn: 'After-prayer adhkar' },
];
// `_data` maps each Arabic category title to its list: { 'أذكار الصباح': _sabah, ... }
const rawData = adhkarScope.get('_data') as Record<string, { __ref: string }>;
const titleByList = new Map(Object.entries(rawData).map(([title, ref]) => [ref.__ref, title]));
const adhkar = adhkarCategories.map((cat, index) => {
  const items = resolve({ __ref: cat.list }, adhkarScope) as Value[];
  return {
    id: cat.id,
    kind: 'adhkar',
    titleAr: titleByList.get(cat.list) ?? (() => { throw new Error(`No title for ${cat.list}`); })(),
    titleFr: cat.titleFr,
    titleEn: cat.titleEn,
    icon: cat.icon,
    sortOrder: index,
    items: items.map((item, i) => {
      const a = callArgs(item);
      return {
        id: `${cat.id}-${i + 1}`,
        sortOrder: i,
        title: null,
        arabicText: str(a.text)!,
        repetitions: a.repeat as number,
        source: str(a.source)!,
        virtue: str(a.virtue),
      };
    }),
  };
});

// Ad'iya
const adiyaScope = load(join(feat, 'adiya/presentation/adiya_screen.dart'));
const adiyaMeta: Record<string, { id: string; icon: string; titleFr: string; titleEn: string }> = {
  _quranAdiya: { id: 'quranic', icon: 'book', titleFr: 'Invocations coraniques', titleEn: 'Quranic supplications' },
  _karbAdiya: { id: 'distress', icon: 'heart', titleFr: 'Invocations de la détresse', titleEn: 'Supplications in distress' },
  _istikharaAdiya: { id: 'istikhara', icon: 'help', titleFr: 'Invocation de l’istikhara', titleEn: 'Istikhara supplication' },
  _safarAdiya: { id: 'travel', icon: 'plane', titleFr: 'Invocations du voyage', titleEn: 'Travel supplications' },
  _sihhahAdiya: { id: 'health', icon: 'healing', titleFr: 'Invocations pour la santé', titleEn: 'Supplications for health' },
  _mutanawwiahAdiya: { id: 'various', icon: 'hands', titleFr: 'Invocations diverses', titleEn: 'Various supplications' },
};
const adiyaCategories = adiyaScope.get('_categories') as Value[];
const adiya = adiyaCategories.map((raw, index) => {
  const cat = raw as Record<string, Value>;
  const listName = (cat.items as { __ref: string }).__ref;
  const meta = adiyaMeta[listName];
  if (!meta) throw new Error(`Unknown ad'iya list ${listName}`);
  const items = resolve({ __ref: listName }, adiyaScope) as Record<string, Value>[];
  return {
    id: `dua-${meta.id}`,
    kind: 'dua',
    titleAr: str(cat.title)!,
    titleFr: meta.titleFr,
    titleEn: meta.titleEn,
    icon: meta.icon,
    sortOrder: index,
    items: items.map((item, i) => ({
      id: `dua-${meta.id}-${i + 1}`,
      sortOrder: i,
      title: str(item.title),
      arabicText: str(item.arabic)!,
      repetitions: 1,
      source: str(item.source)!,
      virtue: null,
    })),
  };
});

// Library — PDF catalogue
const pdfScope = load(join(feat, 'library/data/pdf_books_data.dart'));
const pdfBooks = (pdfScope.get('pdfBooks') as Value[]).map((book, index) => {
  const a = callArgs(book);
  return {
    id: str(a.id)!,
    titleAr: str(a.title)!,
    authorAr: str(a.author)!,
    category: str(a.category),
    pdfUrl: str(a.downloadUrl)!,
    estimatedSizeMB: a.estimatedSizeMB as number,
    sortOrder: index,
  };
});

// Library — text books (selected entries)
const textBooks = [
  ['hisn_data.dart', 'hisnMuslimBook'],
  ['nawawi_data.dart', 'nawawi40Book'],
] as [string, string][];
const otherScope = load(join(feat, 'library/data/other_books_data.dart'));
for (const [name, value] of otherScope) {
  if (value && typeof value === 'object' && '__call' in value && value.__call === 'IslamicBook') {
    textBooks.push(['other_books_data.dart', name]);
  }
}
const texts = textBooks.map(([file, symbol], index) => {
  const scope = load(join(feat, 'library/data', file));
  const book = scope.get(symbol);
  if (!book) throw new Error(`Missing ${symbol} in ${file}`);
  const a = callArgs(book);
  const chapters = resolve(a.chapters!, scope) as Value[];
  return {
    id: str(a.id)!,
    titleAr: str(a.title)!,
    authorAr: str(a.author)!,
    description: str(a.description)!,
    isExcerpt: a.isComplete !== true,
    sortOrder: index,
    chapters: chapters.map((chapter, ci) => {
      const c = callArgs(chapter);
      return {
        id: str(c.id)!,
        title: str(c.title)!,
        sortOrder: ci,
        entries: (resolve(c.entries!, scope) as Value[]).map((entry) => {
          const e = callArgs(entry);
          return {
            id: str(e.id)!,
            number: e.number as number,
            text: str(e.text)!,
            narrator: str(e.narrator),
            reference: str(e.reference),
          };
        }),
      };
    }),
  };
});

const counts = {
  adhkarCategories: adhkar.length,
  adhkar: adhkar.reduce((n, c) => n + c.items.length, 0),
  adiyaCategories: adiya.length,
  adiya: adiya.reduce((n, c) => n + c.items.length, 0),
  pdfBooks: pdfBooks.length,
  textBooks: texts.length,
  textEntries: texts.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.entries.length, 0), 0),
};
const header = { source: 'Lawhi Flutter app (lib/features), extracted verbatim', extractedAt: '2026-10-01' };
writeFileSync(join(outDir, 'adhkar.json'), JSON.stringify({ ...header, categories: [...adhkar, ...adiya] }, null, 1));
writeFileSync(join(outDir, 'library.json'), JSON.stringify({ ...header, pdfBooks, textBooks: texts }, null, 1));
console.warn(JSON.stringify(counts));
