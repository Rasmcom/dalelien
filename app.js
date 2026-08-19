const STAGES = [
  {id:'lower', label:'الأولية', note:'الصفوف الأولية'},
  {id:'upper', label:'العليا', note:'الصفوف العليا'},
  {id:'middle', label:'المتوسطة', note:'المرحلة المتوسطة'},
  {id:'secondary', label:'الثانوية', note:'المرحلة الثانوية'}
];

const DEFAULT_FIELDS = ['المواطنة والحياة','العلوم والتقنية','الرياضة والصحة','الثقافة والفنون','النشاط الكشفي'];
let catalog = window.IEN_CATALOG || {items:[],lastSync:null,syncStatus:'never'};
let sourceItems = [];
let FIELDS = DEFAULT_FIELDS;
let state = {stage:null,field:null,query:''};
const $ = id => document.getElementById(id);
const normalize = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const escapeHtml = v => String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const escapeAttr = escapeHtml;

const experienceCss=document.createElement('link');
experienceCss.rel='stylesheet'; experienceCss.href=`landing.css?v=20260819-2`; document.head.appendChild(experienceCss);

const stageIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 10.5 12 6l9 4.5-9 4.5z"/><path d="M7 13.5V17c3 2 7 2 10 0v-3.5"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`;
const fieldIcons = [
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s7-4.4 7-11V5l-7-2-7 2v5c0 6.6 7 11 7 11z"/><path d="m9 11 2 2 4-4"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 8l3 3 2-4 3 2-2 4 4 3M7 8 4 13l4 2-2 6"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3a9 9 0 1 0 9 9c0-1-.8-1.8-1.8-1.8H17a2 2 0 0 1-2-2V6.8A3.8 3.8 0 0 0 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 21V5l8-3 8 3v16"/><path d="M8 8h8M8 12h8M8 16h8"/></svg>`
];

function refreshCatalogRefs(){
  sourceItems = Array.isArray(catalog.items) ? catalog.items : [];
  const discovered=[...new Set(sourceItems.map(i=>String(i.field||'').trim()).filter(Boolean))];
  const official=DEFAULT_FIELDS.filter(f=>discovered.some(d=>normalize(d)===normalize(f)));
  const extras=discovered.filter(d=>!DEFAULT_FIELDS.some(f=>normalize(f)===normalize(d)));
  FIELDS=(official.length?official:DEFAULT_FIELDS).concat(extras);
  window.IEN_CATALOG=catalog;
  window.IEN_APP={catalog,items:sourceItems,stages:STAGES,fields:FIELDS};
}

async function fetchFreshCatalog(){
  try{
    const url=`data/catalog.json?ts=${Date.now()}`;
    const res=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const fresh=await res.json();
    if(fresh && Array.isArray(fresh.items) && fresh.items.length){ catalog=fresh; }
  }catch(err){
    console.warn('Using bundled IEN catalog fallback:',err);
  }
  refreshCatalogRefs();
}

function stageFor(item){
  if(item.stageId) return item.stageId;
  const s = normalize(item.stage);
  if(/أولي|اولى|أولى|الصفوف الأولية/.test(s)) return 'lower';
  if(/عليا|الصفوف العليا/.test(s)) return 'upper';
  if(/متوسط/.test(s)) return 'middle';
  if(/ثانو/.test(s)) return 'secondary';
  return '';
}
function stageCount(id){ return sourceItems.filter(i=>stageFor(i)===id).length; }
function fieldCount(field){ return sourceItems.filter(i=>(!state.stage||stageFor(i)===state.stage)&&normalize(i.field)===normalize(field)).length; }
function filtered(){
  const q=normalize(state.query);
  return sourceItems.filter(i=>{
    const text=normalize(`${i.title||''} ${i.field||''} ${i.stage||''}`);
    return (!state.stage||stageFor(i)===state.stage) && (!state.field||normalize(i.field)===normalize(state.field)) && (!q||text.includes(q));
  });
}

function renderStages(){
  $('stages').innerHTML=STAGES.map(s=>{
    const count=stageCount(s.id);
    return `<button class="stage ${state.stage===s.id?'active':''}" data-stage="${s.id}">
      <span class="stage-top"><span class="stage-icon">${stageIcon}</span><span class="stage-count">${count?`${count} دليل`:''}</span></span>
      <span><strong>${s.label}</strong><small>${s.note}</small></span><span class="stage-arrow">${arrow}</span>
    </button>`;
  }).join('');
  document.querySelectorAll('[data-stage]').forEach(btn=>btn.addEventListener('click',()=>{
    state.stage=btn.dataset.stage; state.field=null; render();
    document.getElementById('fields').scrollIntoView({behavior:'smooth',block:'center'});
  }));
}

