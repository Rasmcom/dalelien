import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname,'..');
const IEN_URL = process.env.IEN_URL || 'https://www.ien.edu.sa/?choice=2#/generalactivities/';
const NOW = new Date().toISOString();
const STAGES = [
  {id:'lower',label:'الأولية',aliases:['الأولية','الصفوف الأولية','الصفوف الدنيا','ابتدائي أولية']},
  {id:'upper',label:'العليا',aliases:['العليا','الصفوف العليا','ابتدائي عليا']},
  {id:'middle',label:'المتوسطة',aliases:['المتوسطة','المرحلة المتوسطة','متوسط']},
  {id:'secondary',label:'الثانوية',aliases:['الثانوية','المرحلة الثانوية','ثانوي']}
];
const FIELDS = [
  {label:'المواطنة والحياة',aliases:['المواطنة والحياة','المواطنة']},
  {label:'العلوم والتقنية',aliases:['العلوم والتقنية','العلوم و التقنية']},
  {label:'الرياضة والصحة',aliases:['الرياضة والصحة','الرياضة و الصحة']},
  {label:'الثقافة والفنون',aliases:['الثقافة والفنون','الثقافة و الفنون']},
  {label:'النشاط الكشفي',aliases:['النشاط الكشفي','الكشفي']}
];

const confirmed = new Map();
const candidates = new Map();
const responses = [];
let current = {stage:null,field:null,lastLabel:''};
let gotoError = null;

