/* ===================================================================
   Easy to Buy — Pipeline (kanban) page logic
   =================================================================== */

(function () {
  const contacts = DASHBOARD_DATA.contacts;
  const STAGES = ['Prospecting', 'Pitching', 'Closing'];

  markActiveNav('pipeline');

  document.getElementById('pipeline-filter').innerHTML =
    FilterBar.render({ id: 'filter-pipeline', stage: true, priority: true, touch: true, whale: true });

  const filterEl = document.getElementById('filter-pipeline');
  const board = document.getElementById('kanban-board');

  function renderKanbanCard(c) {
    return `
      <div class="kanban-card clickable-card" data-contact-id="${c.id}" tabindex="0" role="button" aria-label="View ${escapeHTML(c.company)} details">
        <div class="kanban-card-company">${escapeHTML(c.company)}</div>
        <div class="kanban-card-contact">${escapeHTML(c.contactName)}</div>
        <div class="kanban-card-fee">${Fmt.usd(c.feePotential)}</div>
        <div class="kanban-card-badges">
          ${Badge.priority(c.priority)}
          ${Badge.whale(c.whaleTag)}
          ${Badge.touch(c.touchSeverity)}
        </div>
      </div>
    `;
  }

  function update(state) {
    const filtered = FilterBar.applyToContacts(contacts, state);
    const visibleStages = (state.stage && state.stage !== 'All') ? [state.stage] : STAGES;

    board.innerHTML = visibleStages.map(stage => {
      const stageContacts = filtered
        .filter(c => c.stage === stage)
        .sort((a, b) => (b.feePotential || 0) - (a.feePotential || 0));
      return `
        <div class="kanban-column">
          <div class="kanban-column-header">
            <span class="kanban-column-title">${stage}</span>
            <span class="kanban-column-count">${stageContacts.length}</span>
          </div>
          <div class="kanban-column-body">
            ${stageContacts.length ? stageContacts.map(renderKanbanCard).join('')
              : `<div class="empty-state">No contacts match these filters.</div>`}
          </div>
        </div>
      `;
    }).join('');

    FilterBar.setCount(filterEl, filtered.length, contacts.length);
  }

  FilterBar.bind(filterEl, update);
  update(FilterBar.readState(filterEl));
})();
