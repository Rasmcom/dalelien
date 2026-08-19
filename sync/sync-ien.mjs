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

const EXTRACURRICULAR_FIELD = 'الفترات اللاصفية';
const PERIODS = [
  { id: 71, label: 'الحضور والاصطفاف الصباحي', categories: [711, 712, 713, 714] },
  { id: 72, label: 'الروتين اليومي', categories: [721, 722, 723, 724] },
  { id: 73, label: 'صلاة الظهر والمناوبة', categories: [731, 732, 733, 734] }
];

const CATEGORY_MAP = new Map();
for (const field of FIELDS) {
  field.categories.forEach((categoryId, index) => {
    CATEGORY_MAP.set(categoryId, { kind: 'field', field, stage: STAGES[index], period: null });
  });
}
for (const period of PERIODS) {
  period.categories.forEach((categoryId, index) => {
    CATEGORY_MAP.set(categoryId, {
      kind: 'period',
      field: { id: 7, label: EXTRACURRICULAR_FIELD },
      stage: STAGES[index],
      period
    });
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
    contentType: meta.kind,
    title,
    stage: meta.stage.label,
    stageId: meta.stage.id,
    field: meta.field.label,
    period: meta.period?.label || null,
    periodId: meta.period?.id || null,
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

  const fieldIndexA = a.field === EXTRACURRICULAR_FIELD ? FIELDS.length : FIELDS.findIndex(field => field.label === a.field);
  const fieldIndexB = b.field === EXTRACURRICULAR_FIELD ? FIELDS.length : FIELDS.findIndex(field => field.label === b.field);
  if (fieldIndexA !== fieldIndexB) return fieldIndexA - fieldIndexB;

  if (a.field === EXTRACURRICULAR_FIELD && b.field === EXTRACURRICULAR_FIELD) {
    const periodOrder = PERIODS.findIndex(period => period.label === a.period) - PERIODS.findIndex(period => period.label === b.period);
    if (periodOrder) return periodOrder;
  }

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
  extracurricularPeriods: PERIODS.map(({ id, label }) => ({ id, label })),
  items
};

const diagnostics = {
  attemptedAt: NOW,
  source: SOURCE_URL,
  api: API_URL,
  status: output.syncStatus,
  totalPdfGuides: items.length,
  extracurricularPdfGuides: items.filter(item => item.field === EXTRACURRICULAR_FIELD).length,
  succeeded,
  failed
};

const addonLoader = `\n(function(){\n  const load=()=>{\n    if(!document.querySelector('link[data-ien-extracurricular]')){\n      const css=document.createElement('link');css.rel='stylesheet';css.href='extracurricular.css?v=20260819-1';css.dataset.ienExtracurricular='1';document.head.appendChild(css);\n    }\n    if(!document.querySelector('script[data-ien-extracurricular]')){\n      const script=document.createElement('script');script.src='extracurricular.js?v=20260819-1';script.dataset.ienExtracurricular='1';document.body.appendChild(script);\n    }\n  };\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else setTimeout(load,0);\n})();\n`;

await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'data', 'catalog.json'), JSON.stringify(output, null, 2), 'utf8');
await fs.writeFile(path.join(ROOT, 'data', 'catalog.js'), `window.IEN_CATALOG = ${JSON.stringify(output, null, 2)};\n${addonLoader}`, 'utf8');
await fs.writeFile(path.join(ROOT, 'data', 'ien-diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8');

console.log(`IEN API sync complete: ${items.length} PDF guides; categories ${succeeded.length}/${CATEGORY_MAP.size}.`);
if (!anySucceeded) process.exitCode = 1;
