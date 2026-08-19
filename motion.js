(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const svg = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${path}</svg>`;

  function applyHeroReadabilityFix(){
    if(qs('#hero-mobile-readability-fix')) return;
    const style=document.createElement('style');
    style.id='hero-mobile-readability-fix';
    style.textContent=`
      .hero-showcase .folder-back{z-index:0!important}
      .hero-showcase .folder-front{z-index:1!important;pointer-events:none}
      .hero-showcase .doc{z-index:3!important}
      .hero-showcase .doc-two{z-index:5!important}
      .hero-showcase .doc-head,.hero-showcase .doc h3,.hero-showcase .doc .line,.hero-showcase .doc-foot{position:relative;z-index:2}
      .hero-showcase .float-card{z-index:7!important}
      @media(max-width:620px){
        .hero-showcase{height:390px!important;overflow:visible!important;transform:none!important;margin-top:8px!important}
        .hero-showcase .show-glow{width:310px!important;height:310px!important}
        .hero-showcase .show-ring{width:300px!important;height:300px!important}
        .hero-showcase .folder-stack{width:340px!important;height:290px!important;transform:scale(.9)!important;transform-origin:center center!important}
        .hero-showcase .folder-back{left:18px!important;right:18px!important;bottom:6px!important;height:205px!important}
        .hero-showcase .folder-front{left:7px!important;right:7px!important;bottom:0!important;height:112px!important;opacity:.72!important}
        .hero-showcase .doc{width:160px!important;height:218px!important;padding:15px!important;border-radius:17px!important;overflow:hidden!important}
        .hero-showcase .doc h3{font-size:12px!important;line-height:1.65!important;margin:17px 0 8px!important;min-height:42px!important}
        .hero-showcase .doc-head{min-height:27px!important}
        .hero-showcase .pdf-tag{font-size:8px!important;padding:4px 6px!important}
        .hero-showcase .doc-code{font-size:7px!important}
        .hero-showcase .doc-one{left:4px!important;top:8px!important;transform:rotate(-8deg)!important}
        .hero-showcase .doc-two{left:90px!important;top:-18px!important;transform:rotate(1deg)!important}
        .hero-showcase .doc-three{right:2px!important;top:21px!important;transform:rotate(8deg)!important}
        .hero-showcase .float-a{left:0!important;bottom:26px!important}
        .hero-showcase .float-b{right:0!important;top:40px!important}
      }
      @media(max-width:390px){
        .hero-showcase{height:365px!important}
        .hero-showcase .folder-stack{transform:scale(.83)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function addScrollProgress(){
    if(qs('.scroll-progress')) return;
    const bar=document.createElement('div'); bar.className='scroll-progress'; document.body.appendChild(bar);
    const update=()=>{ const h=document.documentElement; const max=h.scrollHeight-innerHeight; bar.style.width=(max>0?scrollY/max*100:0)+'%'; };
    addEventListener('scroll',update,{passive:true}); update();
  }

  function enrichHero(){
    const copy=qs('.hero-copy'); if(!copy) return;
    const p=qs('p',copy);
    if(!qs('.hero-actions',copy) && p){
      const actions=document.createElement('div'); actions.className='hero-actions';
      actions.innerHTML=`
        <button class="hero-cta primary" data-scroll="#stagesSection">استعرض الأدلة ${svg('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button>
        <button class="hero-cta secondary" data-focus-search>ابحث مباشرة ${svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>')}</button>`;
      p.insertAdjacentElement('afterend',actions);
    }
    qsa('[data-scroll]').forEach(btn=>btn.addEventListener('click',()=>qs(btn.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));
    qs('[data-focus-search]')?.addEventListener('click',()=>{ const input=qs('#search'); input?.focus(); input?.scrollIntoView({behavior:'smooth',block:'center'}); });
  }

  function injectSignals(){
    const hero=qs('.hero'); if(!hero || qs('.signal-strip')) return;
    const items=(window.IEN_APP?.items || window.IEN_CATALOG?.items || []);
    const count=items.length;
    const section=document.createElement('section'); section.className='signal-strip reveal';
    section.innerHTML=`<div class="signal-shell">
      <div class="signal"><span class="signal-icon">${svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21z"/>')}</span><span><strong>عين الإثرائية</strong><small>المصدر الرسمي للملفات</small></span></div>
      <div class="signal"><span class="signal-icon">${svg('<path d="M3 10.5 12 6l9 4.5-9 4.5z"/><path d="M7 13.5V17c3 2 7 2 10 0v-3.5"/>')}</span><span><strong>4 مراحل</strong><small>تصنيف واضح وسريع</small></span></div>
      <div class="signal"><span class="signal-icon">${svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>')}</span><span><strong>5 مجالات</strong><small>كما تظهر في عين</small></span></div>
      <div class="signal"><span class="signal-icon">${svg('<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h4"/>')}</span><span><strong data-guide-total>${count || '—'} دليل</strong><small>فتح PDF مباشرة</small></span></div>
    </div>`;
    hero.insertAdjacentElement('afterend',section);
  }

  function injectJourney(){
    const browse=qs('.browse'); if(!browse || qs('.journey-section')) return;
    const section=document.createElement('section'); section.className='journey-section';
    section.innerHTML=`<div class="container journey-grid">
      <div class="journey-copy reveal">
        <span class="mini-kicker">رحلة الوصول</span>
        <h2>من المصدر إلى الدليل<br>بثلاث خطوات فقط</h2>
        <p>بدل التنقل بين صفحات كثيرة، يختصر الموقع الطريق ويعرض ما تحتاجه حسب المرحلة والمجال، ثم يفتح ملف PDF من عين مباشرة.</p>
        <div class="journey-steps">
          <div class="journey-step reveal" data-delay="1"><b>01</b><strong>اختر المرحلة</strong><span>الأولية، العليا، المتوسطة أو الثانوية.</span></div>
          <div class="journey-step reveal" data-delay="2"><b>02</b><strong>حدد المجال</strong><span>تظهر لك فقط الأدلة المطابقة لاختيارك.</span></div>
          <div class="journey-step reveal" data-delay="3"><b>03</b><strong>افتح الملف</strong><span>ينتقل بك مباشرة إلى ملف PDF الرسمي.</span></div>
        </div>
      </div>
      <div class="journey-visual reveal" data-delay="2">
        <span class="live-badge"><i></i>مسار مباشر</span>
        <div class="pipeline">
          <div class="pipe-row"><span class="pipe-dot">${svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21z"/>')}</span><span class="pipe-card"><strong>عين الإثرائية</strong><span>قراءة المحتوى المنشور من المصدر.</span></span></div>
          <div class="pipe-row"><span class="pipe-dot">${svg('<path d="M3 10.5 12 6l9 4.5-9 4.5z"/><path d="M7 13.5V17c3 2 7 2 10 0v-3.5"/>')}</span><span class="pipe-card"><strong>مرحلة + مجال</strong><span>تصنيف كل ملف في مكانه الصحيح.</span></span></div>
          <div class="pipe-row"><span class="pipe-dot">${svg('<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h4"/>')}</span><span class="pipe-card"><strong>PDF رسمي</strong><span>رابط مباشر دون إعادة استضافة الملف.</span></span></div>
        </div>
      </div>
    </div>`;
    browse.insertAdjacentElement('beforebegin',section);
  }

  function injectSyncStory(){
    const footer=qs('footer'); if(!footer || qs('.sync-story')) return;
    const section=document.createElement('section'); section.className='sync-story';
    section.innerHTML=`<div class="container sync-story-grid">
      <div class="sync-story-copy reveal">
        <h2>المحتوى يتجدد،<br>والفهرس يتجدد معه.</h2>
        <p>المزامنة تعمل على قراءة التصنيفات الرسمية في عين وتحديث الفهرس آليًا. إذا أضيف دليل جديد ضمن المراحل والمجالات المعتمدة، يظهر في الموقع بعد دورة المزامنة التالية.</p>
        <div class="sync-story-points">
          <div class="sync-story-point">20 تصنيفًا رسميًا</div>
          <div class="sync-story-point">روابط PDF من المصدر</div>
          <div class="sync-story-point">منع التكرار</div>
          <div class="sync-story-point">تحديث يومي آلي</div>
        </div>
      </div>
      <div class="sync-orbit reveal" data-delay="2">
        <div class="orbit-ring r1"></div><div class="orbit-ring r2"></div>
        <div class="orbit-core">دليل عين</div>
        <span class="orbit-node n1">المراحل</span><span class="orbit-node n2">المجالات</span><span class="orbit-node n3">PDF</span><span class="orbit-node n4">بحث فوري</span>
      </div>
    </div>`;
    footer.insertAdjacentElement('beforebegin',section);
  }

  function revealMotion(){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets=qsa('.reveal,.stage,.field,.guide');
    if(reduced){ targets.forEach(el=>el.classList.add('revealed')); return; }
    targets.forEach((el,i)=>{ if(!el.classList.contains('reveal')){ el.classList.add('reveal'); el.style.transitionDelay=Math.min((i%5)*45,180)+'ms'; } });
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target);} }),{threshold:.12,rootMargin:'0px 0px -30px'});
    qsa('.reveal:not(.revealed)').forEach(el=>io.observe(el));
  }

  function heroParallax(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero=qs('.hero'); const visual=qs('.hero-showcase'); const stack=qs('.folder-stack');
    if(!hero||!visual||!stack) return;
    hero.addEventListener('pointermove',e=>{
      const r=hero.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5;
      visual.style.transform=`translate3d(${x*9}px,${y*7}px,0)`;
      stack.style.transform=`rotateY(${-7+x*8}deg) rotateX(${3-y*6}deg) translateZ(12px)`;
      document.documentElement.style.setProperty('--mx',`${e.clientX}px`); document.documentElement.style.setProperty('--my',`${e.clientY}px`);
    });
    hero.addEventListener('pointerleave',()=>{visual.style.transform='';stack.style.transform='';});
  }

  function activeNav(){
    const links=qsa('.nav a[href^="#"]'); const sections=links.map(a=>qs(a.getAttribute('href'))).filter(Boolean);
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}),{rootMargin:'-35% 0px -55%',threshold:0});
    sections.forEach(s=>io.observe(s));
  }

  function updateGuideTotal(){
    const total=(window.IEN_APP?.items || window.IEN_CATALOG?.items || []).length;
    const el=qs('[data-guide-total]'); if(el && total) el.textContent=`${total} دليل`;
  }

  function setup(){
    applyHeroReadabilityFix(); addScrollProgress(); enrichHero(); injectSignals(); injectJourney(); injectSyncStory(); updateGuideTotal(); revealMotion(); heroParallax(); activeNav();
  }

  addEventListener('ien:ready',setup,{once:true});
  addEventListener('ien:rendered',()=>{ updateGuideTotal(); revealMotion(); });
  if(document.readyState!=='loading' && window.IEN_APP) setup();
})();