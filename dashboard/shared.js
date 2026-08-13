/* ===================================================================
   Easy to Buy — shared utilities, badges, and the reusable filter bar
   component. Loaded on every page after data.js and before the
   page-specific script.
   =================================================================== */

// ---------------------------------------------------------------------
// Session gate (mock SSO) — every page that loads shared.js (i.e. every
// page except login.html) requires an active session in sessionStorage.
// Centralized here, at the very top of the shared script, so it's
// enforced consistently without duplicating the check in each page's
// own script. This is a UI simulation only, not real authentication:
// sessionStorage is trivially readable/writable from devtools, so treat
// this as a demo affordance, never a security boundary.
//
// Runs as soon as shared.js executes (near the end of <body>, after
// login.js's redirect logic would already be done on login.html itself,
// which never loads this file). A logged-out visitor briefly sees the
// page's markup before this redirect fires — acceptable for a local
// demo, not for anything handling real access control.
// ---------------------------------------------------------------------

const SESSION_KEY = 'easyToBuySession';

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

const CURRENT_SESSION = getSession();
if (!CURRENT_SESSION) {
  window.location.replace('login.html');
}

// ---------- formatting ----------

const Fmt = {
  usd(thousands) {
    // Source fee figures are expressed in $ thousands.
    const dollars = thousands * 1000;
    if (dollars >= 1000000) {
      return '$' + (dollars / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    }
    return '$' + Math.round(dollars / 1000) + 'K';
  },

  usdPrecise(thousands) {
    const dollars = thousands * 1000;
    return '$' + (dollars / 1000000).toFixed(2) + 'M';
  },

  daysLabel(days) {
    if (days === null || days === undefined) return 'No touch on record';
    if (days < 0) return 'Next touch scheduled';
    if (days === 0) return 'Touched today';
    if (days === 1) return '1 day since last touch';
    return days + ' days since last touch';
  },

  date(str) {
    if (!str) return '—';
    return str;
  },
};

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- badges ----------

// Four touch-status tiers per the Easy to Buy framework. "Needs
// requalification" (70+ days, the framework's 10-12 week requalify-or-
// disengage line) ranks as MORE urgent than a routine Overdue (31-69
// days) everywhere urgency is sorted — it's a longer-neglected contact,
// just one the framework says to make a keep/drop decision on rather
// than touch.
const SEVERITY_LABEL = {
  requalify: 'Needs requalification', overdue: 'Overdue',
  duesoon: 'Due soon', ontrack: 'On track',
};
const SEVERITY_RANK = { requalify: 0, overdue: 1, duesoon: 2, ontrack: 3, unknown: 4 };
const STAGE_RANK = { Prospecting: 0, Pitching: 1, Closing: 2 };

const Badge = {
  touch(severity) {
    const cls = 'badge-' + (severity || 'ontrack');
    const label = SEVERITY_LABEL[severity] || 'On track';
    return `<span class="badge ${cls}">${label}</span>`;
  },

  priority(priority) {
    const cls = priority === 'High' ? 'badge-priority-high'
      : priority === 'Low' ? 'badge-priority-low'
      : 'badge-priority-prospect';
    return `<span class="badge ${cls}">${escapeHTML(priority || 'Unrated')}</span>`;
  },

  stage(stage) {
    const cls = 'badge-stage-' + stage.toLowerCase();
    return `<span class="badge ${cls}">${escapeHTML(stage)}</span>`;
  },

  whale(tag) {
    const cls = tag === 'Whale' ? 'badge-whale' : 'badge-minnow';
    return `<span class="badge ${cls}">${escapeHTML(tag || 'Minnow')}</span>`;
  },
};

// Sort contacts by follow-up urgency: needs-requalification first (most
// stale), then overdue, then due soon, then on track — most stale first
// within each tier.
function sortByTouchUrgency(list) {
  return list.slice().sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.touchSeverity] - SEVERITY_RANK[b.touchSeverity];
    if (rankDiff !== 0) return rankDiff;
    return (b.daysSinceLastTouch ?? -Infinity) - (a.daysSinceLastTouch ?? -Infinity);
  });
}

// ---------------------------------------------------------------------
// Reusable filter bar component
//
// config: {
//   id: 'unique-id',
//   priority: bool, touch: bool, stage: bool, whale: bool, // contact-style filters
//   sector: bool, partner: bool,                // win-style filters
//   search: bool, searchPlaceholder: string,
//   sectorOptions: [...], partnerOptions: [...] // required if sector/partner true
// }
// ---------------------------------------------------------------------