function renderFields(){
  $('fieldList').innerHTML=FIELDS.map((f,i)=>{
    const count=fieldCount(f);
    return `<button class="field ${state.field===f?'active':''}" data-field="${escapeAttr(f)}" ${!state.stage?'disabled':''}>${fieldIcons[i%fieldIcons.length]}<span>${escapeHtml(f)}${count?` · ${count}`:''}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-field]').forEach(btn=>btn.addEventListener('click',()=>{
    if(!state.stage)return; state.field=btn.dataset.field; render();
    document.getElementById('guides').scrollIntoView({behavior:'smooth',block:'start'});
  }));
}

function empty(title,text){
  return `<div class="empty"><div><span class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h4"/></svg></span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div></div>`;
}

function renderGuides(){
  const list=filtered();
  if(state.query && !state.stage) $('resultMeta').textContent=`${list.length} نتيجة بحث`;
  else if(state.stage && state.field) $('resultMeta').textContent=`${list.length} نتيجة في ${state.field}`;
  else if(state.stage) $('resultMeta').textContent=`${list.length} دليل في المرحلة المختارة`;
  else $('resultMeta').textContent='اختر المرحلة والمجال لعرض الأدلة';

  if(!sourceItems.length){
    $('guideGrid').innerHTML=empty('جارٍ تحميل أحدث الأدلة','يتم الآن قراءة أحدث نسخة متاحة من فهرس عين.');
    return;
  }
  if(!state.stage && !state.query){
    $('guideGrid').innerHTML=empty('اختر المرحلة أولًا','بعد اختيار المرحلة اختر المجال لتظهر الأدلة المرتبطة به مباشرة.');
    return;
  }
  if(!list.length){
    $('guideGrid').innerHTML=empty('لا توجد نتائج مطابقة','جرّب تغيير المرحلة أو المجال أو عبارة البحث.');
    return;
  }
  $('guideGrid').innerHTML=list.map(item=>`<article class="guide">
    <div class="guide-top"><span class="pdf">PDF</span><span class="guide-stage">${escapeHtml(item.stage||STAGES.find(s=>s.id===stageFor(item))?.label||'')}</span></div>
    <h4>${escapeHtml(item.title||'دليل نشاط')}</h4><p>${escapeHtml(item.field||'')}</p>
    ${item.pdfUrl?`<a class="open-guide" target="_blank" rel="noopener noreferrer" href="${escapeAttr(item.pdfUrl)}"><span>فتح الدليل</span><span>↗</span></a>`:`<span class="open-guide disabled"><span>الرابط غير متاح</span><span>—</span></span>`}
  </article>`).join('');
}

function renderSync(){
  const stateEl=$('syncState');
  const label=$('lastSync');
  const ok=sourceItems.length>0 && catalog.syncStatus==='ok';
  stateEl.classList.toggle('warn',!ok);
  if(sourceItems.length && catalog.lastSync){
    const when=new Date(catalog.lastSync).toLocaleString('ar-SA',{dateStyle:'short',timeStyle:'short'});
    label.textContent=`متزامن مع عين · ${when}`;
    return;
  }
  if(sourceItems.length){ label.textContent='الأدلة متاحة من آخر فهرس محفوظ'; return; }
  label.textContent='جارٍ تحميل أحدث الأدلة';
}

function render(){
  renderStages(); renderFields(); renderGuides(); renderSync();
  window.IEN_APP={catalog,items:sourceItems,stages:STAGES,fields:FIELDS};
  window.dispatchEvent(new CustomEvent('ien:rendered',{detail:{count:sourceItems.length}}));
}

function loadExperience(){
  if(document.querySelector('script[data-ien-motion]')) return;
  const motion=document.createElement('script');
  motion.src='motion.js?v=20260819-4'; motion.dataset.ienMotion='1';
  motion.onload=()=>{
    window.dispatchEvent(new CustomEvent('ien:ready',{detail:{count:sourceItems.length}}));
    if(!document.querySelector('script[data-ien-kinetics]')){
      const kinetics=document.createElement('script');
      kinetics.src='kinetics.js?v=20260819-1'; kinetics.dataset.ienKinetics='1';
      document.body.appendChild(kinetics);
    }
  };
  document.body.appendChild(motion);
}

$('search').addEventListener('input',e=>{state.query=e.target.value;renderGuides();window.dispatchEvent(new CustomEvent('ien:rendered'));});
document.querySelector('.footer-source')?.remove();

(async function bootstrap(){
  refreshCatalogRefs();
  render();
  await fetchFreshCatalog();
  render();
  loadExperience();
})();
