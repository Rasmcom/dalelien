import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IEN_URL = process.env.IEN_URL || 'https://www.ien.edu.sa/?choice=2#/generalactivities/';
const IEN_HOST = new URL(IEN_URL).hostname;
const NOW = new Date().toISOString();

const STAGES = [
  { id: 'lower', label: 'الأولية', aliases: ['الأولية', 'الصفوف الأولية', 'الصفوف الدنيا', 'ابتدائي أولية'] },
  { id: 'upper', label: 'العليا', aliases: ['العليا', 'الصفوف العليا', 'ابتدائي عليا'] },
  { id: 'middle', label: 'المتوسطة', aliases: ['المتوسطة', 'المرحلة المتوسطة', 'متوسط'] },
  { id: 'secondary', label: 'الثانوية', aliases: ['الثانوية', 'المرحلة الثانوية', 'ثانوي'] }
];

const FIELDS = [
  { label: 'المواطنة والحياة', aliases: ['المواطنة والحياة', 'المواطنة'] },
  { label: 'العلوم والتقنية', aliases: ['العلوم والتقنية', 'العلوم و التقنية'] },
  { label: 'الرياضة والصحة', aliases: ['الرياضة والصحة', 'الرياضة و الصحة'] },
  { label: 'الثقافة والفنون', aliases: ['الثقافة والفنون', 'الثقافة و الفنون'] },
  { label: 'النشاط الكشفي', aliases: ['النشاط الكشفي', 'الكشفي'] }
];

const confirmed = new Map();
const candidates = new Map();
const responses = [];
const gotoAttempts = [];
const dnsFallbackIps = [];
let selectedFallbackIp = null;
let current = { stage: null, field: null, lastLabel: '' };
let page = null;
let browser = null;
let context = null;

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const absolute = (u, base = IEN_URL) => { try { return new URL(u, base).href; } catch { return clean(u); } };
const looksPdfUrl = s => /\.pdf(?:$|[?#])/i.test(s || '');
const looksFileish = s => /(pdf|download|attachment|document|resource|file|viewer|content)/i.test(s || '');
const fileDispositionPdf = s => /filename\*?=.*\.pdf/i.test(s || '');
const isHttp = s => /^https?:\/\//i.test(s || '');

function inferStage(value) {
  const t = clean(value);
  return STAGES.find(s => s.aliases.some(a => t.includes(a))) || null;
}

function inferField(value) {
  const t = clean(value);
  return FIELDS.find(f => f.aliases.some(a => t.includes(a)))?.label || '';
}

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && typeof obj === 'object' && typeof obj[key] === 'string' && clean(obj[key])) return clean(obj[key]);
  }
  return '';
}

function makeTitle(value) {
  const t = clean(value).split(' | ')[0].split('\n')[0];
  return t && t.length <= 180 ? t : 'دليل من عين الإثرائية';
}

function rememberCandidate(url, meta = {}) {
  url = absolute(clean(url));
  if (!url || !isHttp(url)) return;
  const old = candidates.get(url) || {};
  candidates.set(url, { ...old, ...meta, url, title: makeTitle(meta.title || old.title || current.lastLabel) });
}

function addConfirmed({ url, title, stage = current.stage, field = current.field, sourceUrl = IEN_URL }) {
  url = absolute(clean(url));
  if (!url || !isHttp(url)) return;
  const stageObj = typeof stage === 'object' && stage?.id ? stage : inferStage(stage) || current.stage;
  const fieldLabel = typeof field === 'object' ? field?.label : inferField(field) || clean(field) || current.field?.label || '';
  const item = {
    title: makeTitle(title || current.lastLabel),
    stage: stageObj?.label || clean(stage) || '',
    stageId: stageObj?.id || '',
    field: fieldLabel,
    pdfUrl: url,
    sourceUrl
  };
  const key = `${item.stageId}|${item.field}|${item.title}|${item.pdfUrl}`;
  confirmed.set(key, item);
}

