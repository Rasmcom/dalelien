import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const IEN_URL=process.env.IEN_URL || 'https://www.ien.edu.sa/?choice=2#/studentactivities';
const STAGES=[
  {id:'lower',label:'الأولية',aliases:['الأولية','الصفوف الأولية','طفولة مبكرة']},
  {id:'upper',label:'العليا',aliases:['العليا','الصفوف العليا']},
  {id:'middle',label:'المتوسطة',aliases:['المتوسطة','المرحلة المتوسطة']},
  {id:'secondary',label:'الثانوية',aliases:['الثانوية','المرحلة الثانوية']}
];
const FIELDS=['المواطنة والحياة','العلوم والتقنية','الرياضة والصحة','الثقافة والفنون','النشاط الكشفي'];
const items=new Map();
let context={stage:null,field:null};

const clean=s=>(s||'').toString().replace(/\s+/g,' ').trim();
const isPdf=s=>/\.pdf(?:$|[?#])/i.test(s||'');
function absolute(u,base){try{return new URL(u,base).href}catch{return u}}
function pick(obj,keys){for(const k of keys){if(obj&&typeof obj==='object'&&typeof obj[k]==='string'&&clean(obj[k]))return clean(obj[k])}return ''}
function add({title,pdfUrl,stage=context.stage,field=context.field,sourceUrl=IEN_URL}){
  title=clean(title); pdfUrl=absolute(clean(pdfUrl),IEN_URL); if(!title||!isPdf(pdfUrl))return;
  const stageObj=STAGES.find(s=>s.id===stage?.id||s.label===stage||s.aliases.some(a=>clean(stage).includes(a))) || (typeof stage==='object'?stage:null);
  const stageLabel=stageObj?.label||clean(stage?.label||stage); const stageId=stageObj?.id||'';
  const fieldLabel=FIELDS.find(f=>clean(field).includes(f))||clean(field);
  const key=`${stageId}|${fieldLabel}|${title}|${pdfUrl}`;
  items.set(key,{title,stage:stageLabel,stageId,field:fieldLabel,pdfUrl,sourceUrl});
}
function scanObject(node, inheritedTitle=''){
  if(!node)return;
  if(Array.isArray(node)){for(const x of node)scanObject(x,inheritedTitle);return}
  if(typeof node!=='object')return;
  const title=pick(node,['title','name','activityName','programName','displayName','Name','Title'])||inheritedTitle;
  const stage=pick(node,['stage','stageName','educationStage','levelName'])||context.stage;
  const field=pick(node,['field','fieldName','category','categoryName','activityField'])||context.field;
  for(const [k,v] of Object.entries(node)){
    if(typeof v==='string'&&isPdf(v)) add({title:title||pick(node,['description','label']),pdfUrl:v,stage,field});
    else if(v&&typeof v==='object') scanObject(v,title);
  }
}
async function collectDom(page){
  const rows=await page.evaluate(()=>{
    const out=[]; const nodes=[...document.querySelectorAll('a[href],iframe[src],embed[src],object[data]')];
    for(const el of nodes){const u=el.getAttribute('href')||el.getAttribute('src')||el.getAttribute('data')||''; if(/\.pdf(?:$|[?#])/i.test(u)){const title=(el.innerText||el.closest('article,li,div')?.innerText||document.title||'').trim().split('\n').find(Boolean)||'دليل'; out.push({title,url:u})}}
    return out;
  });
  for(const r of rows)add({title:r.title,pdfUrl:r.url});
}
async function clickText(page,aliases){
  for(const txt of aliases){
    const loc=page.getByText(txt,{exact:true}).first();
    if(await loc.count()){try{await loc.click({timeout:2500});await page.waitForTimeout(1400);return true}catch{}}
  }
  return false;
}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'ar-SA'});
page.on('response',async res=>{
  try{
    const ct=res.headers()['content-type']||'';
    const url=res.url();
    if(isPdf(url)) add({title:'دليل من عين',pdfUrl:url,sourceUrl:page.url()});
    if(ct.includes('application/json')) scanObject(await res.json());
  }catch{}
});
await page.goto(IEN_URL,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(5000);
await collectDom(page);
for(const stage of STAGES){
  context.stage=stage; context.field=null;
  await clickText(page,stage.aliases);
  await collectDom(page);
  for(const field of FIELDS){
    context.field=field;
    await clickText(page,[field]);
    await collectDom(page);
  }
}
await browser.close();
const output={lastSync:new Date().toISOString(),source:IEN_URL,items:[...items.values()].sort((a,b)=>a.stageId.localeCompare(b.stageId)||a.field.localeCompare(b.field,'ar')||a.title.localeCompare(b.title,'ar'))};
await fs.writeFile(path.join(ROOT,'data','catalog.json'),JSON.stringify(output,null,2),'utf8');
await fs.writeFile(path.join(ROOT,'data','catalog.js'),`window.IEN_CATALOG = ${JSON.stringify(output,null,2)};\n`,'utf8');
console.log(`IEN sync complete: ${output.items.length} PDF links discovered.`);
if(output.items.length===0){console.warn('No PDF links were discovered. IEN may have changed its DOM/API; inspect the saved workflow log before publishing an empty catalog.');process.exitCode=2;}