const FilterBar = {
  render(config) {
    const groups = [];

    if (config.stage) {
      groups.push(this._select('stage', 'Stage', [
        ['All', 'All stages'], ['Prospecting', 'Prospecting'],
        ['Pitching', 'Pitching'], ['Closing', 'Closing'],
      ]));
    }
    if (config.priority) {
      groups.push(this._select('priority', 'Priority', [
        ['All', 'All priorities'], ['High', 'High'], ['Low', 'Low'], ['Prospect', 'Prospect'],
      ]));
    }
    if (config.touch) {
      groups.push(this._select('touch', 'Touch status', [
        ['All', 'All touch status'], ['ontrack', 'On track'],
        ['duesoon', 'Due soon'], ['overdue', 'Overdue'],
        ['requalify', 'Needs requalification'],
      ]));
    }
    if (config.whale) {
      groups.push(this._select('whale', 'Whale / Minnow', [
        ['All', 'All'], ['Whale', 'Whale'], ['Minnow', 'Minnow'],
      ]));
    }
    if (config.sector) {
      const opts = [['All', 'All sectors']].concat((config.sectorOptions || []).map(s => [s, s]));
      groups.push(this._select('sector', 'Sector', opts));
    }
    if (config.partner) {
      const opts = [['All', 'All MW partners']].concat((config.partnerOptions || []).map(p => [p, p]));
      groups.push(this._select('partner', 'MW partner', opts));
    }

    const searchHTML = config.search
      ? `<div class="filter-group filter-search">
           <input type="text" data-filter="search" placeholder="${escapeHTML(config.searchPlaceholder || 'Search…')}" autocomplete="off">
         </div>`
      : '';

    return `
      <div class="filter-bar" id="${config.id}">
        ${groups.join('')}
        ${searchHTML}
        <button type="button" class="filter-reset" data-action="filter-reset">Reset</button>
        <span class="filter-count" data-role="filter-count"></span>
      </div>
    `;
  },

  _select(key, label, options) {
    const optionsHTML = options.map(([val, text]) =>
      `<option value="${escapeHTML(val)}">${escapeHTML(text)}</option>`).join('');
    return `
      <div class="filter-group">
        <label for="filter-${key}">${label}</label>
        <select id="filter-${key}" data-filter="${key}">${optionsHTML}</select>
      </div>
    `;
  },

  // Reads current control values out of a rendered filter bar.
  readState(containerEl) {
    const state = {};
    containerEl.querySelectorAll('[data-filter]').forEach(el => {
      state[el.dataset.filter] = el.type === 'text' ? el.value.trim().toLowerCase() : el.value;
    });
    return state;
  },

  // Attaches change/input listeners; calls onChange(state) whenever a
  // control changes, and on reset.
  bind(containerEl, onChange) {
    containerEl.querySelectorAll('select[data-filter]').forEach(el => {
      el.addEventListener('change', () => onChange(this.readState(containerEl)));
    });
    containerEl.querySelectorAll('input[data-filter]').forEach(el => {
      el.addEventListener('input', () => onChange(this.readState(containerEl)));
    });
    const resetBtn = containerEl.querySelector('[data-action="filter-reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        containerEl.querySelectorAll('select[data-filter]').forEach(el => { el.value = 'All'; });
        containerEl.querySelectorAll('input[data-filter]').forEach(el => { el.value = ''; });
        onChange(this.readState(containerEl));
      });
    }
  },

  setCount(containerEl, shown, total) {
    const el = containerEl.querySelector('[data-role="filter-count"]');
    if (el) el.textContent = `${shown} of ${total}`;
  },

  // Applies filter state to a list of contact-like records.
  applyToContacts(list, state) {
    return list.filter(c => {
      if (state.stage && state.stage !== 'All' && c.stage !== state.stage) return false;
      if (state.priority && state.priority !== 'All' && c.priority !== state.priority) return false;
      if (state.touch && state.touch !== 'All' && c.touchSeverity !== state.touch) return false;
      if (state.whale && state.whale !== 'All' && c.whaleTag !== state.whale) return false;
      if (state.search) {
        const haystack = `${c.company} ${c.contactName} ${c.email || ''}`.toLowerCase();
        if (!haystack.includes(state.search)) return false;
      }
      return true;
    });
  },

  // Applies filter state to a list of win-like records.
  applyToWins(list, state) {
    return list.filter(w => {
      if (state.sector && state.sector !== 'All' && w.natureOfWork !== state.sector) return false;
      if (state.partner && state.partner !== 'All' && w.mwPartner !== state.partner) return false;
      if (state.search) {
        const haystack = `${w.company} ${w.contactName}`.toLowerCase();
        if (!haystack.includes(state.search)) return false;
      }
      return true;
    });
  },
};

