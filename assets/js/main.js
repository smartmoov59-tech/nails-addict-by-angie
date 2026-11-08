/* ==========================================================================
   Nails Addict by Angie — motion design (GSAP + ScrollTrigger + Lenis)
   Règles : courbes douces (expo / power3), transform + opacity en priorité,
   états de départ posés en JS (sans JS, tout le contenu reste visible),
   version allégée sur mobile et avec prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const markReady = () => root.classList.add('is-ready');

  if (!window.gsap || !window.ScrollTrigger) { markReady(); return; }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const nav = $('#nav');
  const navH = () => nav ? nav.offsetHeight : 76;

  /* ---------------------------------------------------------------- Lenis */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function goTo(target) {
    const top = typeof target === 'number';
    if (lenis) lenis.scrollTo(target, { offset: top ? 0 : -navH() + 1, duration: 1.7, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
    else if (top) window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* --------------------------------------------------------- Split de texte */
  // mode « words » : lisible par les lecteurs d'écran (aucun aria-hidden)
  // mode « chars » : conteneur déjà étiqueté (h1 aria-label) ou décoratif
  function split(el, mode) {
    if (el._split) return el._split;           // déjà découpé (le contexte matchMedia peut se relancer)
    const out = [];
    el._split = out;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            if (mode === 'chars') {
              w.setAttribute('aria-hidden', 'true');
              [...tok].forEach((ch) => { const c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; w.appendChild(c); out.push(c); });
            } else {
              const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = tok; w.appendChild(wi); out.push(wi);
            }
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return out;
  }

  /* ------------------------------------------------------------- Loader */
  function runLoader() {
    return new Promise((resolve) => {
      const ld = $('.loader');
      if (!ld) { markReady(); resolve(); return; }
      if (reduced) { markReady(); resolve(); return; }

      let seen = false;
      try { seen = sessionStorage.getItem('na-seen') === '1'; sessionStorage.setItem('na-seen', '1'); } catch (e) { /* ignore */ }

      const num = $('.loader__num');
      const fill = $('.loader__fill');
      const core = $('.loader__core');
      const t = seen ? 0.45 : 1;                     // visite répétée : version courte
      const st = { v: 0 };
      root.style.overflow = 'hidden';
      gsap.set(fill, { y: 172 });
      const wave = gsap.to(fill.firstElementChild, { x: -60, duration: 1.1, ease: 'none', repeat: -1 });

      const tl = gsap.timeline({
        onComplete: () => { wave.kill(); markReady(); root.style.overflow = ''; if (lenis) lenis.start(); resolve(); }
      });
      tl.to(st, { v: 100, duration: 2 * t, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(st.v)).padStart(2, '0'); } }, 0)
        .to(fill, { y: -10, duration: 2 * t, ease: 'power2.inOut' }, 0)
        .from('.loader__shine', { opacity: 0, duration: .5 * t }, 1.2 * t)
        .to(core, { opacity: 0, scale: .92, duration: .5, ease: 'power2.in' }, 2.15 * t)
        .to('.loader__panel--t', { yPercent: -101, duration: 1.15, ease: 'expo.inOut' }, 2.35 * t)
        .to('.loader__panel--b', { yPercent: 101, duration: 1.15, ease: 'expo.inOut' }, 2.35 * t)
        .call(heroIntro, null, 2.6 * t);
    });
  }

  // États de départ posés AVANT le loader (sinon le hero apparaît puis disparaît derrière les rideaux)
  function heroPrepare(chars) {
    gsap.set(chars, { yPercent: 125, rotate: 8 });
    gsap.set('.hero [data-hero="in"]', { y: 36, opacity: 0 });
    gsap.set('.hero__fx .fx', { scale: 0, opacity: 0 });
    gsap.set('.hero__video', { scale: 1.32 });
    gsap.set('.nav', { yPercent: -100 });
  }

  let heroRan = false;
  function heroIntro() {
    if (reduced || heroRan) return;
    heroRan = true;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__video', { scale: 1.04, duration: 2.6, ease: 'power3.out' }, 0)
      .to($$('.hero__title .ch'), { yPercent: 0, rotate: 0, duration: 1.4, stagger: .06 }, .1)
      .to('.hero [data-hero="in"]', { y: 0, opacity: 1, duration: 1.1, stagger: .12 }, .55)
      .to('.nav', { yPercent: 0, duration: 1.1, clearProps: 'transform' }, .8)
      .to('.hero__fx .fx', { scale: 1, opacity: 1, duration: 1.6, stagger: .07, ease: 'elastic.out(1,.6)' }, .5);
  }

  /* ---------------------------------------------------- Chrome (nav, menu…) */
  function setupChrome() {
    // Barre de progression de lecture
    gsap.to('.progress__bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });

    // Nav : se cache en descendant, revient en remontant
    let menuOpen = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle('is-solid', y > 40);
        nav.classList.toggle('is-hidden', self.direction === 1 && y > 240 && !menuOpen);
      }
    });

    // Lien actif
    $$('main section[id]').forEach((sec) => {
      const link = $(`.nav__links a[href="#${sec.id}"]`);
      if (!link) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => link.classList.toggle('is-active', s.isActive) });
    });

    // Menu mobile plein écran
    const burger = $('.nav__burger');
    const menu = $('#menu');
    $$('.menu__inner a').forEach((a) => { a.innerHTML = `<span>${a.textContent}</span>`; });
    const setMenu = (v) => {
      menuOpen = v;
      burger.setAttribute('aria-expanded', String(v));
      burger.setAttribute('aria-label', v ? 'Fermer le menu' : 'Ouvrir le menu');
      if (v) {
        menu.classList.add('is-open');
        nav.classList.remove('is-hidden');
        if (lenis) lenis.stop(); else root.style.overflow = 'hidden';
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .8, ease: 'expo.inOut' });
        gsap.fromTo('.menu__inner a span', { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: .06, delay: .25 });
        gsap.fromTo('.menu__foot', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .8, delay: .6 });
      } else {
        if (lenis) lenis.start(); else root.style.overflow = '';
        gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .6, ease: 'expo.inOut', onComplete: () => menu.classList.remove('is-open') });
      }
    };
    burger.addEventListener('click', () => setMenu(!menuOpen));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

    // Ancres + lancement de la réservation depuis les cartes
    document.addEventListener('click', (e) => {
      const book = e.target.closest('[data-book],[data-book-link]');
      if (book && window.NailsBooking) window.NailsBooking.selectService(book.dataset.book || book.dataset.bookLink);
      const a = e.target.closest('a[href^="#"]');
      if (a && a.getAttribute('role') === 'button') return;          // bouton SMS désactivé : pas de scroll
      const id = a ? a.getAttribute('href').slice(1) : '';
      const target = book && book.dataset.book ? $('#reservation') : (a ? (id === 'top' ? 0 : document.getElementById(id)) : null);
      if (target === null || target === undefined) return;
      e.preventDefault();
      const go = () => goTo(target);
      if (menuOpen) { setMenu(false); setTimeout(go, 350); } else go();
    });

    // Bouton flottant mobile
    const fab = $('#fab');
    if (fab) {
      ScrollTrigger.create({ trigger: '.hero', start: 'bottom 85%', onEnter: () => fab.classList.add('is-on'), onLeaveBack: () => fab.classList.remove('is-on') });
      ScrollTrigger.create({ trigger: '#reservation', start: 'top 75%', end: 'bottom 25%', onToggle: (s) => fab.classList.toggle('is-away', s.isActive) });
    }
  }

  /* ---------------------------------------------------- Hero : vidéo, fx */
  function setupHeroMedia() {
    const vid = $('.hero__video');
    if (!vid) return;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduced || saveData) { vid.removeAttribute('autoplay'); vid.pause(); return; }
    new IntersectionObserver(([en]) => { if (en.isIntersecting) vid.play().catch(() => {}); else vid.pause(); }, { threshold: .05 }).observe(vid);
  }

  /* ------------------------------------------------ Animations générales */
  function setupAnimations(isMobile) {
    // Titres : mots qui montent derrière un masque
    $$('[data-split]').forEach((h) => {
      const words = split(h, 'words');
      gsap.from(words, { yPercent: 118, rotate: 3, duration: 1.2, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: h, start: 'top 86%' } });
    });

    // Hero : lettres en chars, parallax multicouche
    heroPrepare([...split($('.hero__title .line:nth-child(1) .split-chars'), 'chars'), ...split($('.hero__title .line:nth-child(2) .split-chars'), 'chars')]);
    const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__media', { yPercent: 14, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero__inner', { yPercent: isMobile ? -6 : -16, opacity: .15, ease: 'none', scrollTrigger: heroST });
    $$('.hero__fx .fx').forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 1;
      gsap.to(el, { yPercent: -80 * d, ease: 'none', scrollTrigger: heroST });
      if (!isMobile) gsap.to(el, { x: gsap.utils.random(-16, 16), rotation: gsap.utils.random(-24, 24), duration: gsap.utils.random(3, 6), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    if (finePointer && !isMobile) {
      const fxX = gsap.quickTo('.hero__fx', 'x', { duration: 1.2, ease: 'power3' });
      const fxY = gsap.quickTo('.hero__fx', 'y', { duration: 1.2, ease: 'power3' });
      const mdX = gsap.quickTo('.hero__media', 'x', { duration: 1.6, ease: 'power3' });
      const mdY = gsap.quickTo('.hero__media', 'y', { duration: 1.6, ease: 'power3' });
      $('.hero').addEventListener('pointermove', (e) => {
        const px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
        fxX(px * -46); fxY(py * -34); mdX(px * 18); mdY(py * 12);
      });
    }

    // Bandeaux : vitesse et sens réagissent au scroll
    const tapes = $$('.tape').map((el) => ({ track: $('.tape__track', el), dir: parseFloat(el.dataset.dir) || -1, x: 0 }));
    let lastY = window.scrollY, vel = 0, sdir = 1;
    gsap.ticker.add((time, dt) => {
      const y = window.scrollY;
      vel += (((y - lastY) / Math.max(dt, 1)) * 16.67 - vel) * .12;
      lastY = y;
      if (Math.abs(vel) > .5) sdir = vel > 0 ? 1 : -1;
      tapes.forEach((t) => {
        const half = t.track.scrollWidth / 2;
        if (!half) return;
        t.x += t.dir * sdir * (60 + Math.min(Math.abs(vel), 60) * 42) * (dt / 1000);
        t.x = gsap.utils.wrap(-half, 0, t.x);
        t.track.style.transform = `translate3d(${t.x}px,0,0)`;
      });
    });

    // Manifeste : les mots s'allument au scroll
    const man = $('[data-manifesto]');
    if (man) {
      const words = split(man, 'words');
      gsap.fromTo(words, { opacity: .16 }, { opacity: 1, ease: 'none', stagger: .12, scrollTrigger: { trigger: man, start: 'top 82%', end: 'bottom 55%', scrub: true } });
    }

    // Fenêtres amande : flottement + image qui bouge dans son cadre
    $$('.win').forEach((w) => {
      gsap.to(w, { y: parseFloat(w.dataset.speed) || 0, ease: 'none', scrollTrigger: { trigger: '.angie__wins', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo($('img', w), { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(w, { scale: .82, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: w, start: 'top 90%' } });
    });
    gsap.from('.angie__ring', { scale: 0, rotate: -120, duration: 1.4, ease: 'elastic.out(1,.6)', scrollTrigger: { trigger: '.angie__ring', start: 'top 92%' } });
    gsap.to('.angie__ring', { rotate: 348, ease: 'none', scrollTrigger: { trigger: '.angie', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Rituel (version simple : mobile) / cartes
    if (isMobile) {
      gsap.from('.rstep', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.ritual__steps', start: 'top 85%' } });
      gsap.from('.rfig', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.ritual__stack', start: 'top 90%' } });
      gsap.from('.card', { y: 50, opacity: 0, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.services__track', start: 'top 90%' } });
    }

    // Chiffres : révélation en cercle + compteurs
    gsap.to('.stats__bg', { clipPath: 'circle(78% at 50% 55%)', ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top 85%', end: 'top 10%', scrub: true } });
    gsap.fromTo('.stats__bg img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.stats__list li', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.stats__list', start: 'top 88%' } });
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
      const fmt = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      const o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }) });
    });

    // Galerie : rideau par tuile + image qui bouge dans son cadre
    const tiles = $$('.tile');
    gsap.set(tiles, { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.batch(tiles, {
      start: 'top 93%', once: true,
      onEnter: (b) => gsap.to(b, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', stagger: .1, clearProps: 'clipPath' })
    });
    if (!isMobile) tiles.forEach((t) => gsap.fromTo($('img', t), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true } }));

    // Avis
    gsap.from('.rev', { y: 70, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.reviews__track', start: 'top 90%' } });
    gsap.to('.rev__q', { y: -8, rotate: 6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: .4 });

    // CTA
    gsap.to('.cta__badge', { rotate: 360, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.cta__phone', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.cta__phone', start: 'top 92%' } });
    gsap.from('.cta__btns .btn', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.cta__btns', start: 'top 94%' } });

    // Réservation / accès
    gsap.from('.bk', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.bk', start: 'top 88%' } });
    gsap.from('.ticket', { y: 60, rotate: 2, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.ticket', start: 'top 90%' } });
    gsap.from('.access__map', { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.access__map', start: 'top 90%' } });

    // Footer : lettres géantes qui montent
    const big = split($('.footer__giant .split-chars'), 'chars');
    gsap.from(big, { yPercent: 105, duration: 1.4, ease: 'expo.out', stagger: .04, scrollTrigger: { trigger: '.footer__giant', start: 'top 95%' } });
  }

  /* --------------------------------------- Sections pinnées (desktop only) */
  function setupPins() {
    root.classList.add('is-pinned');

    // Rituel : 5 doigts, 5 étapes
    const steps = $$('.rstep'), figs = $$('.rfig'), fingers = $$('.finger');
    const imgs = figs.map((f) => f.firstElementChild);
    gsap.set(steps.slice(1), { autoAlpha: 0, y: 44 });
    gsap.set(figs.slice(1), { yPercent: 100 });
    gsap.set(imgs.slice(1), { yPercent: -45, scale: 1.3 });
    gsap.set(fingers, { opacity: .3, scale: .9 });
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      // refreshPriority : les pins se calculent avant les déclencheurs placés plus bas dans la page
      scrollTrigger: { trigger: '.ritual', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * .9 * steps.length), pin: '.ritual__pin', scrub: .7, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2 }
    });
    tl.to(fingers[0], { opacity: 1, scale: 1, duration: .3 }, 0);
    steps.forEach((s, i) => {
      if (!i) return;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -44, duration: .35 }, i - .4)
        .to(steps[i], { autoAlpha: 1, y: 0, duration: .4 }, i - .15)
        .to(figs[i], { yPercent: 0, duration: .65 }, i - .45)
        .to(imgs[i], { yPercent: 0, scale: 1, duration: .65 }, i - .45)
        .to(fingers[i], { opacity: 1, scale: 1, duration: .3 }, i - .15);
    });
    tl.to({}, { duration: .8 }, steps.length - 1 + .25);   // temps d'arrêt sur la dernière étape

    // Prestations : défilement horizontal piloté par le scroll vertical
    const track = $('.services__track');
    const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    const h = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.services', start: 'top top', end: () => '+=' + dist(), pin: '.services__pin', scrub: .8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1, onUpdate: (self) => gsap.set('.services__bar span', { scaleX: self.progress }) }
    });
    $$('.card:not(.card--end)').forEach((card) => {
      gsap.fromTo($('.card__bottle', card), { rotate: -18 }, { rotate: 18, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left 92%', end: 'right 8%', scrub: true } });
    });

    return () => root.classList.remove('is-pinned');
  }

  /* ------------------------------------------------- Micro-interactions */
  function setupPointer() {
    if (!finePointer) return;

    // Curseur : goutte de vernis qui suit, devient « Voir » sur la galerie
    const f = $('.follower'), label = $('span', f);
    gsap.set(f, { opacity: 0 });
    const xTo = gsap.quickTo(f, 'x', { duration: .38, ease: 'power3' });
    const yTo = gsap.quickTo(f, 'y', { duration: .38, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { gsap.to(f, { opacity: 1, duration: .3, overwrite: 'auto' }); xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a,button,label,input,textarea,[data-cursor]');
      const txt = t && t.dataset ? t.dataset.cursor : '';
      f.classList.toggle('is-link', !!t);
      f.classList.toggle('is-label', !!txt);
      label.textContent = txt || '';
    });
    document.addEventListener('pointerleave', () => gsap.to(f, { opacity: 0, duration: .3 }));

    // Boutons magnétiques
    $$('.magnetic').forEach((el) => {
      const xt = gsap.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1,.45)' });
      const yt = gsap.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1,.45)' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xt((e.clientX - (r.left + r.width / 2)) * .32); yt((e.clientY - (r.top + r.height / 2)) * .42); });
      el.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });

    // Cartes / tuiles : tilt 3D + reflet qui suit la souris
    $$('.tilt').forEach((el) => {
      const gl = document.createElement('span');
      gl.className = 'gloss';
      el.appendChild(gl);
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3.out' });
      const gx = gsap.quickTo(gl, 'x', { duration: .35, ease: 'power3.out' });
      const gy = gsap.quickTo(gl, 'y', { duration: .35, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - .5) * 11); rx(-(py - .5) * 11); gx(px * r.width); gy(py * r.height);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ----------------------------------------------------- Compose ton set */
  function setupSet() {
    const SHAPES = {
      amande: ['Amande', 'M50 2C58 2 76 40 86 92C92 128 74 158 50 158C26 158 8 128 14 92C24 40 42 2 50 2Z'],
      ovale: ['Ovale', 'M50 8C76 8 90 46 90 90C90 132 74 158 50 158C26 158 10 132 10 90C10 46 24 8 50 8Z'],
      carre: ['Carré', 'M50 14C84 14 90 40 90 88C90 128 82 158 50 158C18 158 10 128 10 88C10 40 16 14 50 14Z']
    };
    const COLORS = [['Rose Addict', '#ff2d87'], ['Dragée', '#ffb3cf'], ['Cerise', '#d4142f'], ['Corail', '#ff6f59'], ['Pêche', '#ffc29a'], ['Citron', '#e6f04d'], ['Vert d\'eau', '#b9e5c3'], ['Lilas', '#c8a8ee'], ['Chocolat', '#4a2019'], ['Nude', '#e8b9a5']];
    const FINISH = { gloss: 'Gloss', mat: 'Mat', french: 'French', paillettes: 'Paillettes' };
    const NAILS = [
      { x: 84, y: 276, r: -20, s: .64 }, { x: 206, y: 250, r: -8, s: .86 }, { x: 332, y: 238, r: 0, s: 1 },
      { x: 458, y: 250, r: 8, s: .9 }, { x: 574, y: 278, r: 22, s: .74 }
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };

    const hand = $('#hand'), group = $('#hand-nails'), defs = $('#hand-defs');
    if (!hand) return;
    const sel = { shape: 'amande', color: 0, finish: 'gloss' };
    const sparkSeeds = [[30, 40, 2.2], [62, 56, 1.6], [44, 78, 2.6], [70, 94, 1.8], [28, 110, 1.6], [54, 126, 2.2], [66, 30, 1.4], [38, 142, 1.4], [74, 120, 1.6]];
    const parts = NAILS.map((n, i) => {
      const g = mk('g', { class: 'nailg', transform: `translate(${n.x} ${n.y}) rotate(${n.r}) scale(${n.s}) translate(-50 -160)` }, group);
      const pop = mk('g', { class: 'pop' }, g);
      const clip = mk('clipPath', { id: `nc${i}` }, defs);
      const clipPath = mk('path', { d: SHAPES.amande[1] }, clip);
      const base = mk('path', { d: SHAPES.amande[1], fill: COLORS[0][1] }, pop);
      const inner = mk('g', { 'clip-path': `url(#nc${i})` }, pop);
      const tip = mk('path', { d: 'M-10 -10H110V44Q50 70 -10 44Z', fill: '#fffaf6', opacity: 0 }, inner);
      const sparks = mk('g', { opacity: 0 }, inner);
      const dots = sparkSeeds.map(([cx, cy, r]) => mk('circle', { cx, cy, r, fill: '#fff' }, sparks));
      const gloss = mk('path', { d: 'M33 38C27 68 27 102 33 126', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, pop);
      return { pop, base, clipPath, tip, sparks, dots, gloss };
    });

    const swWrap = $('#swatches');
    COLORS.forEach(([name, hex], i) => {
      const l = document.createElement('label');
      l.className = 'swatch';
      l.style.setProperty('--c', hex);
      l.innerHTML = `<input type="radio" name="color" value="${i}" aria-label="${name}" title="${name}"${i === 0 ? ' checked' : ''}><span></span>`;
      swWrap.appendChild(l);
    });

    const twinkle = gsap.timeline({ paused: true, repeat: -1 });
    parts.forEach((p) => twinkle.to(p.dots, { opacity: .1, duration: .9, ease: 'sine.inOut', stagger: { each: .12, yoyo: true, repeat: 1 } }, 0));
    const text = () => `${SHAPES[sel.shape][0]} · ${COLORS[sel.color][0]} · ${FINISH[sel.finish]}`;
    const dur = reduced ? 0 : undefined;

    function apply(what) {
      if (what === 'shape') parts.forEach((p) => { gsap.to([p.base, p.clipPath], { attr: { d: SHAPES[sel.shape][1] }, duration: dur ?? .7, ease: 'power3.inOut' }); });
      if (what === 'color') parts.forEach((p, i) => gsap.to(p.base, { fill: COLORS[sel.color][1], duration: dur ?? .6, delay: reduced ? 0 : i * .05, ease: 'power2.out' }));
      if (what === 'finish') {
        hand.classList.toggle('is-mat', sel.finish === 'mat');
        parts.forEach((p) => {
          gsap.to(p.tip, { opacity: sel.finish === 'french' ? 1 : 0, duration: dur ?? .5 });
          gsap.to(p.sparks, { opacity: sel.finish === 'paillettes' ? 1 : 0, duration: dur ?? .5 });
          gsap.to(p.gloss, { opacity: sel.finish === 'mat' ? 0 : 1, duration: dur ?? .5 });
        });
        if (sel.finish === 'paillettes' && !reduced) twinkle.play(); else twinkle.pause();
      }
      $('#set-sum').textContent = text();
      $('#set-color-name').textContent = COLORS[sel.color][0];
    }

    document.addEventListener('change', (e) => {
      if (!e.target.closest('.set')) return;
      if (e.target.name === 'shape') { sel.shape = e.target.value; apply('shape'); }
      if (e.target.name === 'color') { sel.color = +e.target.value; apply('color'); }
      if (e.target.name === 'finish') { sel.finish = e.target.value; apply('finish'); }
    });
    $('#set-book').addEventListener('click', () => {
      if (window.NailsBooking) window.NailsBooking.setSet(text().toLowerCase());
      goTo($('#reservation'));
    });

    if (!reduced) {
      gsap.set(parts.map((p) => p.pop), { opacity: 0 });
      ScrollTrigger.create({
        trigger: '.set__stage', start: 'top 80%', once: true,
        onEnter: () => gsap.fromTo(parts.map((p) => p.pop), { y: 80, scale: .5, opacity: 0, transformOrigin: '50% 100%' }, { y: 0, scale: 1, opacity: 1, duration: 1.4, ease: 'elastic.out(1,.55)', stagger: .12 })
      });
      gsap.to('.hand', { y: -10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
    $('#set-sum').textContent = text();
  }

  /* ------------------------------------------------------------ Avis (carrousel) */
  function setupReviews() {
    const track = $('#rev-track'), bar = $('#rev-bar');
    if (!track) return;
    const step = () => { const c = $('.rev', track); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : 320; };
    $('#rev-next').addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
    $('#rev-prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    const onScroll = () => { const max = track.scrollWidth - track.clientWidth; bar.style.transform = `scaleX(${.16 + .84 * (max > 0 ? track.scrollLeft / max : 0)})`; };
    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    // glisser à la souris (desktop)
    let down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = track.scrollLeft; track.style.scrollSnapType = 'none'; track.style.cursor = 'grabbing'; });
    window.addEventListener('pointermove', (e) => { if (down) track.scrollLeft = sl - (e.clientX - sx); });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; track.style.scrollSnapType = ''; track.style.cursor = ''; });
  }

  /* ------------------------------------------------ Horaires / ouvert-fermé */
  function setupHours() {
    const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const OPEN = [1, 2, 3, 4];
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const d = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
    const m = (parseInt(parts.hour, 10) % 24) * 60 + parseInt(parts.minute, 10);
    $(`.hours tr[data-day="${d}"]`) && $(`.hours tr[data-day="${d}"]`).classList.add('is-today');
    const box = $('#open-status'), text = $('#open-text');
    const isOpen = OPEN.includes(d) && m >= 540 && m < 1140;
    box.classList.toggle('is-open', isOpen);
    if (isOpen) text.textContent = 'Ouvert maintenant · ferme à 19h';
    else if (OPEN.includes(d) && m < 540) text.textContent = 'Fermé · ouvre aujourd\'hui à 9h';
    else { let n = 1; while (!OPEN.includes((d + n) % 7)) n++; text.textContent = `Fermé · rouvre ${n === 1 ? 'demain' : DAYS[(d + n) % 7]} à 9h`; }
  }

  /* ------------------------------------------------------------------ Boot */
  setupHeroMedia();
  setupChrome();
  setupSet();
  setupReviews();
  setupHours();

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const isMobile = matchMedia('(max-width: 899px)').matches;
    setupAnimations(isMobile);
    setupPointer();
  });
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', setupPins);

  runLoader();
  setTimeout(heroIntro, 10000);   // filet de sécurité : le hero ne reste jamais masqué

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  // La réservation change de hauteur à chaque étape : on recale les déclencheurs placés en dessous
  const booking = $('.booking');
  if (booking && window.ResizeObserver) {
    let h = booking.offsetHeight, t;
    new ResizeObserver(() => {
      if (Math.abs(booking.offsetHeight - h) < 4) return;
      h = booking.offsetHeight;
      clearTimeout(t);
      t = setTimeout(refresh, 250);
    }).observe(booking);
  }
})();