const clean = s => String(s ?? '').replace(/\s+/g,' ').trim();
const absolute = (u,base=IEN_URL) => { try { return new URL(u,base).href; } catch { return clean(u); } };
const isHttpish = s => /^(https?:)?\/\//i.test(s||'') || /^\//.test(s||'');
const looksPdfUrl = s => /\.pdf(?:$|[?#])/i.test(s||'');
const looksFileish = s => /(pdf|download|attachment|document|resource|file|viewer|content)/i.test(s||'');
const fileDispositionPdf = s => /filename\*?=.*\.pdf/i.test(s||'');

function inferStage(value){
  const t=clean(value);
  return STAGES.find(s=>s.aliases.some(a=>t.includes(a))) || null;
}
function inferField(value){
  const t=clean(value);
  return FIELDS.find(f=>f.aliases.some(a=>t.includes(a)))?.label || '';
}
function pick(obj,keys){
  for(const key of keys){ if(obj && typeof obj==='object' && typeof obj[key]==='string' && clean(obj[key])) return clean(obj[key]); }
  return '';
}
function makeTitle(value){
  const t=clean(value).split(' | ')[0].split('\n')[0];
  return t && t.length <= 180 ? t : 'دليل من عين الإثرائية';
}
function rememberCandidate(url,meta={}){
  url=absolute(clean(url));
  if(!url || (!isHttpish(url) && !url.startsWith('blob:'))) return;
  if(url.startsWith('blob:')) return;
  const old=candidates.get(url)||{};
  candidates.set(url,{...old,...meta,url,title:makeTitle(meta.title||old.title||current.lastLabel)});
}
function addConfirmed({url,title,stage=current.stage,field=current.field,sourceUrl=IEN_URL}){
  url=absolute(clean(url));
  if(!url)return;
  const stageObj = typeof stage==='object' && stage?.id ? stage : inferStage(stage) || current.stage;
  const fieldLabel = typeof field==='object' ? field?.label : inferField(field)||clean(field)||current.field?.label||'';
  const item={
    title:makeTitle(title||current.lastLabel),
    stage:stageObj?.label||clean(stage)||'',
    stageId:stageObj?.id||'',
    field:fieldLabel,
    pdfUrl:url,
    sourceUrl
  };
  const key=`${item.stageId}|${item.field}|${item.title}|${item.pdfUrl}`;
  confirmed.set(key,item);
}
function scanObject(node, inherited={}){
  if(!node)return;
  if(Array.isArray(node)){ for(const x of node) scanObject(x,inherited); return; }
  if(typeof node!=='object')return;
  const title=pick(node,['title','name','activityName','programName','displayName','label','Name','Title'])||inherited.title||'';
  const stageText=pick(node,['stage','stageName','educationStage','levelName','gradeName'])||inherited.stage||'';
  const fieldText=pick(node,['field','fieldName','category','categoryName','activityField','domainName'])||inherited.field||'';
  const stage=inferStage(stageText)||current.stage;
  const field=inferField(fieldText)||current.field?.label||fieldText;
  for(const [key,value] of Object.entries(node)){
    if(typeof value==='string'){
      const v=clean(value);
      if(looksPdfUrl(v)) rememberCandidate(v,{title,stage,field,reason:`json:${key}`});
      else if((/(url|uri|path|file|pdf|download|attachment|document|resource|content)/i.test(key) || looksFileish(v)) && isHttpish(v)) rememberCandidate(v,{title,stage,field,reason:`json:${key}`});
    } else if(value && typeof value==='object') scanObject(value,{title,stage:stageText,field:fieldText});
  }
}

async function collectDom(page){
  const rows=await page.evaluate(()=>{
    const out=[];
    const els=[...document.querySelectorAll('a[href],iframe[src],embed[src],object[data]')];
    for(const el of els){
      const url=el.getAttribute('href')||el.getAttribute('src')||el.getAttribute('data')||'';
      const host=el.closest('article,li,tr,.card,.item,.panel,div');
      const text=((el.innerText||host?.innerText||el.getAttribute('title')||'')+'').replace(/\s+/g,' ').trim();
      if(/\.pdf(?:$|[?#])/i.test(url) || /(pdf|تحميل|دليل|برنامج|عرض|ملف)/i.test(text) || /(download|document|resource|file|viewer|content)/i.test(url)) out.push({url,title:text.slice(0,180)});
    }
    return out.slice(0,500);
  });
  for(const row of rows) rememberCandidate(row.url,{title:row.title,stage:current.stage,field:current.field?.label,reason:'dom'});
}

async function activateText(page,aliases){
  for(const txt of aliases){
    const selectors=[
      page.getByRole('button',{name:txt,exact:false}).first(),
      page.getByRole('link',{name:txt,exact:false}).first(),
      page.getByText(txt,{exact:false}).first()
    ];
    for(const locator of selectors){
      try{
        if(await locator.count() && await locator.isVisible({timeout:800})){
          current.lastLabel=txt;
          await locator.click({timeout:3000});
          await page.waitForTimeout(1400);
          return true;
        }
      }catch{}
    }
    try{
      const selects=page.locator('select');
      for(let i=0;i<await selects.count();i++){
        const sel=selects.nth(i);
        const options=await sel.locator('option').allTextContents();
        const idx=options.findIndex(o=>clean(o).includes(txt));
        if(idx>=0){
          current.lastLabel=txt;
          await sel.selectOption({index:idx});
          await page.waitForTimeout(1400);
          return true;
        }
      }
    }catch{}
  }
  return false;
}

async function readPrevious(){
  try{return JSON.parse(await fs.readFile(path.join(ROOT,'data','catalog.json'),'utf8'));}catch{return {items:[],lastSync:null};}
}

const previous=await readPrevious();
const browser=await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled','--no-sandbox']});
const context=await browser.newContext({
  viewport:{width:1440,height:1100},locale:'ar-SA',timezoneId:'Asia/Riyadh',
  userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  extraHTTPHeaders:{'Accept-Language':'ar-SA,ar;q=0.9,en;q=0.7'}
});
const page=await context.newPage();

page.on('response',async res=>{
  try{
    const headers=res.headers();
    const ct=headers['content-type']||'';
    const cd=headers['content-disposition']||'';
    const url=res.url();
    if(responses.length<800) responses.push({url,status:res.status(),type:res.request().resourceType(),contentType:ct.slice(0,120),disposition:cd.slice(0,160)});
    if(ct.toLowerCase().includes('application/pdf') || fileDispositionPdf(cd)) addConfirmed({url,title:current.lastLabel||'دليل من عين الإثرائية',sourceUrl:page.url()});
    else if(looksPdfUrl(url)) rememberCandidate(url,{title:current.lastLabel,stage:current.stage,field:current.field?.label,reason:'response-url'});
    if(ct.includes('application/json')){
      try{ scanObject(await res.json()); }catch{}
    }
  }catch{}
});

try{
  await page.goto(IEN_URL,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForTimeout(9000);
}catch(err){ gotoError=String(err?.message||err); }
await collectDom(page).catch(()=>{});

for(const stage of STAGES){
  current.stage=stage; current.field=null;
  await activateText(page,stage.aliases);
  await collectDom(page).catch(()=>{});
  for(const field of FIELDS){
    current.field=field;
    await activateText(page,field.aliases);
    await collectDom(page).catch(()=>{});
  }
}

// Verify candidate links that do not expose .pdf in their URL.
let probed=0;
for(const candidate of candidates.values()){
  if(probed>=250)break;
  probed++;
  if(confirmed.size && looksPdfUrl(candidate.url)){
    addConfirmed({url:candidate.url,title:candidate.title,stage:candidate.stage,field:candidate.field,sourceUrl:page.url()});
    continue;
  }
  try{
    const res=await context.request.fetch(candidate.url,{method:'HEAD',timeout:12000,maxRedirects:8,failOnStatusCode:false});
    const headers=res.headers();
    const ct=headers['content-type']||'';
    const cd=headers['content-disposition']||'';
    if(ct.toLowerCase().includes('application/pdf') || fileDispositionPdf(cd) || looksPdfUrl(res.url())) addConfirmed({url:res.url(),title:candidate.title,stage:candidate.stage,field:candidate.field,sourceUrl:page.url()});
  }catch{}
}

let bodyText='';
try{bodyText=clean(await page.locator('body').innerText()).slice(0,16000);}catch{}
await browser.close();

const freshItems=[...confirmed.values()].sort((a,b)=>(a.stageId||'').localeCompare(b.stageId||'')||(a.field||'').localeCompare(b.field||'','ar')||(a.title||'').localeCompare(b.title||'','ar'));
const hasFresh=freshItems.length>0;
const output={
  source:IEN_URL,
  lastAttempt:NOW,
  lastSync:hasFresh?NOW:(previous.lastSync||null),
  syncStatus:hasFresh?'ok':'no_files',
  items:hasFresh?freshItems:(Array.isArray(previous.items)?previous.items:[])
};
const diagnostics={
  attemptedAt:NOW,source:IEN_URL,pageUrl:page.url?.()||IEN_URL,gotoError,
  freshPdfCount:freshItems.length,candidateCount:candidates.size,responseCount:responses.length,
  bodyText,responses
};
await fs.writeFile(path.join(ROOT,'data','catalog.json'),JSON.stringify(output,null,2),'utf8');
await fs.writeFile(path.join(ROOT,'data','catalog.js'),`window.IEN_CATALOG = ${JSON.stringify(output,null,2)};\n`,'utf8');
await fs.writeFile(path.join(ROOT,'data','ien-diagnostics.json'),JSON.stringify(diagnostics,null,2),'utf8');
console.log(`IEN sync attempt complete. Fresh PDFs: ${freshItems.length}; candidates: ${candidates.size}; responses: ${responses.length}.`);
if(!hasFresh) console.warn('No fresh PDFs were confirmed. Previous valid catalog was preserved and diagnostics were saved.');