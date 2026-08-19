import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NOW = new Date().toISOString();
const API_URL = process.env.IEN_API_URL || 'https://www.ien.edu.sa/api/MediaContent/GetMediaContents';
const SOURCE_URL = 'https://www.ien.edu.sa/?choice=2#/generalactivities/';

const STAGES = [
  { key: 1, id: 'lower', label: 'الأولية' },
  { key: 2, id: 'upper', label: 'العليا' },
  { key: 3, id: 'middle', label: 'المتوسطة' },
  { key: 4, id: 'secondary', label: 'الثانوية' }
];

const FIELDS = [
  { id: 1, label: 'العلوم والتقنية', categories: [111, 112, 113, 114] },
  { id: 2, label: 'المواطنة والحياة', categories: [221, 222, 223, 224] },
  { id: 3, label: 'الثقافة والفنون', categories: [331, 332, 333, 334] },
  { id: 4, label: 'النشاط الكشفي', categories: [411, 412, 413, 414] },
  { id: 5, label: 'الرياضة والصحة', categories: [511, 512, 513, 514] }
];

const CATEGORY_MAP = new Map();
for (const field of FIELDS) {
  field.categories.forEach((categoryId, index) => {
    CATEGORY_MAP.set(categoryId, { field, stage: STAGES[index] });
  });
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const isPdf = value => /\.pdf(?:$|[?#])/i.test(clean(value));

async function readPrevious() {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));
  } catch {
    return { items: [], lastSync: null };
  }
}

async function fetchCategory(categoryId) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'accept': 'application/json, text/plain, */*',
      'referer': SOURCE_URL,
      'user-agent': 'Mozilla/5.0 (compatible; iendalel-sync/1.0)'
    },
    body: JSON.stringify({ CategoryId: categoryId, StageId: '0' }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('IEN API returned a non-array payload');
  return data;
}

function normalizeItem(raw, categoryId) {
  const meta = CATEGORY_MAP.get(categoryId);
  if (!meta) return null;

  const pdfUrl = clean(raw?.downloadUrl) || clean(raw?.linkOrPath);
  if (!isPdf(pdfUrl)) return null;

  const title = clean(raw?.title);
  if (!title) return null;

  return {
    sourceId: raw?.id ?? null,
    categoryId,
    title,
    stage: meta.stage.label,
    stageId: meta.stage.id,
    field: meta.field.label,
    pdfUrl,
    thumbnail: clean(raw?.thumbnail) || null,
    sourceUrl: `https://www.ien.edu.sa/?choice=2#/generalactivitiespackages/${categoryId}`
  };
}

const previous = await readPrevious();
const previousItems = Array.isArray(previous.items) ? previous.items : [];
const succeeded = [];
const failed = [];
const freshByCategory = new Map();

for (const categoryId of CATEGORY_MAP.keys()) {
  try {
    const rawItems = await fetchCategory(categoryId);
    const items = rawItems.map(item => normalizeItem(item, categoryId)).filter(Boolean);
    freshByCategory.set(categoryId, items);
    succeeded.push({ categoryId, rawCount: rawItems.length, pdfCount: items.length });
    console.log(`IEN ${categoryId}: ${items.length}/${rawItems.length} PDF guides`);
  } catch (error) {
    failed.push({ categoryId, error: String(error?.message || error) });
    console.warn(`IEN ${categoryId} failed: ${error?.message || error}`);
  }
}

const merged = [];
for (const categoryId of CATEGORY_MAP.keys()) {
  if (freshByCategory.has(categoryId)) {
    merged.push(...freshByCategory.get(categoryId));
  } else {
    merged.push(...previousItems.filter(item => Number(item.categoryId) === categoryId));
  }
}

const seen = new Set();
const items = merged.filter(item => {
  const key = `${item.categoryId}|${item.title}|${item.pdfUrl}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).sort((a, b) => {
  const stageOrder = STAGES.findIndex(stage => stage.id === a.stageId) - STAGES.findIndex(stage => stage.id === b.stageId);
  if (stageOrder) return stageOrder;
  const fieldOrder = FIELDS.findIndex(field => field.label === a.field) - FIELDS.findIndex(field => field.label === b.field);
  if (fieldOrder) return fieldOrder;
  return a.title.localeCompare(b.title, 'ar');
});

const allSucceeded = failed.length === 0 && succeeded.length === CATEGORY_MAP.size;
const anySucceeded = succeeded.length > 0;
const output = {
  source: SOURCE_URL,
  api: API_URL,
  lastAttempt: NOW,
  lastSync: allSucceeded ? NOW : (previous.lastSync || (anySucceeded ? NOW : null)),
  syncStatus: allSucceeded ? 'ok' : (anySucceeded ? 'partial' : 'error'),
  categoryCount: CATEGORY_MAP.size,
  syncedCategoryCount: succeeded.length,
  failedCategoryCount: failed.length,
  items
};

const diagnostics = {
  attemptedAt: NOW,
  source: SOURCE_URL,
  api: API_URL,
  status: output.syncStatus,
  totalPdfGuides: items.length,
  succeeded,
  failed
};

await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'data', 'catalog.json'), JSON.stringify(output, null, 2), 'utf8');
await fs.writeFile(path.join(ROOT, 'data', 'catalog.js'), `window.IEN_CATALOG = ${JSON.stringify(output, null, 2)};\n`, 'utf8');
await fs.writeFile(path.join(ROOT, 'data', 'ien-diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8');

console.log(`IEN API sync complete: ${items.length} PDF guides; categories ${succeeded.length}/${CATEGORY_MAP.size}.`);
if (!anySucceeded) process.exitCode = 1;
