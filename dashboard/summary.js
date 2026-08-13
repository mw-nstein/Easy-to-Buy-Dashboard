/* ===================================================================
   Easy to Buy — Executive Summary page logic
   Condenses the same DASHBOARD_DATA used everywhere else into one
   printable sheet. All figures are computed client-side, no backend.
   =================================================================== */

(function () {
  const contacts = DASHBOARD_DATA.contacts;
  const meta = DASHBOARD_DATA.meta;

  markActiveNav('summary');

  // ---------- headline figures ----------

  const inCadence = meta.onTrackTouches + meta.dueSoonTouches;
  const compliancePct = meta.activeProspects > 0 ? Math.round((inCadence / meta.activeProspects) * 100) : 0;

  // C-suite sees the same total fee potential figure relabeled as
  // firmwide — it's the identical number to the Partner view because
  // this prototype's data model only has the one 22-contact dataset (no
  // broader per-partner-firm rollup exists to sum instead). Expected
  // given the current data model, not a bug.
  const isCsuite = CURRENT_SESSION && CURRENT_SESSION.personaType === 'csuite';
  const totalFeeLabel = isCsuite ? 'Total fee potential across all partners' : 'Total fee potential';

  // Closed figure uses the all-time total here (relabeled accordingly),
  // unlike the Dashboard hero which intentionally stays on the last-12-
  // months figure — the two pages are allowed to answer "closed" with
  // different time horizons.
  const figures = [
    { value: Fmt.usdPrecise(meta.totalFeePotential), label: totalFeeLabel },
    { value: Fmt.usdPrecise(meta.closedDealsTotalFeeAllTime), label: 'Closed (all-time)' },
    { value: String(meta.activeProspects), label: 'Active prospects' },
    { value: String(meta.overdueTouches), label: 'Overdue touches' },
    { value: String(meta.requalifyTouches), label: 'Needs requalification' },
    { value: compliancePct + '%', label: 'Touched within cadence' },
  ];

  document.getElementById('summary-figures').innerHTML = figures.map(f => `
    <div class="summary-figure">
      <div class="summary-figure-value">${f.value}</div>
      <div class="summary-figure-label">${escapeHTML(f.label)}</div>
    </div>
  `).join('');

  // ---------- pipeline by stage ----------

  const stages = ['Prospecting', 'Pitching', 'Closing'];
  document.getElementById('summary-stages').innerHTML = stages.map(stage => {
    const list = contacts.filter(c => c.stage === stage);
    const total = list.reduce((sum, c) => sum + (c.feePotential || 0), 0);
    return `
      <li>
        <span class="summary-list-name">${stage} &middot; ${list.length} contacts</span>
        <span class="summary-list-value">${Fmt.usd(total)}</span>
      </li>
    `;
  }).join('');

  // ---------- top 10 prospects ----------

  const topProspects = contacts.slice()
    .sort((a, b) => (b.feePotential || 0) - (a.feePotential || 0))
    .slice(0, 10);

  document.getElementById('summary-top-prospects').innerHTML = topProspects.map(c => `
    <li>
      <span class="summary-list-name">${escapeHTML(c.company)}</span>
      <span class="summary-list-value">${Fmt.usd(c.feePotential)} &middot; ${escapeHTML(c.stage)}</span>
    </li>
  `).join('');

  // ---------- partner rollup (condensed) — C-suite only ----------
  //
  // Per-partner breakdown stays exclusive to the Partners page. Christian
  // Berger (Partner persona) sees only his own aggregate figures above —
  // the section itself is removed from the page entirely for him, not
  // just visually hidden with data still loaded.

  const partnersSection = document.getElementById('summary-partners-section');
  if (isCsuite) {
    const byPartner = {};
    contacts.forEach(c => {
      const key = c.mwPartner || 'Unassigned';
      if (!byPartner[key]) byPartner[key] = [];
      byPartner[key].push(c);
    });
    const partnerRows = Object.keys(byPartner).map(partner => ({
      partner,
      totalFee: byPartner[partner].reduce((sum, c) => sum + (c.feePotential || 0), 0),
      dealCount: byPartner[partner].length,
    })).sort((a, b) => b.totalFee - a.totalFee);

    document.getElementById('summary-partners').innerHTML = partnerRows.map(row => `
      <li>
        <span class="summary-list-name">${escapeHTML(row.partner)}</span>
        <span class="summary-list-value">${Fmt.usd(row.totalFee)} &middot; ${row.dealCount} deals</span>
      </li>
    `).join('');
  } else {
    partnersSection.remove();
  }

  // ---------- print button ----------

  const printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
})();
