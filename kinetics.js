(() => {
  if (window.__IEN_KINETICS__) return;
  window.__IEN_KINETICS__ = true;

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let depth = 2;
  let depthTimer = null;

  const style = document.createElement('style');
  style.id = 'ien-kinetics-style';
  style.textContent = `
    .hero-showcase .doc{will-change:transform,opacity,filter;transition:transform .78s cubic-bezier(.18,.88,.2,1),opacity .5s ease,filter .5s ease,box-shadow .5s ease!important}
    .hero-showcase[data-depth="1"] .doc-one{transform:rotate(-5deg) translate3d(20px,-18px,0) scale(1.075)!important;z-index:8!important;opacity:1;filter:saturate(1.05)}
    .hero-showcase[data-depth="1"] .doc-two{transform:rotate(3deg) translate3d(8px,8px,0) scale(.955)!important;z-index:4!important;opacity:.82;filter:saturate(.84)}
    .hero-showcase[data-depth="1"] .doc-three{transform:rotate(10deg) translate3d(-4px,13px,0) scale(.92)!important;z-index:2!important;opacity:.66;filter:saturate(.75)}
    .hero-showcase[data-depth="2"] .doc-one{transform:rotate(-10deg) translate3d(2px,11px,0) scale(.94)!important;z-index:3!important;opacity:.74;filter:saturate(.8)}
    .hero-showcase[data-depth="2"] .doc-two{transform:rotate(0deg) translate3d(0,-17px,0) scale(1.085)!important;z-index:8!important;opacity:1;filter:saturate(1.06)}
    .hero-showcase[data-depth="2"] .doc-three{transform:rotate(10deg) translate3d(-2px,10px,0) scale(.94)!important;z-index:3!important;opacity:.74;filter:saturate(.8)}
    .hero-showcase[data-depth="3"] .doc-one{transform:rotate(-10deg) translate3d(6px,14px,0) scale(.92)!important;z-index:2!important;opacity:.66;filter:saturate(.75)}
    .hero-showcase[data-depth="3"] .doc-two{transform:rotate(-2deg) translate3d(-7px,8px,0) scale(.955)!important;z-index:4!important;opacity:.82;filter:saturate(.84)}
    .hero-showcase[data-depth="3"] .doc-three{transform:rotate(5deg) translate3d(-20px,-17px,0) scale(1.075)!important;z-index:8!important;opacity:1;filter:saturate(1.05)}
    .hero-showcase .folder-back{animation:ienFolderBreathe 6.4s ease-in-out infinite}
    @keyframes ienFolderBreathe{0%,100%{transform:translateY(0);filter:brightness(1)}50%{transform:translateY(-4px);filter:brightness(1.035)}}

    .stages{position:relative;isolation:isolate;perspective:1100px}
    .stages .stage{position:relative;z-index:2;transform-style:preserve-3d;will-change:transform,opacity,box-shadow;transition:transform .62s cubic-bezier(.18,.86,.2,1),opacity .42s ease,box-shadow .5s ease,filter .42s ease!important;animation:ienStageFloat 6.6s ease-in-out infinite;animation-delay:calc(var(--stage-i,0) * -.9s)}
    .stages .stage:nth-child(2){--stage-i:1}.stages .stage:nth-child(3){--stage-i:2}.stages .stage:nth-child(4){--stage-i:3}
    @keyframes ienStageFloat{0%,100%{translate:0 0}50%{translate:0 -4px}}
    .stages.has-stage-selection .stage:not(.active){opacity:.72;filter:saturate(.84);transform:scale(.965) translateY(5px)!important}
    .stages.has-stage-selection .stage.active{opacity:1;filter:none;animation:none;transform:translateY(-10px) scale(1.028)!important;box-shadow:0 34px 76px rgba(22,83,118,.16)!important}
    .stages .stage.active .stage-icon{animation:ienStageIcon 1.9s ease-in-out infinite}
    @keyframes ienStageIcon{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.055)}}
    .stage-selection-halo{position:absolute;left:0;top:0;z-index:0;pointer-events:none;border-radius:28px;opacity:0;background:radial-gradient(circle at 50% 38%,rgba(24,164,135,.20),rgba(57,119,224,.085) 53%,transparent 72%);filter:blur(13px);transition:transform .7s cubic-bezier(.18,.88,.2,1),width .55s ease,height .55s ease,opacity .32s ease}
    .stages.has-stage-selection .stage-selection-halo{opacity:1}
    .stage.motion-pop{animation:ienStagePop .78s cubic-bezier(.15,.9,.18,1) both!important}
    @keyframes ienStagePop{0%{transform:translateY(5px) scale(.94)}45%{transform:translateY(-16px) scale(1.05)}72%{transform:translateY(-7px) scale(1.018)}100%{transform:translateY(-10px) scale(1.028)}}

    .fields-area.motion-awake .section-heading{animation:ienHeadingEnter .66s ease both}
    @keyframes ienHeadingEnter{from{opacity:.35;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
    .field.motion-enter{animation:ienFieldEnter .7s cubic-bezier(.2,.85,.2,1) both;animation-delay:calc(var(--motion-i,0) * 68ms)}
    @keyframes ienFieldEnter{0%{opacity:0;transform:translateY(18px) scale(.94)}58%{opacity:1;transform:translateY(-4px) scale(1.018)}100%{opacity:1;transform:translateY(0) scale(1)}}
    .field.motion-chosen{animation:ienFieldChosen .56s cubic-bezier(.2,.85,.2,1) both}
    @keyframes ienFieldChosen{0%{transform:scale(.95)}55%{transform:scale(1.045) translateY(-5px)}100%{transform:scale(1) translateY(0)}}
    .guide.motion-enter{animation:ienGuideEnter .66s cubic-bezier(.2,.82,.2,1) both;animation-delay:calc(var(--motion-i,0) * 48ms)}
    @keyframes ienGuideEnter{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    .browse{position:relative;isolation:isolate}
    .browse.stage-activated:before{content:"";position:absolute;z-index:-1;left:50%;top:120px;width:min(940px,92vw);height:360px;transform:translateX(-50%);pointer-events:none;background:radial-gradient(ellipse at center,rgba(31,159,132,.075),rgba(63,111,207,.04) 42%,transparent 73%);animation:ienAmbient 3.4s ease-in-out infinite alternate}
    @keyframes ienAmbient{from{opacity:.58;scale:.96}to{opacity:1;scale:1.04}}

    @media(hover:hover) and (pointer:fine){.stage.kinetic-hover{transition:transform .11s linear,box-shadow .2s ease!important}}

    @media(max-width:620px){
      .hero-showcase[data-depth="1"] .doc-one{transform:rotate(-5deg) translate3d(10px,-10px,0) scale(1.045)!important}
      .hero-showcase[data-depth="1"] .doc-two{transform:rotate(2deg) translate3d(3px,6px,0) scale(.93)!important;opacity:.8}
      .hero-showcase[data-depth="1"] .doc-three{transform:rotate(8deg) translate3d(-3px,10px,0) scale(.89)!important;opacity:.64}
      .hero-showcase[data-depth="2"] .doc-one{transform:rotate(-8deg) translate3d(2px,9px,0) scale(.91)!important;opacity:.72}
      .hero-showcase[data-depth="2"] .doc-two{transform:rotate(0deg) translate3d(0,-10px,0) scale(1.055)!important}
      .hero-showcase[data-depth="2"] .doc-three{transform:rotate(8deg) translate3d(-2px,9px,0) scale(.91)!important;opacity:.72}
      .hero-showcase[data-depth="3"] .doc-one{transform:rotate(-8deg) translate3d(4px,10px,0) scale(.89)!important;opacity:.64}
      .hero-showcase[data-depth="3"] .doc-two{transform:rotate(-2deg) translate3d(-3px,6px,0) scale(.93)!important;opacity:.8}
      .hero-showcase[data-depth="3"] .doc-three{transform:rotate(5deg) translate3d(-10px,-10px,0) scale(1.045)!important}
      .stages .stage{animation-duration:7.2s}
      .stages.has-stage-selection .stage:not(.active){opacity:.78;transform:scale(.97) translateY(3px)!important}
      .stages.has-stage-selection .stage.active{transform:translateY(-7px) scale(1.022)!important}
      .stage-selection-halo{filter:blur(10px);border-radius:22px}
    }

    @media(prefers-reduced-motion:reduce){
      .hero-showcase .doc,.hero-showcase .folder-back,.stages .stage,.stage-icon,.browse.stage-activated:before{animation:none!important;transition:none!important}
    }
  `;
  document.head.appendChild(style);

  function nextDepth(){
    const visual = qs('.hero-showcase');
    if (!visual) return;
    depth = depth % 3 + 1;
    visual.dataset.depth = String(depth);
  }

  function setupHeroDepth(){
    const visual = qs('.hero-showcase');
    if (!visual) return;
    visual.dataset.depth = '2';
    if (reduced()) return;

    let visible = true;
    const start = () => {
      if (!visible || document.hidden || depthTimer) return;
      depthTimer = setInterval(nextDepth, 2350);
    };
    const stop = () => {
      if (depthTimer) clearInterval(depthTimer);
      depthTimer = null;
    };
    new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      visible ? start() : stop();
    }, {threshold:.18}).observe(visual);

    visual.addEventListener('click', nextDepth);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  }

  function ensureHalo(){
    const stages = qs('.stages');
    if (!stages) return null;
    let halo = qs('.stage-selection-halo', stages);
    if (!halo){
      halo = document.createElement('span');
      halo.className = 'stage-selection-halo';
      stages.prepend(halo);
    }
    return halo;
  }

  function syncStageState(){
    const stages = qs('.stages');
    if (!stages) return;
    const active = qs('.stage.active', stages);
    const halo = ensureHalo();
    const browse = qs('.browse');

    if (!active){
      stages.classList.remove('has-stage-selection');
      browse?.classList.remove('stage-activated');
      return;
    }

    stages.classList.add('has-stage-selection');
    browse?.classList.add('stage-activated');
    if (!halo) return;
    const parent = stages.getBoundingClientRect();
    const card = active.getBoundingClientRect();
    halo.style.width = `${card.width}px`;
    halo.style.height = `${card.height}px`;
    halo.style.transform = `translate3d(${card.left-parent.left}px,${card.top-parent.top}px,0) scale(1.08)`;
  }

  function animateStage(id){
    const stages = qs('.stages');
    if (!stages) return;
    syncStageState();
    const selected = qsa('.stage', stages).find(el => el.dataset.stage === id) || qs('.stage.active', stages);

    if (selected){
      selected.classList.remove('motion-pop');
      void selected.offsetWidth;
      selected.classList.add('motion-pop');
      setTimeout(() => selected.classList.remove('motion-pop'), 820);
    }

    if (!reduced()){
      qsa('.stage', stages).forEach((card, i) => {
        if (card === selected || !card.animate) return;
        const side = i % 2 ? 1 : -1;
        card.animate([
          {transform:`translate3d(${side*10}px,6px,0) scale(.95)`,opacity:.64},
          {transform:'translate3d(0,0,0) scale(.965)',opacity:.72}
        ], {duration:520, delay:i*42, easing:'cubic-bezier(.2,.8,.2,1)'});
      });
    }

    const fields = qs('.fields-area');
    if (fields){
      fields.classList.remove('motion-awake');
      void fields.offsetWidth;
      fields.classList.add('motion-awake');
      qsa('.field', fields).forEach((field, i) => {
        field.style.setProperty('--motion-i', i);
        field.classList.remove('motion-enter');
        void field.offsetWidth;
        field.classList.add('motion-enter');
      });
    }
  }

  function animateField(name){
    const fields = qs('.fields-area');
    if (!fields) return;
    const chosen = qsa('.field', fields).find(el => el.dataset.field === name) || qs('.field.active', fields);
    if (chosen){
      chosen.classList.remove('motion-chosen');
      void chosen.offsetWidth;
      chosen.classList.add('motion-chosen');
      setTimeout(() => chosen.classList.remove('motion-chosen'), 620);
    }
    qsa('.guide').forEach((guide, i) => {
      guide.style.setProperty('--motion-i', i);
      guide.classList.remove('motion-enter');
      void guide.offsetWidth;
      guide.classList.add('motion-enter');
    });
  }

  function setupStageInteractions(){
    document.addEventListener('click', e => {
      const stage = e.target.closest?.('[data-stage]');
      if (stage){
        const id = stage.dataset.stage;
        if (!reduced() && stage.animate){
          stage.animate([{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1)'}], {duration:180,easing:'ease-out'});
        }
        requestAnimationFrame(() => requestAnimationFrame(() => animateStage(id)));
        return;
      }
      const field = e.target.closest?.('[data-field]');
      if (field && !field.disabled){
        const name = field.dataset.field;
        requestAnimationFrame(() => requestAnimationFrame(() => animateField(name)));
      }
    }, true);

    addEventListener('ien:rendered', () => requestAnimationFrame(syncStageState));
    addEventListener('resize', () => requestAnimationFrame(syncStageState), {passive:true});
    addEventListener('orientationchange', () => setTimeout(syncStageState, 180), {passive:true});
    syncStageState();
  }

  function setupDesktopTilt(){
    if (reduced() || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const stages = qs('.stages');
    if (!stages) return;

    stages.addEventListener('pointermove', e => {
      const card = e.target.closest('.stage');
      if (!card || card.classList.contains('active')) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX-r.left)/r.width-.5;
      const y = (e.clientY-r.top)/r.height-.5;
      card.classList.add('kinetic-hover');
      card.style.setProperty('transform', `perspective(760px) rotateX(${-y*6}deg) rotateY(${x*7}deg) translateY(-6px) scale(1.01)`, 'important');
    });
    stages.addEventListener('pointerout', e => {
      const card = e.target.closest('.stage');
      if (!card) return;
      card.classList.remove('kinetic-hover');
      card.style.removeProperty('transform');
    });
  }

  function init(){
    setupHeroDepth();
    setupStageInteractions();
    setupDesktopTilt();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