// ---------- nav active-state ----------

function markActiveNav(pageName) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });
}

// ---------------------------------------------------------------------
// Contact detail popup
//
// Any element carrying data-contact-id="<id>" (and class="clickable-card"
// for the hover affordance) opens this modal when clicked, via a single
// delegated document-level listener — no per-card wiring needed on any
// page. Wins/closed-deal rows never carry data-contact-id, so they're
// unaffected.
// ---------------------------------------------------------------------

function buildTouchEmail(contact) {
  // Subject/body are hand-written per contact in generate_data.py (Easy to
  // Buy touch-email principles: lead with value, be specific, no
  // apologetic language, short, light close) — precomputed once so the
  // preview is identical every time the popup reopens. The generic
  // fallback only fires for a contact somehow missing that data.
  const subject = contact.touchEmailSubject || `Thought you'd find this useful — ${contact.company}`;
  const body = contact.touchEmailBody || `Hi ${contact.firstName || 'there'},\n\n${contact.suggestedTouch}\n\nLet me know if you'd like to discuss further.`;
  return { to: contact.email || '', subject, body };
}

const ContactModal = {
  _dom: null,
  _lastFocusedEl: null,

  ensureDom() {
    if (this._dom) return this._dom;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'contact-modal-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-company-name">
        <div id="contact-modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (overlay.hidden) return;
      if (e.key === 'Escape') { this.close(); return; }
      if (e.key === 'Tab') this._trapTab(e, overlay);
    });

    this._dom = overlay;
    return overlay;
  },

  // Keeps Tab/Shift+Tab cycling within the modal's own focusable elements
  // instead of escaping into the (still-present) page behind the overlay.
  _trapTab(e, overlay) {
    const focusable = [...overlay.querySelectorAll(
      'a[href], button:not([disabled]), select, input, [tabindex="0"]'
    )];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  field(label, value) {
    return `
      <div class="modal-field">
        <label>${escapeHTML(label)}</label>
        <div class="value">${value}</div>
      </div>
    `;
  },

  render(contact) {
    const c = contact;
    const linkedinValue = c.linkedin
      ? `<a class="cell-link" href="${escapeHTML(c.linkedin)}" target="_blank" rel="noopener">View profile</a>`
      : '—';
    const emailValue = c.email
      ? `<a class="cell-link" href="mailto:${escapeHTML(c.email)}">${escapeHTML(c.email)}</a>`
      : '—';

    let touchCallout = '';
    if (c.touchSeverity === 'overdue') {
      touchCallout = `
        <div class="modal-touch-callout">
          <div class="modal-touch-callout-title">Suggested next touch</div>
          <div class="modal-touch-callout-text">${escapeHTML(c.suggestedTouch)}</div>
          <button type="button" class="btn-gold" data-action="show-email-preview">Send touch email</button>
          <div class="email-preview" id="email-preview" aria-live="polite" hidden></div>
        </div>
      `;
    } else if (c.touchSeverity === 'requalify') {
      // Per the framework, 70+ days without a touch means "decide whether
      // to keep pursuing," not "send a touch" — deliberately no touch-email
      // action here, unlike the Overdue callout above.
      touchCallout = `
        <div class="modal-requalify-callout">
          <div class="modal-requalify-callout-title">Needs requalification</div>
          <div class="modal-requalify-callout-text">
            No contact in ${c.daysSinceLastTouch} days — well past the framework's 10-12 week window.
            Decide whether to keep pursuing this relationship or move it to inactive, rather than sending a routine touch.
          </div>
        </div>
      `;
    }

    return `
      <div class="modal-header">
        <div class="modal-company" id="modal-company-name">${escapeHTML(c.company)}</div>
        <div class="modal-subline">${escapeHTML(c.contactName)} &middot; ${escapeHTML(c.city)}, ${escapeHTML(c.state)}</div>
        <div class="modal-badges">
          ${Badge.stage(c.stage)}
          ${Badge.priority(c.priority)}
          ${Badge.whale(c.whaleTag)}
          ${Badge.touch(c.touchSeverity)}
        </div>
      </div>
      <div class="modal-body-content">
        <div class="modal-grid">
          ${this.field('Email', emailValue)}
          ${this.field('Phone', escapeHTML(c.phone) || '—')}
          ${this.field('LinkedIn', linkedinValue)}
          ${this.field('Type', escapeHTML(c.type) || '—')}
          ${this.field('Fee potential', Fmt.usd(c.feePotential))}
          ${this.field('MW partner', escapeHTML(c.mwPartner) || '—')}
          ${this.field('First meeting', escapeHTML(c.firstMeeting) || '—')}
          ${this.field('Last touch', `${escapeHTML(c.lastTouch) || '—'} (${Fmt.daysLabel(c.daysSinceLastTouch)})`)}
          ${this.field('Closing schedule', escapeHTML(c.closingSchedule) || '—')}
        </div>

        <div class="modal-section-title">Nature of work</div>
        <div class="modal-text-block">${escapeHTML(c.natureOfWork) || '—'}</div>

        <div class="modal-section-title">Status</div>
        <div class="modal-text-block">${escapeHTML(c.status) || '—'}</div>

        <div class="modal-section-title">Notes</div>
        <div class="modal-text-block">${escapeHTML(c.notes) || '—'}</div>

        <div class="modal-section-title">Touch ideas</div>
        <div class="modal-text-block">${escapeHTML(c.touchIdeas) || '—'}</div>

        ${touchCallout}
      </div>
    `;
  },

  open(contact) {
    // Remember what had focus (the triggering card) so close() can put
    // focus back where the user was, instead of dropping it to <body>.
    this._lastFocusedEl = document.activeElement;

    const overlay = this.ensureDom();
    overlay.querySelector('.modal').innerHTML = `
      <button type="button" class="modal-close" aria-label="Close">&times;</button>
      <div id="contact-modal-body">${this.render(contact)}</div>
    `;
    overlay.querySelector('.modal-close').addEventListener('click', () => this.close());

    const emailBtn = overlay.querySelector('[data-action="show-email-preview"]');
    if (emailBtn) {
      emailBtn.addEventListener('click', () => {
        const preview = document.getElementById('email-preview');
        const email = buildTouchEmail(contact);
        const mailtoUrl = `mailto:${encodeURIComponent(email.to)}`
          + `?subject=${encodeURIComponent(email.subject)}`
          + `&body=${encodeURIComponent(email.body)}`;
        preview.innerHTML = `
          <div class="email-preview-row"><strong>To</strong>${escapeHTML(email.to) || '(no email on file)'}</div>
          <div class="email-preview-row"><strong>Subject</strong>${escapeHTML(email.subject)}</div>
          <div class="email-preview-row"><strong>Body</strong>
            <div class="email-preview-body">${escapeHTML(email.body)}</div>
          </div>
          <a class="btn-outline" href="${mailtoUrl}">Open in Outlook</a>
        `;
        preview.hidden = false;
        emailBtn.hidden = true;
      });
    }

    overlay.hidden = false;
    document.body.classList.add('modal-open');

    // Move focus into the dialog (matches the standard modal-dialog
    // pattern) rather than leaving it on the page behind the overlay.
    overlay.querySelector('.modal-close').focus();
  },

  close() {
    if (!this._dom) return;
    this._dom.hidden = true;
    document.body.classList.remove('modal-open');
    if (this._lastFocusedEl && typeof this._lastFocusedEl.focus === 'function') {
      this._lastFocusedEl.focus();
    }
    this._lastFocusedEl = null;
  },
};

