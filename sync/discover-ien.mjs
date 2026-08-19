import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const url = process.env.IEN_URL || 'https://www.ien.edu.sa/?choice=2#/generalactivities/';
const responses = [];
const jsonSamples = [];
let gotoError = null;

const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-blink-features=AutomationControlled']});
const context = await browser.newContext({
  viewport:{width:1440,height:1100},
  locale:'ar-SA',
  timezoneId:'Asia/Riyadh',
  userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  extraHTTPHeaders:{'Accept-Language':'ar-SA,ar;q=0.9,en;q=0.7'}
});
const page = await context.newPage();

page.on('response', async res => {
  try {
    const headers = res.headers();
    const ct = headers['content-type'] || '';
    const entry = {url:res.url(),status:res.status(),type:res.request().resourceType(),contentType:ct.slice(0,160)};
    if (responses.length < 800) responses.push(entry);
    if (ct.toLowerCase().includes('application/json') && jsonSamples.length < 80) {
      try {
        const body = await res.text();
        jsonSamples.push({url:res.url(),text:body.slice(0,12000)});
      } catch {}
    }
  } catch {}
});

try {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForTimeout(12000);
} catch (e) {
  gotoError = String(e?.message || e);
}

let bodyText = '';
let links = [];
let controls = [];
try {
  bodyText = (await page.locator('body').innerText()).replace(/\s+/g,' ').trim().slice(0,30000);
  links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].slice(0,500).map(a => ({text:(a.innerText||a.getAttribute('title')||'').replace(/\s+/g,' ').trim().slice(0,220),href:a.href})));
  controls = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"],select option')].slice(0,500).map(el => (el.innerText||el.textContent||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()).filter(Boolean));
} catch {}

const discovery = {
  attemptedAt:new Date().toISOString(),
  requestedUrl:url,
  finalUrl:page.url(),
  title:await page.title().catch(()=>''),
  gotoError,
  bodyText,
  controls,
  links,
  responses,
  jsonSamples
};

await fs.mkdir(path.join(ROOT,'data'),{recursive:true});
await fs.writeFile(path.join(ROOT,'data','ien-discovery.json'),JSON.stringify(discovery,null,2),'utf8');
console.log(`Discovery saved: responses=${responses.length}, json=${jsonSamples.length}, controls=${controls.length}, links=${links.length}`);
await browser.close();
