/* ===================================================================
   Easy to Buy — mock SSO login page logic
   Entirely client-side simulation — no real authentication. Stores a
   plain-JSON session in sessionStorage that shared.js's gate (on every
   other page) checks for. sessionStorage is trivially readable/writable
   from devtools, so this is a demo affordance only, never a security
   boundary.

   Session-creation/redirect logic is unchanged from the previous
   two-card design — only how a persona gets selected changed (clicking
   a saved-account suggestion under the email field, instead of clicking
   a persona card).
   =================================================================== */

(function () {
  const SESSION_KEY = 'easyToBuySession';

  const PERSONAS = {
    partner: {
      name: 'Christian Berger',
      initials: 'CB',
      title: 'Partner',
      personaType: 'partner',
      email: 'cberger@mcguirewoods.com',
      landingPage: 'index.html',
    },
    csuite: {
      name: 'Jordan Blake',
      initials: 'JB',
      title: 'COO',
      personaType: 'csuite',
      email: 'jblake@mcguirewoods.com',
      landingPage: 'partners.html',
    },
  };

  // Already signed in (e.g. hit Back into this page)? Skip straight to
  // the right landing page instead of showing the form again.
  try {
    const existingRaw = sessionStorage.getItem(SESSION_KEY);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      const persona = PERSONAS[existing.personaType];
      window.location.replace(persona ? persona.landingPage : 'index.html');
      return;
    }
  } catch (e) {
    // Malformed session data — fall through and show the login form.
  }

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const emailWrap = document.getElementById('email-field-wrap');
  const passwordWrap = document.getElementById('password-field-wrap');
  const emailDropdown = document.getElementById('email-suggest-dropdown');
  const passwordDropdown = document.getElementById('password-suggest-dropdown');
  const submitBtn = document.getElementById('login-submit-btn');
  const errorEl = document.getElementById('login-error');
  const form = document.getElementById('login-form');

  // Set only by clicking a saved-account suggestion — this is what
  // "an email option was ever selected" means. Typing an address by
  // hand (even a matching one) never sets this, and editing the email
  // away from the selected address clears it again (see the input
  // listener below) so the form can't sign someone in under a persona
  // whose address is no longer what's showing in the field.
  let selectedPersona = null;

  // ---------- show-on-focus-or-hover dropdown wiring (shared by both fields) ----------

  function wireSuggestDropdown(wrapEl, inputEl, dropdownEl) {
    function show() {
      dropdownEl.hidden = false;
    }
    function maybeHide() {
      setTimeout(() => {
        const stillActive = wrapEl.contains(document.activeElement) || wrapEl.matches(':hover');
        if (!stillActive) dropdownEl.hidden = true;
      }, 120);
    }
    inputEl.addEventListener('focus', show);
    wrapEl.addEventListener('mouseenter', show);
    inputEl.addEventListener('blur', maybeHide);
    wrapEl.addEventListener('mouseleave', maybeHide);
  }

  wireSuggestDropdown(emailWrap, emailInput, emailDropdown);
  wireSuggestDropdown(passwordWrap, passwordInput, passwordDropdown);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!emailDropdown.hidden) { emailDropdown.hidden = true; emailInput.blur(); }
    if (!passwordDropdown.hidden) { passwordDropdown.hidden = true; passwordInput.blur(); }
  });

  // ---------- email suggestions: fill the field AND tag the persona ----------

  emailDropdown.querySelectorAll('.login-suggest-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedPersona = PERSONAS[item.dataset.persona];
      emailInput.value = item.dataset.email;
      emailDropdown.hidden = true;
      hideError();
      updateSubmitState();
      passwordInput.focus();
    });
  });

  emailInput.addEventListener('input', () => {
    if (selectedPersona && emailInput.value !== selectedPersona.email) {
      selectedPersona = null;
    }
    hideError();
    updateSubmitState();
  });

  // ---------- password suggestions: cosmetic fill only, no persona tie ----------

  passwordDropdown.querySelectorAll('.login-suggest-item').forEach(item => {
    item.addEventListener('click', () => {
      passwordInput.value = item.dataset.password;
      passwordDropdown.hidden = true;
      updateSubmitState();
    });
  });

  passwordInput.addEventListener('input', () => {
    hideError();
    updateSubmitState();
  });

  // ---------- submit gating ----------

  function updateSubmitState() {
    submitBtn.disabled = !(emailInput.value.trim() && passwordInput.value.trim());
  }

  function hideError() {
    errorEl.hidden = true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!emailInput.value.trim() || !passwordInput.value.trim()) return;

    if (!selectedPersona) {
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    // Brief artificial delay — the only simulated-async touch, just to
    // sell the "redirecting via SSO" moment before landing in the app.
    setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        name: selectedPersona.name,
        initials: selectedPersona.initials,
        title: selectedPersona.title,
        personaType: selectedPersona.personaType,
      }));
      window.location.replace(selectedPersona.landingPage);
    }, 600);
  });
})();