function openContactCard(cardEl) {
  const id = Number(cardEl.dataset.contactId);
  const contact = (typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA.contacts : []).find(c => c.id === id);
  if (contact) ContactModal.open(contact);
}

document.addEventListener('click', (e) => {
  const interactive = e.target.closest('a, button, select, input, textarea');
  const cardEl = e.target.closest('[data-contact-id]');
  if (!cardEl) return;
  if (interactive && cardEl.contains(interactive) && interactive !== cardEl) return;
  openContactCard(cardEl);
});

// Keyboard equivalent of the click handler above — every clickable card
// carries tabindex="0" role="button", so Enter/Space should behave like a
// click, matching native <button> behavior.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const cardEl = e.target.closest('[data-contact-id]');
  if (!cardEl || e.target !== cardEl) return; // ignore keys bubbling from inner links/buttons
  e.preventDefault();
  openContactCard(cardEl);
});

// ---------------------------------------------------------------------
// Mobile nav — collapses the horizontal nav-links into a toggled dropdown
// under the topnav breakpoint (see styles.css). Reuses the existing
// .nav-links markup rather than duplicating it; the toggle button is
// added per-page in each <header> and only shown via CSS at narrow
// widths.
// ---------------------------------------------------------------------

(function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!toggle || !navLinks) return;

  function setOpen(isOpen) {
    navLinks.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

  toggle.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (!navLinks.classList.contains('open')) return;
    if (navLinks.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });
})();