function scanObject(node, inherited = {}) {
  if (!node) return;
  if (Array.isArray(node)) { for (const x of node) scanObject(x, inherited); return; }
  if (typeof node !== 'object') return;

  const title = pick(node, ['title', 'name', 'activityName', 'programName', 'displayName', 'label', 'Name', 'Title']) || inherited.title || '';
  const stageText = pick(node, ['stage', 'stageName', 'educationStage', 'levelName', 'gradeName']) || inherited.stage || '';
  const fieldText = pick(node, ['field', 'fieldName', 'category', 'categoryName', 'activityField', 'domainName']) || inherited.field || '';
  const stage = inferStage(stageText) || current.stage;
  const field = inferField(fieldText) || current.field?.label || fieldText;

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') {
      const v = clean(value);
      if (looksPdfUrl(v)) rememberCandidate(v, { title, stage, field, reason: `json:${key}` });
      else if ((/(url|uri|path|file|pdf|download|attachment|document|resource|content)/i.test(key) || looksFileish(v)) && (/^https?:\/\//i.test(v) || /^\//.test(v))) {
        rememberCandidate(v, { title, stage, field, reason: `json:${key}` });
      }
    } else if (value && typeof value === 'object') {
      scanObject(value, { title, stage: stageText, field: fieldText });
    }
  }
}

