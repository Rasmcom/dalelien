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
const escapeHtml = v => String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const escapeAttr = escapeHtml;

const experienceCss=document.createElement('link');
experienceCss.rel='stylesheet'; experienceCss.href='landing.css?v=20260819-2'; document.head.appendChild(experienceCss);
const brandingCss=document.createElement('link');
brandingCss.rel='stylesheet'; brandingCss.href='branding.css?v=20260819-1'; document.head.appendChild(brandingCss);

const STAGE_ICONS = {
  lower:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8.2V6.5A3.5 3.5 0 0 1 10.5 3h3A3.5 3.5 0 0 1 17 6.5v1.7"/><rect x="5" y="7" width="14" height="13" rx="3"/><path d="M8.5 11.5h7M9 15.5h6"/><path class="spark" d="m19.4 3.2.45 1.25 1.25.45-1.25.45-.45 1.25-.45-1.25-1.25-.45 1.25-.45z"/></svg>`,
  upper:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21z"/><path d="m15.7 7.1 2.2-2.2 1.2 1.2-2.2 2.2-1.7.5z"/><path class="spark" d="M7.5 8.5h1M7.5 12h1"/></svg>`,
  middle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16h6M10 19h4"/><path d="M8.2 13.4a6 6 0 1 1 7.6 0c-1.1.8-1.8 1.6-1.8 2.6h-4c0-1-.7-1.8-1.8-2.6Z"/><path d="M12 1.5v1.7M4.7 5l1.2 1.2M19.3 5l-1.2 1.2"/><path class="spark" d="m12 7 .65 1.35L14 9l-1.35.65L12 11l-.65-1.35L10 9l1.35-.65z"/></svg>`,
  secondary:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-4 9 4-9 4z"/><path d="M7 11.2V15c3 2.3 7 2.3 10 0v-3.8"/><path d="M21 9v5"/><path class="spark" d="m18.7 3 .45 1.2 1.2.45-1.2.45-.45 1.2-.45-1.2-1.2-.45 1.2-.45z"/></svg>`
};

const FIELD_ICONS = {
  'المواطنة والحياة':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-4.3 7-10.5V5l-7-2-7 2v5.5C5 16.7 12 21 12 21Z"/><path d="M12 15.3 9.2 12.7a2 2 0 0 1 2.8-2.9 2 2 0 0 1 2.8 2.9Z"/><path class="field-icon-spark" d="m18.8 3 .4 1.05 1.05.4-1.05.4-.4 1.05-.4-1.05-1.05-.4 1.05-.4z"/></svg>`,
  'العلوم والتقنية':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"><ellipse cx="12" cy="12" rx="8" ry="3.2"/><ellipse cx="12" cy="12" rx="8" ry="3.2" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8" ry="3.2" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle class="field-icon-spark" cx="19.3" cy="9.5" r="1.1" fill="currentColor" stroke="none"/></svg>`,
  'الرياضة والصحة':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h3l1.5-3.2L11 16l2-7 1.6 3H20" class="field-icon-pulse"/><path d="M12 21c-5.8-3.4-8-6.2-8-10A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 8 3c0 3.8-2.2 6.6-8 10Z" opacity=".72"/></svg>`,
  'الثقافة والفنون':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-2a2 2 0 0 1-2-2V6.6A3.6 3.6 0 0 0 12 3Z"/><circle cx="7.4" cy="11.3" r="1"/><circle cx="9.6" cy="7.8" r="1"/><path d="M15.8 15.4c1.7-1.9 2.8-2.3 4.2-2.4-1.2 1.1-1.6 2.3-1.7 4.1-.8-1-1.5-1.4-2.5-1.7Z"/><path class="field-icon-spark" d="m17.7 4 .5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"/></svg>`,
  'النشاط الكشفي':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="m14.7 9.3-1.6 3.8-3.8 1.6 1.6-3.8z"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2"/><path class="field-icon-spark" d="m18.6 4.2.4 1 .95.4-.95.4-.4 1-.4-1-.95-.4.95-.4z"/></svg>`
};

const stageArrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`;
const openGuideIcon = `<span class="open-icon-wrap" aria-hidden="true"><svg class="open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h7l3 3v13H7z"/><path d="M14 4v4h4"/><g class="open-arrow"><path d="M11 14h7M15 10l4 4-4 4"/></g></svg></span>`;

function injectBrandUI(){
  const topbar=document.querySelector('.topbar');
  if(topbar && !document.querySelector('.independence-note')){
    const note=document.createElement('div');
    note.className='independence-note';
    note.innerHTML=`<div class="note-inner"><span class="note-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16.7h.01"/></svg></span><strong>هذا الموقع ليس تابعًا لقناة عين أو وزارة التعليم</strong><span class="note-sep">•</span><span class="note-purpose">تم تصميمه لاختصار الوقت وتسهيل الوصول إلى الأدلة</span></div>`;
    topbar.parentNode.insertBefore(note,topbar);
  }
  const footer=document.querySelector('footer .footer');
  if(footer){
    footer.className='container footer rasm-footer';
    footer.innerHTML=`<a class="rasm-wordmark" href="https://www.rasmcom.com" target="_blank" rel="noopener noreferrer" aria-label="متجر رسم">رسم</a><span class="rasm-credit">صنع بـ <span class="rasm-heart" aria-hidden="true">♥</span> بواسطة <a href="https://www.rasmcom.com" target="_blank" rel="noopener noreferrer">متجر رسم للتصميم والخدمات التعليمية</a></span>`;
  }
}

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
      <span class="stage-top"><span class="stage-icon">${STAGE_ICONS[s.id]||STAGE_ICONS.secondary}</span><span class="stage-count">${count?`${count} دليل`:''}</span></span>
      <span><strong>${s.label}</strong><small>${s.note}</small></span><span class="stage-arrow">${stageArrow}</span>
    </button>`;
  }).join('');
  document.querySelectorAll('[data-stage]').forEach(btn=>btn.addEventListener('click',()=>{
    state.stage=btn.dataset.stage; state.field=null; render();
    document.getElementById('fields').scrollIntoView({behavior:'smooth',block:'center'});
  }));
}

function renderFields(){
  $('fieldList').innerHTML=FIELDS.map(f=>{
    const count=fieldCount(f);
    const icon=FIELD_ICONS[f]||FIELD_ICONS['المواطنة والحياة'];
    return `<button class="field ${state.field===f?'active':''}" data-field="${escapeAttr(f)}" ${!state.stage?'disabled':''}>${icon}<span>${escapeHtml(f)}${count?` · ${count}`:''}</span></button>`;
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
    ${item.pdfUrl?`<a class="open-guide" target="_blank" rel="noopener noreferrer" href="${escapeAttr(item.pdfUrl)}"><span>فتح الدليل</span>${openGuideIcon}</a>`:`<span class="open-guide disabled"><span>الرابط غير متاح</span><span>—</span></span>`}
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
  motion.src='motion.js?v=20260819-5'; motion.dataset.ienMotion='1';
  motion.onload=()=>{
    window.dispatchEvent(new CustomEvent('ien:ready',{detail:{count:sourceItems.length}}));
    if(!document.querySelector('script[data-ien-kinetics]')){
      const kinetics=document.createElement('script');
      kinetics.src='kinetics.js?v=20260819-2'; kinetics.dataset.ienKinetics='1';
      document.body.appendChild(kinetics);
    }
  };
  document.body.appendChild(motion);
}

$('search').addEventListener('input',e=>{state.query=e.target.value;renderGuides();window.dispatchEvent(new CustomEvent('ien:rendered'));});
injectBrandUI();

(async function bootstrap(){
  refreshCatalogRefs();
  render();
  await fetchFreshCatalog();
  render();
  loadExperience();
})();
