/* ===================================================================
   Easy to Buy — Dashboard page logic
   Data: DASHBOARD_DATA (data.js). Utilities: shared.js.
   =================================================================== */

(function () {
  const contacts = DASHBOARD_DATA.contacts;
  const wins = DASHBOARD_DATA.wins;
  const meta = DASHBOARD_DATA.meta;

  const mainArea = document.getElementById('main-area');

  // currentView drives what the main area renders:
  //   {type:'all'}                  — sidebar "All": suggested touches + top prospects
  //   {type:'stage', stage:'Pitching'} — sidebar single-stage card list
  //   {type:'allFlat'}              — stat card: every active prospect
  //   {type:'overdueFlat'}          — stat card: overdue contacts only
  //   {type:'wins'}                 — stat card: closed deals
  let currentView = { type: 'all' };

  markActiveNav('dashboard');

  // ---------- header stats (hero + stat row + sidebar counts) ----------

  function renderHeaderStats() {
    document.getElementById('hero-total').textContent = Fmt.usdPrecise(meta.totalFeePotential);
    document.getElementById('hero-closed').textContent = Fmt.usdPrecise(meta.closedDealsTotalFee12mo) + ' closed';

    const pct = meta.totalFeePotential > 0
      ? Math.round((meta.closingStageValue / meta.totalFeePotential) * 100)
      : 0;
    document.getElementById('hero-progress-fill').style.width = pct + '%';
    document.getElementById('hero-progress-caption').textContent =
      `${pct}% of total pipeline value (${Fmt.usdPrecise(meta.totalFeePotential)}) is currently in the closing stage`;

    document.getElementById('stat-active-value').textContent = meta.activeProspects;
    document.getElementById('stat-closed-value').textContent = meta.closedDeals;
    document.getElementById('stat-overdue-value').textContent = meta.overdueTouches;

    // "Touched within cadence" = On track or Due soon (i.e. not Overdue and
    // not Needs requalification). Same formula used on the Partners page,
    // kept in one place isn't practical across two static files, so this
    // comment is the source of truth both reference.
    const inCadence = meta.onTrackTouches + meta.dueSoonTouches;
    const compliancePct = meta.activeProspects > 0 ? Math.round((inCadence / meta.activeProspects) * 100) : 0;
    const complianceEl = document.getElementById('stat-compliance-value');
    if (complianceEl) complianceEl.textContent = compliancePct + '%';

    document.getElementById('count-all').textContent = meta.activeProspects;
    document.getElementById('count-prospecting').textContent = meta.stageCounts.Prospecting || 0;
    document.getElementById('count-pitching').textContent = meta.stageCounts.Pitching || 0;
    document.getElementById('count-closing').textContent = meta.stageCounts.Closing || 0;
  }

  // ---------- "All" view: suggested touches + top prospects ----------

  function renderTouchRow(c) {
    return `
      <div class="touch-row clickable-card" data-contact-id="${c.id}" tabindex="0" role="button" aria-label="View ${escapeHTML(c.company)} details">
        <div class="touch-main">
          <div class="touch-company">${escapeHTML(c.company)}</div>
          <div class="touch-contact">${escapeHTML(c.contactName)}</div>
        </div>
        <div class="touch-days">${Fmt.daysLabel(c.daysSinceLastTouch)}</div>
        ${Badge.touch(c.touchSeverity)}
      </div>
    `;
  }

  function renderProspectRow(c) {
    return `
      <div class="prospect-row clickable-card" data-contact-id="${c.id}" tabindex="0" role="button" aria-label="View ${escapeHTML(c.company)} details">
        <div class="prospect-main">
          <div class="prospect-company">${escapeHTML(c.company)}</div>
          <div class="prospect-fee">${Fmt.usd(c.feePotential)} fee potential</div>
        </div>
        ${Badge.stage(c.stage)}
      </div>
    `;
  }

  function renderAllView() {
    mainArea.innerHTML = `
      ${FilterBar.render({ id: 'filter-all', stage: true, priority: true, touch: true, whale: true })}
      <div class="all-view">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Suggested touches</span>
            <span class="panel-header-right">
              <span class="panel-subtitle" id="suggested-touches-subtitle">Overdue or due soon</span>
              <a href="touches.html" class="panel-view-all">View all</a>
            </span>
          </div>
          <div class="panel-body" id="suggested-touches-body"></div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Top prospects</span>
            <span class="panel-header-right">
              <span class="panel-subtitle">By fee potential</span>
              <a href="contacts.html" class="panel-view-all">View all</a>
            </span>
          </div>
          <div class="panel-body" id="top-prospects-body"></div>
        </div>
      </div>
    `;

    const filterEl = document.getElementById('filter-all');

    function update(state) {
      const filtered = FilterBar.applyToContacts(contacts, state);

      // Needs-requalification contacts are deliberately excluded here —
      // the framework says decide whether to keep pursuing them, not send
      // a routine touch, so this "send a touch" list only ever covers
      // Overdue and Due soon.
      const touchCandidates = sortByTouchUrgency(
        filtered.filter(c => c.touchSeverity === 'overdue' || c.touchSeverity === 'duesoon')
      ).slice(0, 7);

      const suggestedBody = document.getElementById('suggested-touches-body');
      if (touchCandidates.length) {
        suggestedBody.innerHTML = touchCandidates.map(renderTouchRow).join('');
      } else if (state.touch && state.touch !== 'All' && state.touch !== 'overdue' && state.touch !== 'duesoon') {
        // The filter itself is the reason this list is empty — say so,
        // rather than showing the same generic message as "nothing's due."
        suggestedBody.innerHTML = `<div class="empty-state">This list only ever shows Overdue or Due soon contacts — your Touch status filter is set to "${escapeHTML(SEVERITY_LABEL[state.touch] || state.touch)}," so nothing matches.</div>`;
      } else {
        suggestedBody.innerHTML = `<div class="empty-state">No follow-ups due right now.</div>`;
      }

      const topProspects = filtered.slice()
        .sort((a, b) => (b.feePotential || 0) - (a.feePotential || 0))
        .slice(0, 7);
      document.getElementById('top-prospects-body').innerHTML =
        topProspects.length ? topProspects.map(renderProspectRow).join('')
          : `<div class="empty-state">No contacts match these filters.</div>`;

      FilterBar.setCount(filterEl, filtered.length, contacts.length);
    }

    FilterBar.bind(filterEl, update);
    update(FilterBar.readState(filterEl));
  }

  // ---------- flat card list (single stage / all / overdue) ----------

  function renderContactCard(c) {
    return `
      <div class="contact-card clickable-card" data-contact-id="${c.id}" tabindex="0" role="button" aria-label="View ${escapeHTML(c.company)} details">
        <div class="contact-card-left">
          <div class="contact-card-header">
            <span class="contact-company">${escapeHTML(c.company)}</span>
            ${Badge.stage(c.stage)}
            ${Badge.priority(c.priority)}
            ${Badge.whale(c.whaleTag)}
            ${Badge.touch(c.touchSeverity)}
          </div>
          <div class="contact-name">${escapeHTML(c.contactName)} &middot; ${escapeHTML(c.city)}, ${escapeHTML(c.state)}</div>
          <div class="contact-status">${escapeHTML(c.status)}</div>
          <div class="contact-meta">
            <span><strong>MW partner:</strong> ${escapeHTML(c.mwPartner)}</span>
            <span><strong>Last touch:</strong> ${escapeHTML(c.lastTouch)} (${Fmt.daysLabel(c.daysSinceLastTouch)})</span>
          </div>
        </div>
        <div class="contact-card-right">
          <div class="contact-fee">${Fmt.usd(c.feePotential)}</div>
          <div class="contact-fee-label">Fee potential</div>
        </div>
      </div>
    `;
  }

  function renderCardListView({ baseList, showStageFilter, emptyMessage, heading }) {
    mainArea.innerHTML = `
      ${heading ? `<div class="view-heading">${escapeHTML(heading)} <span class="view-heading-count">(${baseList.length})</span></div>` : ''}
      ${FilterBar.render({ id: 'filter-cards', stage: showStageFilter, priority: true, touch: true, whale: true })}
      <div class="stage-view" id="card-list-body"></div>
    `;

    const filterEl = document.getElementById('filter-cards');
    const body = document.getElementById('card-list-body');

    function update(state) {
      const filtered = FilterBar.applyToContacts(baseList, state)
        .sort((a, b) => (b.feePotential || 0) - (a.feePotential || 0));
      body.innerHTML = filtered.length ? filtered.map(renderContactCard).join('')
        : `<div class="empty-state">${emptyMessage}</div>`;
      FilterBar.setCount(filterEl, filtered.length, baseList.length);
    }

    FilterBar.bind(filterEl, update);
    update(FilterBar.readState(filterEl));
  }

  // ---------- wins / closed deals list (paginated) ----------

  function renderWinRow(w) {
    return `
      <div class="win-row">
        <div class="win-company">${escapeHTML(w.company)}</div>
        <div>${escapeHTML(w.contactName)}</div>
        <div class="cell-secondary">${escapeHTML(w.natureOfWork)}</div>
        <div class="cell-secondary">${escapeHTML(w.mwPartner)}</div>
        <div class="cell-secondary">${escapeHTML(w.closeDate)}</div>
        <div class="win-fee">${Fmt.usd(w.feeValue)}</div>
      </div>
    `;
  }

  function renderWinsView() {
    mainArea.innerHTML = `
      ${FilterBar.render({
        id: 'filter-wins', sector: true, partner: true, search: true,
        searchPlaceholder: 'Search company or contact…',
        sectorOptions: meta.natureOfWorkOptions, partnerOptions: meta.mwPartnerOptions,
      })}
      <div class="wins-table-wrap">
        <div class="win-row win-row-header">
          <div>Company</div><div>Contact</div><div>Sector / nature of work</div>
          <div>MW partner</div><div>Close date</div><div class="win-fee">Fee value</div>
        </div>
        <div id="wins-body"></div>
      </div>
      <div class="load-more-wrap" id="wins-load-more-wrap"></div>
    `;

    const filterEl = document.getElementById('filter-wins');
    const body = document.getElementById('wins-body');
    const loadMoreWrap = document.getElementById('wins-load-more-wrap');
    const PAGE_SIZE = 25;

    let currentFiltered = [];
    let visibleCount = PAGE_SIZE;

    function renderVisible() {
      const toShow = currentFiltered.slice(0, visibleCount);
      body.innerHTML = toShow.length ? toShow.map(renderWinRow).join('')
        : `<div class="empty-state">No closed deals match these filters.</div>`;
      FilterBar.setCount(filterEl, currentFiltered.length, wins.length);

      const remaining = currentFiltered.length - visibleCount;
      if (remaining > 0) {
        loadMoreWrap.innerHTML = `<button type="button" class="load-more-btn" id="wins-load-more-btn">Load 25 more (${remaining} remaining)</button>`;
        document.getElementById('wins-load-more-btn').addEventListener('click', () => {
          visibleCount += PAGE_SIZE;
          renderVisible();
        });
      } else {
        loadMoreWrap.innerHTML = '';
      }
    }

    function update(state) {
      currentFiltered = FilterBar.applyToWins(wins, state)
        .sort((a, b) => b.closeDate.localeCompare(a.closeDate));
      visibleCount = PAGE_SIZE; // any filter change resets pagination
      renderVisible();
    }

    FilterBar.bind(filterEl, update);
    update(FilterBar.readState(filterEl));
  }

  // ---------- render dispatch ----------

  function renderMain() {
    if (currentView.type === 'all') {
      renderAllView();
    } else if (currentView.type === 'stage') {
      renderCardListView({
        baseList: contacts.filter(c => c.stage === currentView.stage),
        showStageFilter: false,
        emptyMessage: `No contacts currently in ${escapeHTML(currentView.stage)}.`,
        heading: currentView.stage,
      });
    } else if (currentView.type === 'allFlat') {
      renderCardListView({
        baseList: contacts,
        showStageFilter: true,
        emptyMessage: 'No contacts match these filters.',
        heading: 'Active prospects',
      });
    } else if (currentView.type === 'overdueFlat') {
      renderCardListView({
        baseList: contacts.filter(c => c.touchSeverity === 'overdue'),
        showStageFilter: true,
        emptyMessage: 'No overdue contacts match these filters.',
        heading: 'Overdue touches',
      });
    } else if (currentView.type === 'wins') {
      renderWinsView();
    }
  }

  function setActiveStageButton() {
    document.querySelectorAll('.stage-btn').forEach(btn => {
      const isStageView = currentView.type === 'all' || currentView.type === 'stage';
      const matches = currentView.type === 'all'
        ? btn.dataset.stage === 'All'
        : btn.dataset.stage === currentView.stage;
      btn.classList.toggle('active', isStageView && matches);
    });
  }

  function setActiveStatCard() {
    const statKeyByView = { allFlat: 'stat-active', wins: 'stat-closed', overdueFlat: 'stat-overdue' };
    document.querySelectorAll('.stat-card').forEach(card => {
      card.classList.toggle('active', statKeyByView[currentView.type] === card.id);
    });
  }

  function goToView(view) {
    currentView = view;
    setActiveStageButton();
    setActiveStatCard();
    renderMain();
    mainArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- wire up sidebar ----------

  document.querySelectorAll('.stage-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = btn.dataset.stage;
      goToView(stage === 'All' ? { type: 'all' } : { type: 'stage', stage });
    });
  });

  // ---------- wire up stat cards (only the 3 clickable ones have data-stat) ----------

  document.querySelectorAll('.stat-card[data-stat]').forEach(card => {
    card.addEventListener('click', () => {
      goToView({ type: card.dataset.stat });
    });
  });

  // ---------- init ----------

  renderHeaderStats();
  renderMain();
})();
