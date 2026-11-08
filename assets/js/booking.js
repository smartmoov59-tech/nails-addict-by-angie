/* ==========================================================================
   Réservation 100 % statique (aucun back-end, aucun abonnement).
   Le visiteur compose une DEMANDE de créneau : le site prépare un SMS
   pré-rempli (sms:), un fichier agenda (.ics) et un appel (tel:).
   Angie confirme par SMS : rien n'est réservé tant qu'elle n'a pas répondu.
   --------------------------------------------------------------------------
   À ajuster ici si besoin : horaires, durées estimées, congés.
   ========================================================================== */
(() => {
  'use strict';

  const PHONE = '+33660644264';
  const PHONE_LABEL = '06 60 64 42 64';
  const ADDRESS = '132 Rue Eugène Schneider, 13320 Bouc-Bel-Air';
  const OPEN_DAYS = [1, 2, 3, 4];          // lundi → jeudi
  const OPEN_MIN = 9 * 60;                 // 9h00
  const CLOSE_MIN = 19 * 60;               // 19h00
  const STEP_MIN = 30;                     // un créneau toutes les 30 min
  const WEEKS = 6;                         // horizon affiché
  const LEAD_MIN = 120;                    // préavis pour le jour même
  const DEPOSE_MIN = 30;                   // durée ajoutée par une dépose
  const CLOSED_DATES = [];                 // congés d'Angie, ex. '2026-12-24'

  // Durées ESTIMÉES (à valider avec Angie). deco = créneau déco plus long.
  const SERVICES = [
    { id: 'semi',      label: 'Semi-permanent',        dur: 60 },
    { id: 'semi-deco', label: 'Semi-permanent + déco', dur: 90, deco: true },
    { id: 'french',    label: 'French / baby French',  dur: 90, deco: true },
    { id: 'degrade',   label: 'Dégradé / baby color',  dur: 90, deco: true },
    { id: 'comblage',  label: 'Comblage',              dur: 90 },
    { id: 'depose',    label: 'Dépose seule',          dur: 30 },
    { id: 'conseil',   label: 'Je ne sais pas encore', dur: 60, advice: true }
  ];

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = $('#bk');
  if (!root) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const fmtMonthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const hm = (min) => `${Math.floor(min / 60)}h${pad(min % 60)}`;
  const dur = (min) => `${Math.floor(min / 60) ? Math.floor(min / 60) + ' h' : ''}${min % 60 ? ' ' + pad(min % 60) : ''}`.trim();

  const state = { step: 1, service: null, depose: false, date: null, time: null, name: '', note: '', first: false, set: null };

  const panels = $$('.bk__panel', root);
  const stepBtns = $$('#bk-steps button', root);
  const prevBtn = $('#bk-prev');
  const nextBtn = $('#bk-next');
  const svcWrap = $('#bk-services');
  const calWrap = $('#cal');
  const timesWrap = $('#bk-times');
  const smsBtn = $('#bk-sms');
  const copyBtn = $('#bk-copy');
  const icsBtn = $('#bk-ics');
  const statusEl = $('#bk-status');
  const previewEl = $('#bk-preview');
  const setEl = $('#bk-set');

  const svc = () => SERVICES.find((s) => s.id === state.service) || null;
  const totalDur = () => (svc() ? svc().dur : 0) + (state.depose && svc() && svc().id !== 'depose' ? DEPOSE_MIN : 0);

  /* ---------- Prestations ---------- */
  SERVICES.forEach((s) => {
    const l = document.createElement('label');
    l.className = 'bk__svc';
    l.innerHTML = `<input type="radio" name="svc" value="${s.id}"><b>${s.label}</b><small>${s.advice ? 'Angie te conseille' : (s.deco ? 'Créneau déco · ≈ ' : 'Créneau ≈ ') + dur(s.dur)}</small>`;
    svcWrap.appendChild(l);
  });

  /* ---------- Calendrier ---------- */
  function slotsFor(date, minutes) {
    const out = [];
    const now = new Date();
    const minStart = ymd(date) === ymd(now) ? now.getHours() * 60 + now.getMinutes() + LEAD_MIN : 0;
    for (let m = OPEN_MIN; m + minutes <= CLOSE_MIN; m += STEP_MIN) if (m >= minStart) out.push(m);
    return out;
  }

  function renderCalendar() {
    const minutes = totalDur() || 60;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - ((today.getDay() + 6) % 7));
    calWrap.innerHTML = '';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => {
      const h = document.createElement('div');
      h.className = 'cal__dow'; h.setAttribute('aria-hidden', 'true'); h.textContent = d;
      calWrap.appendChild(h);
    });
    let last = null;
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      last = d;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal__day';
      b.dataset.date = ymd(d);
      const open = OPEN_DAYS.includes(d.getDay()) && !CLOSED_DATES.includes(ymd(d)) && d >= today && slotsFor(d, minutes).length > 0;
      b.disabled = !open;
      if (ymd(d) === ymd(today)) b.classList.add('is-today');
      const selected = state.date && ymd(state.date) === ymd(d);
      b.setAttribute('aria-pressed', selected ? 'true' : 'false');
      b.setAttribute('aria-label', cap(fmtDay.format(d)) + (open ? '' : ', indisponible'));
      b.innerHTML = (i === 0 || d.getDate() === 1 ? `<small>${fmtMonthShort.format(d).replace('.', '')}</small>` : '') + d.getDate();
      calWrap.appendChild(b);
    }
    $('#cal-title').textContent = `${cap(fmtMonth.format(start))} → ${cap(fmtMonth.format(last))}`;
  }

  function renderTimes() {
    timesWrap.innerHTML = '';
    if (!state.date) { timesWrap.innerHTML = '<p class="time__empty">Choisis d\'abord un jour.</p>'; return; }
    $('#times-title').textContent = cap(fmtDay.format(state.date));
    const slots = slotsFor(state.date, totalDur() || 60);
    if (!slots.length) { timesWrap.innerHTML = '<p class="time__empty">Plus de créneau ce jour-là, choisis-en un autre.</p>'; return; }
    slots.forEach((m) => {
      const l = document.createElement('label');
      l.className = 'time';
      l.innerHTML = `<input type="radio" name="time" value="${m}"${state.time === m ? ' checked' : ''}><span>${hm(m)}</span>`;
      timesWrap.appendChild(l);
    });
  }

  /* ---------- Étapes ---------- */
  const valid = (n) => (n === 1 ? !!state.service : n === 2 ? !!state.date : n === 3 ? state.time !== null : n === 4 ? state.name.trim().length > 0 : true);
  const reachable = (n) => { for (let i = 1; i < n; i++) if (!valid(i)) return false; return true; };

  function go(n, animate = true) {
    state.step = Math.min(4, Math.max(1, n));
    if (state.step === 2) renderCalendar();
    if (state.step === 3) renderTimes();
    panels.forEach((p) => { p.hidden = +p.dataset.step !== state.step; });
    const active = panels.find((p) => +p.dataset.step === state.step);
    if (animate && window.gsap && !reduced && active) gsap.fromTo(active, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .55, ease: 'power3.out', clearProps: 'all' });
    refresh();
  }

  function refresh() {
    stepBtns.forEach((b, i) => {
      const n = i + 1;
      b.classList.toggle('is-active', n === state.step);
      b.classList.toggle('is-done', n !== state.step && valid(n) && reachable(n));
      b.disabled = !reachable(n);
      if (n === state.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    prevBtn.style.visibility = state.step === 1 ? 'hidden' : 'visible';
    nextBtn.hidden = state.step === 4;
    nextBtn.disabled = !valid(state.step);
    nextBtn.style.opacity = valid(state.step) ? '1' : '.45';
    updateTicket();
  }

  /* ---------- Message, SMS, agenda ---------- */
  function message() {
    const s = svc();
    const name = state.name.trim();
    const when = `${fmtDay.format(state.date)} à ${hm(state.time)}`;
    const lines = [`Bonjour Angie, c'est ${name}${state.first ? ' (première fois chez toi)' : ''}.`];
    if (s.advice) lines.push(`Je voudrais prendre rendez-vous le ${when}. Je ne sais pas encore quelle prestation choisir, je compte sur tes conseils.`);
    else lines.push(`Je voudrais réserver : ${s.label}${state.depose && s.id !== 'depose' ? ' + dépose' : ''}, le ${when}.`);
    if (state.set) lines.push(`Mon idée de set : ${state.set}.`);
    if (state.note.trim()) lines.push(`Précisions : ${state.note.trim()}`);
    lines.push('Peux-tu me confirmer le créneau et le tarif ? Merci !');
    return lines.join('\n');
  }

  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const smsHref = (body) => `sms:${PHONE}${isIOS ? '&' : '?'}body=${encodeURIComponent(body)}`;
  const ready = () => valid(1) && valid(2) && valid(3) && valid(4);

  function setRow(id, text, empty) {
    const el = $('#' + id);
    el.textContent = text;
    el.classList.toggle('is-empty', !!empty);
  }

  function updateTicket() {
    const s = svc();
    setRow('t-service', s ? s.label + (state.depose && s.id !== 'depose' ? ' + dépose' : '') : 'À choisir', !s);
    setRow('t-date', state.date ? cap(fmtDay.format(state.date)) : 'À choisir', !state.date);
    setRow('t-time', state.time !== null ? hm(state.time) : 'À choisir', state.time === null);
    setRow('t-name', state.name.trim() || 'À renseigner', !state.name.trim());
    setRow('t-dur', s ? '≈ ' + dur(totalDur()) : '—', !s);
    const ok = ready();
    previewEl.textContent = ok ? message() : 'Complète les étapes pour voir ton message.';
    smsBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    smsBtn.setAttribute('href', ok ? smsHref(message()) : '#reservation');
    copyBtn.disabled = !ok;
    icsBtn.disabled = !ok;
    if (state.set) {
      setEl.hidden = false;
      setEl.innerHTML = `Mon set : <b></b><button type="button" id="bk-set-clear">Retirer</button>`;
      $('b', setEl).textContent = state.set;
    } else setEl.hidden = true;
  }

  function say(text) {
    statusEl.textContent = text;
    clearTimeout(say.t);
    say.t = setTimeout(() => { statusEl.textContent = ''; }, 7000);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* rien */ }
      ta.remove(); return ok;
    }
  }

  const icsEscape = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const icsLocal = (d, min) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
  const fold = (line) => line.length <= 74 ? line : line.match(/.{1,74}/g).join('\r\n ');

  function downloadIcs() {
    const s = svc();
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nails Addict by Angie//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@nails-addict-by-angie`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsLocal(state.date, state.time)}`,
      `DTEND:${icsLocal(state.date, state.time + totalDur())}`,
      `SUMMARY:${icsEscape("Nails'Addict by Angie : " + s.label + (state.depose && s.id !== 'depose' ? ' + dépose' : ''))}`,
      `LOCATION:${icsEscape(ADDRESS)}`,
      `DESCRIPTION:${icsEscape('Demande de créneau à confirmer par SMS avec Angie (' + PHONE_LABEL + '). Durée estimée : ' + dur(totalDur()) + '.')}`,
      'STATUS:TENTATIVE',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous chez Angie', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].map(fold).join('\r\n');
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'rendez-vous-nails-addict.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say('Fichier agenda téléchargé. Pense à confirmer avec Angie.');
  }

  /* ---------- Événements ---------- */
  svcWrap.addEventListener('change', (e) => {
    if (e.target.name !== 'svc') return;
    state.service = e.target.value;
    // un changement de durée peut invalider l'heure choisie
    if (state.date && state.time !== null && !slotsFor(state.date, totalDur()).includes(state.time)) state.time = null;
    refresh();
    setTimeout(() => go(2), reduced ? 0 : 320);
  });

  $('#bk-depose').addEventListener('change', (e) => {
    state.depose = e.target.checked;
    if (state.date && state.time !== null && !slotsFor(state.date, totalDur()).includes(state.time)) state.time = null;
    refresh();
  });

  calWrap.addEventListener('click', (e) => {
    const b = e.target.closest('.cal__day');
    if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.date.split('-').map(Number);
    state.date = new Date(y, m - 1, d);
    if (state.time !== null && !slotsFor(state.date, totalDur()).includes(state.time)) state.time = null;
    $$('.cal__day', calWrap).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    refresh();
    setTimeout(() => go(3), reduced ? 0 : 320);
  });

  timesWrap.addEventListener('change', (e) => {
    if (e.target.name !== 'time') return;
    state.time = Number(e.target.value);
    refresh();
    setTimeout(() => go(4), reduced ? 0 : 320);
  });

  $('#bk-name').addEventListener('input', (e) => { state.name = e.target.value; refresh(); });
  $('#bk-note').addEventListener('input', (e) => { state.note = e.target.value; refresh(); });
  $('#bk-first').addEventListener('change', (e) => { state.first = e.target.checked; refresh(); });

  stepBtns.forEach((b) => b.addEventListener('click', () => { if (!b.disabled) go(+b.dataset.goto); }));
  prevBtn.addEventListener('click', () => go(state.step - 1));
  nextBtn.addEventListener('click', () => { if (valid(state.step)) go(state.step + 1); });

  setEl.addEventListener('click', (e) => { if (e.target.id === 'bk-set-clear') { state.set = null; refresh(); } });

  smsBtn.addEventListener('click', (e) => {
    if (!ready()) {
      e.preventDefault();
      const first = [1, 2, 3, 4].find((n) => !valid(n));
      go(first);
      say('Il manque encore une information avant d\'envoyer.');
      return;
    }
    say(`Ton application SMS s'ouvre. Si rien ne se passe, copie le message et envoie-le au ${PHONE_LABEL}.`);
  });
  copyBtn.addEventListener('click', async () => {
    say((await copyText(message())) ? 'Message copié, colle-le dans tes SMS.' : 'Copie impossible : sélectionne le texte du message.');
  });
  icsBtn.addEventListener('click', downloadIcs);

  /* ---------- API publique (cartes prestations, « Compose ton set ») ---------- */
  window.NailsBooking = {
    selectService(id) {
      const s = SERVICES.find((x) => x.id === id);
      if (!s) return;
      state.service = id;
      const input = $(`input[name="svc"][value="${id}"]`, svcWrap);
      if (input) input.checked = true;
      go(2);
    },
    setSet(text) {
      state.set = text || null;
      updateTicket();
    }
  };

  go(1, false);
})();
