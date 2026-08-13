/* ===================================================================
   Easy to Buy — Partners rollup page logic
   Aggregates the 22 Short List contacts by MW partner (fee potential,
   deal count, touch-compliance rate) entirely client-side — no backend,
   just a reduce over DASHBOARD_DATA.contacts.
   =================================================================== */

(function () {
  const contacts = DASHBOARD_DATA.contacts;

  markActiveNav('partners');

  const root = document.getElementById('partner-leaderboard');

  // Group contacts by MW partner.
  const byPartner = {};
  contacts.forEach(c => {
    const key = c.mwPartner || 'Unassigned';
    if (!byPartner[key]) byPartner[key] = [];
    byPartner[key].push(c);
  });

  // Same "touched within cadence" formula as the Dashboard's compliance
  // KPI tile: On track or Due soon counts as in-cadence; Overdue and
  // Needs requalification do not.
  function complianceFor(list) {
    const inCadence = list.filter(c => c.touchSeverity === 'ontrack' || c.touchSeverity === 'duesoon').length;
    return Math.round((inCadence / list.length) * 100);
  }

  const rows = Object.keys(byPartner).map(partner => {
    const list = byPartner[partner];
    return {
      partner,
      dealCount: list.length,
      totalFee: list.reduce((sum, c) => sum + (c.feePotential || 0), 0),
      compliance: complianceFor(list),
    };
  }).sort((a, b) => b.totalFee - a.totalFee);

  function renderRow(row, index) {
    const complianceCls = row.compliance >= 70 ? 'compliance-good' : row.compliance < 40 ? 'compliance-warn' : '';
    return `
      <div class="partner-row">
        <div class="partner-rank">${index + 1}</div>
        <div class="partner-name">${escapeHTML(row.partner)}</div>
        <div class="partner-stats">
          <div class="partner-stat">
            <div class="partner-stat-value">${Fmt.usd(row.totalFee)}</div>
            <div class="partner-stat-label">Fee potential</div>
          </div>
          <div class="partner-stat">
            <div class="partner-stat-value">${row.dealCount}</div>
            <div class="partner-stat-label">Active deals</div>
          </div>
          <div class="partner-stat">
            <div class="partner-stat-value ${complianceCls}">${row.compliance}%</div>
            <div class="partner-stat-label">Touched within cadence</div>
          </div>
        </div>
      </div>
    `;
  }

  root.innerHTML = rows.length
    ? rows.map(renderRow).join('')
    : `<div class="empty-state">No partner data available.</div>`;
})();