async function resolveViaDoh(host) {
  const endpoints = [
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`
  ];
  const ips = new Set();
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const json = await res.json();
      for (const answer of json.Answer || []) {
        if (answer.type === 1 && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(answer.data || '')) ips.add(answer.data);
      }
    } catch {}
  }
  return [...ips];
}

async function newBrowser(ip = null) {
  const args = ['--disable-blink-features=AutomationControlled', '--no-sandbox'];
  if (ip) {
    args.push(`--host-resolver-rules=MAP ${IEN_HOST} ${ip}, MAP ien.edu.sa ${ip}, EXCLUDE localhost`);
  }
  browser = await chromium.launch({ headless: true, args });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.7' },
    ignoreHTTPSErrors: false
  });
  page = await context.newPage();

  page.on('response', async res => {
    try {
      const headers = res.headers();
      const ct = headers['content-type'] || '';
      const cd = headers['content-disposition'] || '';
      const url = res.url();
      if (responses.length < 1200) {
        responses.push({ url, status: res.status(), type: res.request().resourceType(), contentType: ct.slice(0, 140), disposition: cd.slice(0, 180) });
      }
      if (ct.toLowerCase().includes('application/pdf') || fileDispositionPdf(cd)) {
        addConfirmed({ url, title: current.lastLabel || 'دليل من عين الإثرائية', sourceUrl: page.url() });
      } else if (looksPdfUrl(url)) {
        rememberCandidate(url, { title: current.lastLabel, stage: current.stage, field: current.field?.label, reason: 'response-url' });
      }
      if (ct.toLowerCase().includes('application/json')) {
        try { scanObject(await res.json()); } catch {}
      }
    } catch {}
  });
}

async function openSource(ip = null) {
  await newBrowser(ip);
  try {
    const response = await page.goto(IEN_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(9000);
    const attempt = { ip, ok: true, status: response?.status() ?? null, finalUrl: page.url(), error: null };
    gotoAttempts.push(attempt);
    return true;
  } catch (err) {
    gotoAttempts.push({ ip, ok: false, status: null, finalUrl: page.url(), error: String(err?.message || err).slice(0, 900) });
    await browser.close().catch(() => {});
    browser = context = page = null;
    return false;
  }
}

async function collectDom() {
  if (!page) return;
  const rows = await page.evaluate(() => {
    const out = [];
    const els = [...document.querySelectorAll('a[href],iframe[src],embed[src],object[data]')];
    for (const el of els) {
      const url = el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('data') || '';
      const host = el.closest('article,li,tr,.card,.item,.panel,div');
      const text = ((el.innerText || host?.innerText || el.getAttribute('title') || '') + '').replace(/\s+/g, ' ').trim();
      if (/\.pdf(?:$|[?#])/i.test(url) || /(pdf|تحميل|دليل|برنامج|عرض|ملف)/i.test(text) || /(download|document|resource|file|viewer|content)/i.test(url)) {
        out.push({ url, title: text.slice(0, 180) });
      }
    }
    return out.slice(0, 800);
  });
  for (const row of rows) rememberCandidate(row.url, { title: row.title, stage: current.stage, field: current.field?.label, reason: 'dom' });
}

async function activateText(aliases) {
  if (!page) return false;
  for (const txt of aliases) {
    const selectors = [
      page.getByRole('button', { name: txt, exact: false }).first(),
      page.getByRole('link', { name: txt, exact: false }).first(),
      page.getByText(txt, { exact: false }).first()
    ];
    for (const locator of selectors) {
      try {
        if (await locator.count() && await locator.isVisible({ timeout: 800 })) {
          current.lastLabel = txt;
          await locator.click({ timeout: 3500 });
          await page.waitForTimeout(1500);
          return true;
        }
      } catch {}
    }
    try {
      const selects = page.locator('select');
      for (let i = 0; i < await selects.count(); i++) {
        const sel = selects.nth(i);
        const options = await sel.locator('option').allTextContents();
        const idx = options.findIndex(o => clean(o).includes(txt));
        if (idx >= 0) {
          current.lastLabel = txt;
          await sel.selectOption({ index: idx });
          await page.waitForTimeout(1500);
          return true;
        }
      }
    } catch {}
  }
  return false;
}

async function readPrevious() {
  try { return JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'catalog.json'), 'utf8')); }
  catch { return { items: [], lastSync: null }; }
}

const previous = await readPrevious();
let opened = await openSource();

if (!opened && gotoAttempts.at(-1)?.error?.includes('ERR_NAME_NOT_RESOLVED')) {
  const ips = await resolveViaDoh(IEN_HOST);
  dnsFallbackIps.push(...ips);
  for (const ip of ips) {
    opened = await openSource(ip);
    if (opened) { selectedFallbackIp = ip; break; }
  }
}

if (opened) {
  await collectDom().catch(() => {});
  for (const stage of STAGES) {
    current.stage = stage;
    current.field = null;
    await activateText(stage.aliases);
    await collectDom().catch(() => {});
    for (const field of FIELDS) {
      current.field = field;
      await activateText(field.aliases);
      await collectDom().catch(() => {});
    }
  }

  let probed = 0;
  for (const candidate of candidates.values()) {
    if (looksPdfUrl(candidate.url)) {
      addConfirmed({ url: candidate.url, title: candidate.title, stage: candidate.stage, field: candidate.field, sourceUrl: page.url() });
      continue;
    }
    if (probed >= 250) break;
    probed++;
    try {
      const host = new URL(candidate.url).hostname;
      if (host === IEN_HOST && selectedFallbackIp) continue;
      const res = await context.request.fetch(candidate.url, { method: 'HEAD', timeout: 12000, maxRedirects: 8, failOnStatusCode: false });
      const headers = res.headers();
      const ct = headers['content-type'] || '';
      const cd = headers['content-disposition'] || '';
      if (ct.toLowerCase().includes('application/pdf') || fileDispositionPdf(cd) || looksPdfUrl(res.url())) {
        addConfirmed({ url: res.url(), title: candidate.title, stage: candidate.stage, field: candidate.field, sourceUrl: page.url() });
      }
    } catch {}
  }
}

let bodyText = '';
let finalPageUrl = IEN_URL;
if (page) {
  try { bodyText = clean(await page.locator('body').innerText()).slice(0, 22000); } catch {}
  try { finalPageUrl = page.url(); } catch {}
}
if (browser) await browser.close().catch(() => {});

const freshItems = [...confirmed.values()].sort((a, b) =>
  (a.stageId || '').localeCompare(b.stageId || '') ||
  (a.field || '').localeCompare(b.field || '', 'ar') ||
  (a.title || '').localeCompare(b.title || '', 'ar')
);

const hasFresh = freshItems.length > 0;
const output = {
  source: IEN_URL,
  lastAttempt: NOW,
  lastSync: hasFresh ? NOW : (previous.lastSync || null),
  syncStatus: hasFresh ? 'ok' : (opened ? 'no_files' : 'source_unreachable'),
  items: hasFresh ? freshItems : (Array.isArray(previous.items) ? previous.items : [])
};

const diagnostics = {
  attemptedAt: NOW,
  source: IEN_URL,
  finalPageUrl,
  opened,
  dnsFallbackIps,
  selectedFallbackIp,
  gotoAttempts,
  freshPdfCount: freshItems.length,
  candidateCount: candidates.size,
  responseCount: responses.length,
  bodyText,
  responses
};

await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'data', 'catalog.json'), JSON.stringify(output, null, 2), 'utf8');
await fs.writeFile(path.join(ROOT, 'data', 'catalog.js'), `window.IEN_CATALOG = ${JSON.stringify(output, null, 2)};\n`, 'utf8');
await fs.writeFile(path.join(ROOT, 'data', 'ien-diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8');

console.log(`IEN sync complete. opened=${opened}; fresh=${freshItems.length}; candidates=${candidates.size}; responses=${responses.length}; fallback=${selectedFallbackIp || 'none'}`);
