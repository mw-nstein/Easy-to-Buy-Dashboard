/* ===================================================================
   Easy to Buy — Touches page logic
   =================================================================== */

(function () {
  const contacts = DASHBOARD_DATA.contacts;

  markActiveNav('touches');

  document.getElementById('touches-filter').innerHTML =
    FilterBar.render({ id: 'filter-touches', stage: true, priority: true, touch: true, whale: true });

  const filterEl = document.getElementById('filter-touches');
  const body = document.getElementById('touches-body');

  function renderCard(c) {
    // Requalify-tier contacts get a different line than "Suggested next
    // touch" — per the framework, 70+ days means decide whether to keep
    // pursuing, not send a routine touch, matching the same distinction
    // made in the contact detail popup.
    const touchLine = c.touchSeverity === 'requalify'
      ? `<span><strong>Needs requalification:</strong> no contact in ${c.daysSinceLastTouch} days — decide whether to keep pursuing.</span>`
      : `<span><strong>Suggested next touch:</strong> ${escapeHTML(c.suggestedTouch)}</span>`;

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
            <span><strong>Last touch:</strong> ${escapeHTML(c.lastTouch)} (${Fmt.daysLabel(c.daysSinceLastTouch)})</span>
            <span><strong>MW partner:</strong> ${escapeHTML(c.mwPartner)}</span>
            ${touchLine}
          </div>
        </div>
        <div class="contact-card-right">
          <div class="contact-fee">${Fmt.usd(c.feePotential)}</div>
          <div class="contact-fee-label">Fee potential</div>
        </div>
      </div>
    `;
  }

  function update(state) {
    const filtered = sortByTouchUrgency(FilterBar.applyToContacts(contacts, state));
    body.innerHTML = filtered.length ? filtered.map(renderCard).join('')
      : `<div class="empty-state">No contacts match these filters.</div>`;
    FilterBar.setCount(filterEl, filtered.length, contacts.length);
  }

  FilterBar.bind(filterEl, update);
  update(FilterBar.readState(filterEl));
})();
