/* ===================================================================
   Easy to Buy — Contacts (directory table) page logic
   Renders both the desktop table and the mobile card list from the same
   filtered/sorted data — only CSS toggles which one is visible (see
   .table-scroll / .contacts-cards in styles.css).
   =================================================================== */

(function () {
  const contacts = DASHBOARD_DATA.contacts;

  markActiveNav('contacts');

  document.getElementById('contacts-filter').innerHTML =
    FilterBar.render({
      id: 'filter-contacts', stage: true, priority: true, touch: true, whale: true,
      search: true, searchPlaceholder: 'Search company, contact, or email…',
    });

  const filterEl = document.getElementById('filter-contacts');
  const tbody = document.getElementById('contacts-tbody');
  const table = document.getElementById('contacts-table');
  const cardsContainer = document.getElementById('contacts-cards');

  let sortKey = 'company';
  let sortDir = 1; // 1 = asc, -1 = desc

  function cell(text, opts) {
    opts = opts || {};
    const cls = opts.wrap ? ' class="wrap-cell' + (opts.secondary ? ' cell-secondary' : '') + '"'
      : opts.secondary ? ' class="cell-secondary"' : '';
    return `<td${cls}>${text === null || text === undefined || text === '' ? '—' : escapeHTML(text)}</td>`;
  }

  function renderRow(c) {
    const linkedinCell = c.linkedin
      ? `<td><a class="cell-link" href="${escapeHTML(c.linkedin)}" target="_blank" rel="noopener">Profile</a></td>`
      : '<td class="cell-secondary">—</td>';
    const emailCell = c.email
      ? `<td><a class="cell-link" href="mailto:${escapeHTML(c.email)}">${escapeHTML(c.email)}</a></td>`
      : '<td class="cell-secondary">—</td>';

    return `
      <tr class="clickable-card" data-contact-id="${c.id}" tabindex="0" role="button" aria-label="View ${escapeHTML(c.company)} details">
        <td class="sticky-col">${escapeHTML(c.company)}</td>
        <td>${escapeHTML(c.contactName)}</td>
        <td>${Badge.stage(c.stage)}</td>
        <td>${Badge.priority(c.priority)}</td>
        <td>${Badge.whale(c.whaleTag)}</td>
        <td>${Badge.touch(c.touchSeverity)}</td>
        <td>${Fmt.usd(c.feePotential)}</td>
        <td>${escapeHTML(c.mwPartner)}</td>
        <td>${escapeHTML(c.city)}</td>
        <td>${escapeHTML(c.state)}</td>
        <td>${escapeHTML(c.type)}</td>
        ${emailCell}
        ${cell(c.phone, { secondary: true })}
        ${linkedinCell}
        ${cell(c.firstMeeting, { secondary: true })}
        ${cell(c.lastTouch, { secondary: true })}
        <td class="cell-secondary">${c.daysSinceLastTouch}</td>
        ${cell(c.closingSchedule, { secondary: true })}
        ${cell(c.status, { wrap: true })}
        ${cell(c.natureOfWork, { wrap: true, secondary: true })}
        ${cell(c.notes, { wrap: true, secondary: true })}
        ${cell(c.touchIdeas, { wrap: true, secondary: true })}
      </tr>
    `;
  }

  // Mobile card — a curated subset of fields (same pattern as the
  // contact-card used on Dashboard/Touches), not all 21 columns. Full
  // detail is one tap away via the contact modal either way.
  function renderMobileCard(c) {
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

  // Stage and Touch status sort by meaningful rank (pipeline order /
  // urgency order — same ranks the Pipeline board and Touches page
  // already use), not alphabetically. Everything else sorts as a plain
  // string/number.
  function sortValue(c, key) {
    if (key === 'stage') return STAGE_RANK[c.stage];
    if (key === 'touchSeverity') return SEVERITY_RANK[c.touchSeverity];
    const v = c[key];
    return typeof v === 'string' ? v.toLowerCase() : v;
  }

  function update(state) {
    const filtered = FilterBar.applyToContacts(contacts, state);
    filtered.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av > bv ? 1 : -1) * sortDir;
    });

    // colspan is computed from the live header count (not hardcoded) so it
    // can't drift out of sync again if a column is added/removed. The
    // message itself is sticky-positioned to the left edge of the scroll
    // container — centering text across a 20+ column, 2000px+-wide row
    // would still land off-screen even with a correct colspan, since the
    // row is far wider than the visible viewport.
    const colCount = table.querySelectorAll('thead th').length;
    tbody.innerHTML = filtered.length ? filtered.map(renderRow).join('')
      : `<tr><td colspan="${colCount}" class="table-empty-cell"><div class="table-empty-cell-inner">No contacts match these filters.</div></td></tr>`;

    cardsContainer.innerHTML = filtered.length ? filtered.map(renderMobileCard).join('')
      : `<div class="empty-state">No contacts match these filters.</div>`;

    FilterBar.setCount(filterEl, filtered.length, contacts.length);

    table.querySelectorAll('thead th').forEach(th => {
      th.classList.toggle('sorted', th.dataset.key === sortKey);
      const arrow = th.querySelector('.sort-arrow');
      if (arrow && th.dataset.key === sortKey) arrow.textContent = sortDir === 1 ? '↑' : '↓';
    });
  }

  table.querySelectorAll('thead th[data-key]').forEach(th => {
    th.innerHTML = th.innerHTML.replace(/<span class="sort-arrow">.*?<\/span>/, '') + ' <span class="sort-arrow">↑</span>';
    th.addEventListener('click', () => {
      if (sortKey === th.dataset.key) {
        sortDir *= -1;
      } else {
        sortKey = th.dataset.key;
        sortDir = 1;
      }
      update(FilterBar.readState(filterEl));
    });
  });

  FilterBar.bind(filterEl, update);
  update(FilterBar.readState(filterEl));
})();
