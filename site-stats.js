(()=>{
  'use strict';

  const COUNTER_BASE='https://api.counterapi.dev/v1/dalelien-rasmcom-2026/site-visits';
  const VISIT_STAMP_KEY='dalelien:visit-stamp:v1';
  const VISIT_CACHE_KEY='dalelien:visit-count:v1';
  const VISIT_WINDOW=24*60*60*1000;
  const numberFormat=new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0});
  let statsRoot=null;
  let visible=false;

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  function catalog(){ return window.IEN_CATALOG||{}; }
  function fileCount(){
    const items=Array.isArray(catalog().items)?catalog().items:[];
    return items.length;
  }

  function formatLastSync(value){
    if(!value) return 'بانتظار التحديث';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return 'بانتظار التحديث';
    const diff=Math.max(0,Date.now()-date.getTime());
    const minutes=Math.floor(diff/60000);
    if(minutes<1) return 'الآن';
    if(minutes<60) return `منذ ${numberFormat.format(minutes)} دقيقة`;
    const hours=Math.floor(minutes/60);
    if(hours<24) return hours===1?'منذ ساعة':`منذ ${numberFormat.format(hours)} ساعات`;
    const days=Math.floor(hours/24);
    if(days<7) return days===1?'منذ يوم':`منذ ${numberFormat.format(days)} أيام`;
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{day:'numeric',month:'short',year:'numeric'}).format(date);
  }

  function statsMarkup(){
    return `<section class="site-stats" aria-label="إحصاءات الموقع">
      <div class="container">
        <div class="site-stats-shell">
          <article class="site-stat-card site-stat-visits">
            <span class="site-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="site-stat-copy"><strong class="site-stat-value" id="siteVisitCount">—</strong><small>زيارة للموقع</small></span>
          </article>
          <article class="site-stat-card site-stat-files">
            <span class="site-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg></span>
            <span class="site-stat-copy"><strong class="site-stat-value" id="siteFileCount" data-target="${fileCount()}">${numberFormat.format(fileCount())}</strong><small>دليل وملف متاح</small></span>
          </article>
          <article class="site-stat-card site-stat-sync">
            <span class="site-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8M5.5 15A7 7 0 0 0 17.8 17.8L20 16"/></svg></span>
            <span class="site-stat-copy"><strong class="site-stat-value site-stat-date" id="siteLastSync">${escapeHtml(formatLastSync(catalog().lastSync))}</strong><small>آخر تحديث للفهرس</small></span>
          </article>
        </div>
      </div>
    </section>`;
  }

  function inject(){
    if(document.querySelector('.site-stats')){
      statsRoot=document.querySelector('.site-stats');
      return statsRoot;
    }
    const browse=document.querySelector('.browse');
    if(!browse) return null;
    browse.insertAdjacentHTML('beforebegin',statsMarkup());
    statsRoot=document.querySelector('.site-stats');
    observe();
    return statsRoot;
  }

  function animateNumber(element,target){
    if(!element||!Number.isFinite(target)) return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      element.textContent=numberFormat.format(target);
      return;
    }
    const start=performance.now();
    const duration=850;
    const tick=now=>{
      const progress=Math.min(1,(now-start)/duration);
      const eased=1-Math.pow(1-progress,3);
      element.textContent=numberFormat.format(Math.round(target*eased));
      if(progress<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function animateCurrent(){
    if(!statsRoot||!visible) return;
    const files=document.getElementById('siteFileCount');
    const visits=document.getElementById('siteVisitCount');
    if(files) animateNumber(files,Number(files.dataset.target||fileCount()));
    if(visits && visits.dataset.target) animateNumber(visits,Number(visits.dataset.target));
  }

  function observe(){
    if(!statsRoot) return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      statsRoot.classList.add('is-visible');
      visible=true;
      animateCurrent();
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        visible=entry.isIntersecting;
        statsRoot.classList.toggle('is-visible',visible);
        if(visible) animateCurrent();
      });
    },{threshold:.25,rootMargin:'-3% 0px -5% 0px'});
    observer.observe(statsRoot);
  }

  function refreshCatalogStats(){
    if(!inject()) return;
    const files=document.getElementById('siteFileCount');
    const sync=document.getElementById('siteLastSync');
    const count=fileCount();
    if(files){
      files.dataset.target=String(count);
      files.textContent=numberFormat.format(count);
      if(visible) animateNumber(files,count);
    }
    if(sync) sync.textContent=formatLastSync(catalog().lastSync);
  }

  function cachedVisitCount(){
    const value=Number(localStorage.getItem(VISIT_CACHE_KEY));
    return Number.isFinite(value)&&value>=0?value:null;
  }

  function setVisitCount(value){
    const element=document.getElementById('siteVisitCount');
    if(!element||!Number.isFinite(value)) return;
    element.dataset.target=String(value);
    element.textContent=numberFormat.format(value);
    localStorage.setItem(VISIT_CACHE_KEY,String(value));
    if(visible) animateNumber(element,value);
  }

  async function fetchVisitorCount(){
    inject();
    const cached=cachedVisitCount();
    if(cached!==null) setVisitCount(cached);

    const lastStamp=Number(localStorage.getItem(VISIT_STAMP_KEY)||0);
    const shouldIncrement=!lastStamp||(Date.now()-lastStamp)>=VISIT_WINDOW;
    const endpoint=shouldIncrement?`${COUNTER_BASE}/up`:`${COUNTER_BASE}/`;

    try{
      const response=await fetch(endpoint,{cache:'no-store',headers:{accept:'application/json'}});
      if(!response.ok) throw new Error(`Counter HTTP ${response.status}`);
      const payload=await response.json();
      const value=Number(payload?.count??payload?.value??payload?.data?.count??payload?.data?.value);
      if(!Number.isFinite(value)) throw new Error('Counter response has no numeric value');
      if(shouldIncrement) localStorage.setItem(VISIT_STAMP_KEY,String(Date.now()));
      setVisitCount(value);
    }catch(error){
      console.warn('Visitor counter unavailable:',error);
      const element=document.getElementById('siteVisitCount');
      if(element&&cached===null) element.textContent='—';
    }
  }

  function boot(){
    if(!inject()){
      setTimeout(boot,120);
      return;
    }
    refreshCatalogStats();
    fetchVisitorCount();
  }

  window.addEventListener('ien:rendered',refreshCatalogStats);
  window.addEventListener('online',()=>{ if(document.getElementById('siteVisitCount')?.textContent==='—') fetchVisitorCount(); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
