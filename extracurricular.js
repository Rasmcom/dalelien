(() => {
  const SPECIAL_FIELD = 'الفترات اللاصفية';
  const DEFAULT_PERIODS = [
    { id: 71, label: 'الحضور والاصطفاف الصباحي' },
    { id: 72, label: 'الروتين اليومي' },
    { id: 73, label: 'صلاة الظهر والمناوبة' }
  ];

  function start() {
    if (typeof state === 'undefined' || typeof renderFields !== 'function' || typeof filtered !== 'function' || typeof renderGuides !== 'function' || typeof render !== 'function') {
      setTimeout(start, 80);
      return;
    }
    if (window.__IEN_EXTRACURRICULAR_READY__) return;
    window.__IEN_EXTRACURRICULAR_READY__ = true;

    const periods = () => {
      const fromCatalog = Array.isArray(catalog?.extracurricularPeriods) ? catalog.extracurricularPeriods : [];
      return fromCatalog.length ? fromCatalog : DEFAULT_PERIODS;
    };

    state.period = state.period || null;
    const originalRenderGuides = renderGuides;

    function periodCount(label) {
      return sourceItems.filter(item =>
        stageFor(item) === state.stage &&
        normalize(item.field) === normalize(SPECIAL_FIELD) &&
        normalize(item.period) === normalize(label)
      ).length;
    }

    function ensurePeriodArea() {
      let area = document.getElementById('periodArea');
      if (area) return area;
      const fieldList = document.getElementById('fieldList');
      if (!fieldList) return null;

      area = document.createElement('div');
      area.id = 'periodArea';
      area.className = 'period-area hidden';
      area.innerHTML = `
        <div class="period-heading">
          <span class="period-mini">الفترات اللاصفية</span>
          <h3>اختر الفترة</h3>
          <p>اختر فترة اليوم المدرسي لعرض أدلتها للمرحلة المحددة</p>
        </div>
        <div id="periodList" class="period-list"></div>`;
      fieldList.insertAdjacentElement('afterend', area);
      return area;
    }

    function renderPeriods() {
      const area = ensurePeriodArea();
      if (!area) return;
      const active = Boolean(state.stage) && normalize(state.field) === normalize(SPECIAL_FIELD);
      area.classList.toggle('hidden', !active);
      if (!active) return;

      const list = area.querySelector('#periodList');
      list.innerHTML = periods().map((period, index) => {
        const count = periodCount(period.label);
        return `<button class="period-card ${normalize(state.period) === normalize(period.label) ? 'active' : ''}" data-period="${escapeAttr(period.label)}" data-period-index="${index}">
          <span class="period-icon" aria-hidden="true"></span>
          <span class="period-copy"><strong>${escapeHtml(period.label)}</strong><small>${count ? `${count} دليل` : 'بانتظار التحديث'}</small></span>
          <span class="period-check" aria-hidden="true">✓</span>
        </button>`;
      }).join('');

      list.querySelectorAll('[data-period]').forEach(btn => btn.addEventListener('click', () => {
        state.period = btn.dataset.period;
        render();
        document.getElementById('guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
    }

    renderFields = function () {
      $('fieldList').innerHTML = FIELDS.map(f => {
        const count = fieldCount(f);
        const icon = FIELD_ICONS[f] || FIELD_ICONS['المواطنة والحياة'];
        const special = normalize(f) === normalize(SPECIAL_FIELD);
        return `<button class="field ${state.field === f ? 'active' : ''} ${special ? 'extracurricular-field' : ''}" data-field="${escapeAttr(f)}" ${!state.stage ? 'disabled' : ''}>${icon}<span>${escapeHtml(f)}${count ? ` · ${count}` : ''}</span></button>`;
      }).join('');

      document.querySelectorAll('[data-field]').forEach(btn => btn.addEventListener('click', () => {
        if (!state.stage) return;
        state.field = btn.dataset.field;
        state.period = null;
        render();
        const target = normalize(state.field) === normalize(SPECIAL_FIELD)
          ? document.getElementById('periodArea')
          : document.getElementById('guides');
        target?.scrollIntoView({ behavior: 'smooth', block: normalize(state.field) === normalize(SPECIAL_FIELD) ? 'center' : 'start' });
      }));
    };

    filtered = function () {
      const q = normalize(state.query);
      return sourceItems.filter(item => {
        const text = normalize(`${item.title || ''} ${item.field || ''} ${item.period || ''} ${item.stage || ''}`);
        const isSpecial = normalize(state.field) === normalize(SPECIAL_FIELD);
        return (!state.stage || stageFor(item) === state.stage) &&
          (!state.field || normalize(item.field) === normalize(state.field)) &&
          (!isSpecial || !state.period || normalize(item.period) === normalize(state.period)) &&
          (!q || text.includes(q));
      });
    };

    renderGuides = function () {
      const isSpecial = normalize(state.field) === normalize(SPECIAL_FIELD);

      if (isSpecial && state.stage && !state.period && !state.query) {
        $('resultMeta').textContent = 'اختر إحدى الفترات اللاصفية لعرض أدلتها';
        $('guideGrid').innerHTML = empty('اختر الفترة', 'الحضور والاصطفاف الصباحي، الروتين اليومي، أو صلاة الظهر والمناوبة.');
        return;
      }

      const list = filtered();
      if (state.query && !state.stage) $('resultMeta').textContent = `${list.length} نتيجة بحث`;
      else if (state.stage && isSpecial && state.period) $('resultMeta').textContent = `${list.length} دليل في ${state.period}`;
      else if (state.stage && state.field) $('resultMeta').textContent = `${list.length} نتيجة في ${state.field}`;
      else if (state.stage) $('resultMeta').textContent = `${list.length} دليل في المرحلة المختارة`;
      else $('resultMeta').textContent = 'اختر المرحلة والمجال لعرض الأدلة';

      if (!sourceItems.length) {
        $('guideGrid').innerHTML = empty('جارٍ تحميل أحدث الأدلة', 'يتم الآن قراءة أحدث نسخة متاحة من فهرس عين.');
        return;
      }
      if (!state.stage && !state.query) {
        $('guideGrid').innerHTML = empty('اختر المرحلة أولًا', 'بعد اختيار المرحلة اختر المجال أو الفترات اللاصفية لتظهر الأدلة المرتبطة به مباشرة.');
        return;
      }
      if (!list.length) {
        $('guideGrid').innerHTML = empty('لا توجد نتائج مطابقة', 'جرّب تغيير المرحلة أو المجال أو الفترة أو عبارة البحث.');
        return;
      }

      $('guideGrid').innerHTML = list.map(item => `<article class="guide ${item.period ? 'period-guide' : ''}">
        <div class="guide-top"><span class="pdf">PDF</span><span class="guide-stage">${escapeHtml(item.stage || STAGES.find(s => s.id === stageFor(item))?.label || '')}</span></div>
        <h4>${escapeHtml(item.title || 'دليل نشاط')}</h4>
        <p>${escapeHtml(item.period || item.field || '')}</p>
        ${item.pdfUrl ? `<a class="open-guide" target="_blank" rel="noopener noreferrer" href="${escapeAttr(item.pdfUrl)}"><span>فتح الدليل</span>${openGuideIcon}</a>` : `<span class="open-guide disabled"><span>الرابط غير متاح</span><span>—</span></span>`}
      </article>`).join('');
    };

    render = function () {
      if (normalize(state.field) !== normalize(SPECIAL_FIELD)) state.period = null;
      renderStages();
      renderFields();
      renderPeriods();
      renderGuides();
      renderSync();
      window.IEN_APP = { catalog, items: sourceItems, stages: STAGES, fields: FIELDS, periods: periods() };
      window.dispatchEvent(new CustomEvent('ien:rendered', { detail: { count: sourceItems.length } }));
    };

    render();
  }

  start();
})();