// ---------------------------------------------------------------------
// Persona-driven chrome — runs once CURRENT_SESSION is known to exist
// (the gate above already redirected away if not). Two pieces:
//   1. Hide the Partners/Summary nav links entirely for the Partner
//      persona (C-suite sees every page, nothing else differs).
//   2. Turn the static "NS" avatar into the logged-in persona's
//      initials, wired up as a keyboard-accessible dropdown.
// Both read from the same session object every page already loaded via
// the gate above, and neither requires any change to the per-page HTML
// — the avatar div and nav links already exist; this just adapts them.
// ---------------------------------------------------------------------

function applyPersonaNav(session) {
  // Partners rollup/leaderboard stays C-suite-only. Summary is now
  // reachable by both personas (it differentiates its own content by
  // persona instead — see summary.js).
  if (session.personaType !== 'partner') return;
  document.querySelectorAll('.nav-link[data-page="partners"]').forEach(link => {
    link.classList.add('nav-link-hidden');
  });
}

function initAvatarMenu(session) {
  const avatarEl = document.querySelector('.avatar');
  if (!avatarEl) return;

  avatarEl.textContent = session.initials;
  avatarEl.removeAttribute('aria-hidden');
  avatarEl.setAttribute('role', 'button');
  avatarEl.setAttribute('tabindex', '0');
  avatarEl.setAttribute('aria-haspopup', 'menu');
  avatarEl.setAttribute('aria-expanded', 'false');
  avatarEl.setAttribute('aria-label', `Account menu for ${session.name}`);

  // Wrap the existing avatar element in place (keeps it correctly
  // positioned in the .topnav-inner flex row); the dropdown itself is
  // appended to <body> and fixed-positioned instead of nested here — see
  // the CSS comment on .avatar-dropdown for why.
  const wrap = document.createElement('div');
  wrap.className = 'avatar-menu-wrap';
  avatarEl.parentNode.insertBefore(wrap, avatarEl);
  wrap.appendChild(avatarEl);

  const dropdown = document.createElement('div');
  dropdown.className = 'avatar-dropdown';
  dropdown.setAttribute('role', 'menu');
  dropdown.hidden = true;
  dropdown.innerHTML = `
    <div class="avatar-dropdown-name">${escapeHTML(session.name)}</div>
    <div class="avatar-dropdown-title">${escapeHTML(session.title)}</div>
    <div class="avatar-dropdown-divider"></div>
    <button type="button" role="menuitem" class="avatar-dropdown-item" data-action="profile">Profile</button>
    <button type="button" role="menuitem" class="avatar-dropdown-item" data-action="settings">Settings</button>
    <div class="avatar-dropdown-divider"></div>
    <button type="button" role="menuitem" class="avatar-dropdown-item avatar-dropdown-item-danger" data-action="logout">Log out</button>
  `;
  document.body.appendChild(dropdown);

  // Remember each item's real label so the "not available" flash can
  // restore it afterward instead of leaving the button relabeled.
  dropdown.querySelectorAll('[data-action="profile"], [data-action="settings"]').forEach(btn => {
    btn.dataset.label = btn.textContent;
  });

  function positionDropdown() {
    const rect = avatarEl.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
  }

  function setOpen(isOpen) {
    if (isOpen) positionDropdown();
    dropdown.hidden = !isOpen;
    avatarEl.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      const first = dropdown.querySelector('.avatar-dropdown-item');
      if (first) first.focus();
    }
  }

  avatarEl.addEventListener('click', () => setOpen(dropdown.hidden));
  avatarEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(dropdown.hidden);
    }
  });

  dropdown.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'logout') {
      clearSession();
      window.location.replace('login.html');
      return;
    }
    // Profile / Settings — no real functionality in this prototype;
    // briefly say so, then restore the button's normal label.
    btn.disabled = true;
    btn.textContent = 'Not available in this prototype';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = btn.dataset.label;
    }, 1200);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      setOpen(false);
      avatarEl.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (dropdown.hidden) return;
    if (wrap.contains(e.target) || dropdown.contains(e.target)) return;
    setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!dropdown.hidden) positionDropdown();
  });

  document.addEventListener('focusout', () => {
    if (dropdown.hidden) return;
    requestAnimationFrame(() => {
      if (!wrap.contains(document.activeElement) && !dropdown.contains(document.activeElement)) setOpen(false);
    });
  });
}

if (CURRENT_SESSION) {
  applyPersonaNav(CURRENT_SESSION);
  initAvatarMenu(CURRENT_SESSION);
}
