(() => {
  const SPECIALS = {
    periods: {
      field: 'الفترات اللاصفية',
      mini: 'الفترات اللاصفية',
      title: 'اختر الفترة',
      description: 'اختر فترة اليوم المدرسي لعرض أدلتها للمرحلة المحددة',
      prop: 'period',
      catalogKey: 'extracurricularPeriods',
      defaults: [
        { id: 71, label: 'الحضور والاصطفاف الصباحي' },
        { id: 72, label: 'الروتين اليومي' },
        { id: 73, label: 'صلاة الظهر والمناوبة' }
      ]
    },
    occasions: {
      field: 'الأيام والمناسبات',
      mini: 'الأيام والمناسبات',
      title: 'اختر نوع المناسبة',
      description: 'اختر الأيام الوطنية أو الأيام العالمية لعرض الأدلة للمرحلة المحددة',
      prop: 'occasion',
      catalogKey: 'occasionGroups',
      defaults: [
        { id: 61, label: 'الأيام الوطنية' },
        { id: 62, label: 'الأيام العالمية' }
      ]
    }
  };
  const COMPETITION_FIELD = 'المسابقات';

  function start() {
    if (typeof state === 'undefined' || typeof renderFields !== 'function' || typeof filtered !== 'function' || typeof renderGuides !== 'function' || typeof render !== 'function') {
      setTimeout(start, 80);
      return;
    }
    if (window.__IEN_SPECIAL_SECTIONS_READY__) return;
    window.__IEN_SPECIAL_SECTIONS_READY__ = true;

    state.specialGroup = state.specialGroup || null;

    const specialConfig = field =>
      Object.values(SPECIALS).find(config => normalize(config.field) === normalize(field)) || null;

    const groupsFor = config => {
      if (!config) return [];
      const fromCatalog = Array.isArray(catalog?.[config.catalogKey]) ? catalog[config.catalogKey] : [];
      return fromCatalog.length ? fromCatalog : config.defaults;
    };

    const isCompetition = field => normalize(field) === normalize(COMPETITION_FIELD);

    function specialCount(field) {
      if (isCompetition(field)) {
        return sourceItems.filter(item => normalize(item.field) === normalize(COMPETITION_FIELD)).length;
      }
      return sourceItems.filter(item =>
        stageFor(item) === state.stage &&
        normalize(item.field) === normalize(field)
      ).length;
    }

    function groupCount(config, label) {
      return sourceItems.filter(item =>
        stageFor(item) === state.stage &&
        normalize(item.field) === normalize(config.field) &&
        normalize(item[config.prop]) === normalize(label)
      ).length;
    }

    function ensureSpecialArea() {
      let area = document.getElementById('specialArea');
      if (area) return area;
      const fieldList = document.getElementById('fieldList');
      if (!fieldList) return null;

      area = document.createElement('div');
      area.id = 'specialArea';
      area.className = 'special-area hidden';
      area.innerHTML = `
        <div class="special-heading">
          <span class="special-mini" id="specialMini"></span>
          <h3 id="specialTitle"></h3>
          <p id="specialDescription"></p>
        </div>
        <div id="specialList" class="special-list"></div>`;
      fieldList.insertAdjacentElement('afterend', area);
      return area;
    }

    function renderSpecialArea() {
      const area = ensureSpecialArea();
      if (!area) return;
      const config = specialConfig(state.field);
      const active = Boolean(state.stage && config);
      area.classList.toggle('hidden', !active);
      if (!active) return;

      area.dataset.section = normalize(config.field) === normalize('الأيام والمناسبات') ? 'occasions' : 'periods';
      area.querySelector('#specialMini').textContent = config.mini;
      area.querySelector('#specialTitle').textContent = config.title;
      area.querySelector('#specialDescription').textContent = config.description;

      const list = area.querySelector('#specialList');
      list.innerHTML = groupsFor(config).map((group, index) => {
        const count = groupCount(config, group.label);
        return `<button class="special-card ${normalize(state.specialGroup) === normalize(group.label) ? 'active' : ''}" data-special-group="${escapeAttr(group.label)}" data-special-index="${index}">
          <span class="special-icon" aria-hidden="true"></span>
          <span class="special-copy"><strong>${escapeHtml(group.label)}</strong><small>${count ? `${count} دليل` : 'لا توجد ملفات منشورة حاليًا'}</small></span>
          <span class="special-check" aria-hidden="true">✓</span>
        </button>`;
      }).join('');

      list.querySelectorAll('[data-special-group]').forEach(btn => btn.addEventListener('click', () => {
        state.specialGroup = btn.dataset.specialGroup;
        render();
        document.getElementById('guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
    }

    renderFields = function () {
      $('fieldList').innerHTML = FIELDS.map(f => {
        const special = Boolean(specialConfig(f)) || isCompetition(f);
        const count = special ? specialCount(f) : fieldCount(f);
        const icon = FIELD_ICONS[f] || FIELD_ICONS['المواطنة والحياة'];
        const specialClass = normalize(f) === normalize('الأيام والمناسبات')
          ? 'occasion-field'
          : normalize(f) === normalize('الفترات اللاصفية')
            ? 'extracurricular-field'
            : isCompetition(f) ? 'competition-field' : '';
        return `<button class="field ${state.field === f ? 'active' : ''} ${specialClass}" data-field="${escapeAttr(f)}" ${!state.stage ? 'disabled' : ''}>${icon}<span>${escapeHtml(f)}${count ? ` · ${count}` : ''}</span></button>`;
      }).join('');

      document.querySelectorAll('[data-field]').forEach(btn => btn.addEventListener('click', () => {
        if (!state.stage) return;
        state.field = btn.dataset.field;
        state.specialGroup = null;
        render();
        const config = specialConfig(state.field);
        const target = config ? document.getElementById('specialArea') : document.getElementById('guides');
        target?.scrollIntoView({ behavior: 'smooth', block: config ? 'center' : 'start' });
      }));
    };

    filtered = function () {
      const q = normalize(state.query);
      const config = specialConfig(state.field);
      return sourceItems.filter(item => {
        const text = normalize(`${item.title || ''} ${item.field || ''} ${item.period || ''} ${item.occasion || ''} ${item.stage || ''}`);
        const competitionSelected = isCompetition(state.field);
        const stageMatches = competitionSelected && normalize(item.field) === normalize(COMPETITION_FIELD)
          ? true
          : (!state.stage || stageFor(item) === state.stage);
        const fieldMatches = !state.field || normalize(item.field) === normalize(state.field);
        const groupMatches = !config || !state.specialGroup || normalize(item[config.prop]) === normalize(state.specialGroup);
        return stageMatches && fieldMatches && groupMatches && (!q || text.includes(q));
      });
    };

    renderGuides = function () {
      const config = specialConfig(state.field);
      const competitionSelected = isCompetition(state.field);

      if (config && state.stage && !state.specialGroup && !state.query) {
        $('resultMeta').textContent = `اختر من ${config.field} لعرض الأدلة`;
        $('guideGrid').innerHTML = empty(config.title, config.description);
        return;
      }

      const list = filtered();
      if (state.query && !state.stage) $('resultMeta').textContent = `${list.length} نتيجة بحث`;
      else if (state.stage && config && state.specialGroup) $('resultMeta').textContent = `${list.length} دليل في ${state.specialGroup}`;
      else if (state.stage && competitionSelected) $('resultMeta').textContent = `${list.length} ملف مسابقات رسمي · مشترك لجميع المراحل`;
      else if (state.stage && state.field) $('resultMeta').textContent = `${list.length} نتيجة في ${state.field}`;
      else if (state.stage) $('resultMeta').textContent = `${list.length} دليل في المرحلة المختارة`;
      else $('resultMeta').textContent = 'اختر المرحلة والمجال لعرض الأدلة';

      if (!sourceItems.length) {
        $('guideGrid').innerHTML = empty('جارٍ تحميل أحدث الأدلة', 'يتم الآن قراءة أحدث نسخة متاحة من فهرس عين.');
        return;
      }
      if (!state.stage && !state.query) {
        $('guideGrid').innerHTML = empty('اختر المرحلة أولًا', 'بعد اختيار المرحلة اختر المجال أو القسم المطلوب لتظهر الأدلة مباشرة.');
        return;
      }
      if (!list.length) {
        $('guideGrid').innerHTML = empty('لا توجد نتائج مطابقة', 'جرّب تغيير المرحلة أو القسم أو عبارة البحث.');
        return;
      }

      $('guideGrid').innerHTML = list.map(item => `<article class="guide ${item.period || item.occasion ? 'special-guide' : ''} ${normalize(item.field) === normalize(COMPETITION_FIELD) ? 'competition-guide' : ''}">
        <div class="guide-top"><span class="pdf">PDF</span><span class="guide-stage">${escapeHtml(item.stage || STAGES.find(s => s.id === stageFor(item))?.label || '')}</span></div>
        <h4>${escapeHtml(item.title || 'دليل نشاط')}</h4>
        <p>${escapeHtml(item.occasion || item.period || item.field || '')}</p>
        ${item.pdfUrl ? `<a class="open-guide" target="_blank" rel="noopener noreferrer" href="${escapeAttr(item.pdfUrl)}"><span>فتح الدليل</span>${openGuideIcon}</a>` : `<span class="open-guide disabled"><span>الرابط غير متاح</span><span>—</span></span>`}
      </article>`).join('');
    };

    render = function () {
      if (!specialConfig(state.field)) state.specialGroup = null;
      renderStages();
      renderFields();
      renderSpecialArea();
      renderGuides();
      renderSync();
      window.IEN_APP = {
        catalog,
        items: sourceItems,
        stages: STAGES,
        fields: FIELDS,
        specialGroup: state.specialGroup
      };
      window.dispatchEvent(new CustomEvent('ien:rendered', { detail: { count: sourceItems.length } }));
    };

    render();
  }

  start();
})();
