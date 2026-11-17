/* ==========================================================================
   STERLING EXECUTIVE TRAVEL — VANILLA JAVASCRIPT CHOREOGRAPHY
   Zero frameworks. High-precision rAF scroll progress + interactive controls.
   ========================================================================== */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     Utility helpers
     ------------------------------------------------------------------------ */
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const lerp = (start, end, t) => start + (end - start) * t;
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ------------------------------------------------------------------------
     1. Navigation: Scroll transition + Mobile drawer
     ------------------------------------------------------------------------ */
  const siteHeader = document.getElementById('siteHeader');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');

  function updateHeaderState() {
    if (!siteHeader) return;
    const scrolled = window.scrollY > 48;
    siteHeader.classList.toggle('is-scrolled', scrolled);
  }

  if (mobileMenuToggle && mobileDrawer) {
    mobileMenuToggle.addEventListener('click', () => {
      const expanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
      mobileMenuToggle.setAttribute('aria-expanded', String(!expanded));
      mobileDrawer.hidden = expanded;
      document.body.style.overflow = expanded ? '' : 'hidden';
    });

    mobileDrawer.querySelectorAll('a, button').forEach((item) => {
      item.addEventListener('click', () => {
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileDrawer.hidden = true;
        document.body.style.overflow = '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     2. Signature 4-Scene Scroll-Controlled Cinematic Hero
     ------------------------------------------------------------------------ */
  const heroSection = document.getElementById('hero');
  const heroScenes = Array.from(document.querySelectorAll('.hero-scene'));
  const chapterButtons = Array.from(document.querySelectorAll('.chapter-btn'));

  // Timeline segments across overall scroll progress [0..1]
  // Scene 0: visible 0.00 -> 0.28 (zooms 1.00 -> 1.30)
  // Scene 1: enters 0.20 -> 0.30, active until 0.54 (zooms 1.00 -> 1.28)
  // Scene 2: enters 0.46 -> 0.56, active until 0.78 (zooms 1.00 -> 1.26)
  // Scene 3: enters 0.70 -> 0.80, active until 1.00 (slow zoom-out 1.22 -> 1.02)
  const SCENE_CONFIG = [
    { start: 0.0, enterEnd: 0.0, exitStart: 0.21, end: 0.29, scaleFrom: 1.0, scaleTo: 1.3, panX: -14 },
    { start: 0.20, enterEnd: 0.30, exitStart: 0.46, end: 0.54, scaleFrom: 1.02, scaleTo: 1.28, panX: 16 },
    { start: 0.46, enterEnd: 0.56, exitStart: 0.71, end: 0.79, scaleFrom: 1.0, scaleTo: 1.26, panX: -12 },
    { start: 0.70, enterEnd: 0.80, exitStart: 1.0, end: 1.0, scaleFrom: 1.22, scaleTo: 1.02, panX: 10 },
  ];

  let activeChapter = 0;

  function setReducedMotionChapter(index) {
    activeChapter = index;
    heroScenes.forEach((scene, i) => {
      const active = i === index;
      scene.classList.toggle('is-active', active);
      scene.classList.toggle('is-visible', active);
      scene.setAttribute('aria-hidden', String(!active));
    });
    chapterButtons.forEach((btn, i) => {
      const active = i === index;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.style.setProperty('--chapter-progress', active ? '1' : '0');
    });
  }

  function renderHeroScroll(progress) {
    if (!heroScenes.length) return;

    if (prefersReducedMotion.matches) {
      setReducedMotionChapter(activeChapter);
      return;
    }

    // Determine active copy chapter cleanly
    let nextActive = 0;
    if (progress >= 0.73) nextActive = 3;
    else if (progress >= 0.49) nextActive = 2;
    else if (progress >= 0.24) nextActive = 1;
    else nextActive = 0;

    activeChapter = nextActive;

    heroScenes.forEach((scene, idx) => {
      const cfg = SCENE_CONFIG[idx];
      const isVisible =
        idx === 0
          ? progress <= cfg.end + 0.05
          : progress >= cfg.start - 0.03 && progress <= (idx === 3 ? 1.02 : cfg.end + 0.05);

      scene.classList.toggle('is-visible', isVisible);

      const isActiveCopy = idx === nextActive;
      scene.classList.toggle('is-active', isActiveCopy);
      scene.setAttribute('aria-hidden', String(!isActiveCopy));

      if (!isVisible) {
        scene.style.opacity = '0';
        scene.style.zIndex = String(1 + idx);
        return;
      }

      // Local scene zoom progress [0..1]
      const spanEnd = idx === 3 ? 1.0 : cfg.end;
      const localProgress = clamp((progress - cfg.start) / Math.max(0.001, spanEnd - cfg.start), 0, 1);

      const scale = lerp(cfg.scaleFrom, cfg.scaleTo, localProgress);
      const panX = lerp(0, cfg.panX, localProgress);

      // Clip-path & opacity reveal for Scenes 02–04
      let opacity = 1;
      let clipInsetTop = 0;
      let clipInsetBottom = 0;

      if (idx > 0) {
        const enterT = smoothstep(cfg.start, cfg.enterEnd, progress);
        opacity = enterT;
        if (idx === 1) {
          // Vertical curtain reveal
          clipInsetBottom = (1 - enterT) * 100;
        } else if (idx === 2) {
          // Cinematic split iris reveal
          const half = (1 - enterT) * 46;
          clipInsetTop = half;
          clipInsetBottom = half;
        } else {
          // Horizon sweep reveal
          clipInsetTop = (1 - enterT) * 100;
        }
      }

      // Smooth fade-out of earlier scene copy right before transition
      let copyOpacity = 1;
      let copyY = 0;
      if (idx < 3 && progress > cfg.exitStart) {
        const exitT = smoothstep(cfg.exitStart, cfg.end - 0.02, progress);
        copyOpacity = 1 - exitT;
        copyY = -28 * exitT;
      }

      scene.style.zIndex = String(2 + idx);
      scene.style.opacity = opacity.toFixed(4);
      scene.style.clipPath = `inset(${clipInsetTop.toFixed(2)}% 0% ${clipInsetBottom.toFixed(2)}% 0%)`;
      scene.style.setProperty('--img-scale', scale.toFixed(4));
      scene.style.setProperty('--img-x', `${panX.toFixed(2)}px`);
      scene.style.setProperty('--copy-opacity', copyOpacity.toFixed(4));
      scene.style.setProperty('--copy-y', `${copyY.toFixed(2)}px`);
    });

    // Update Chapter HUD bars
    const chapterRanges = [
      [0.0, 0.25],
      [0.25, 0.50],
      [0.50, 0.75],
      [0.75, 1.0],
    ];
    chapterButtons.forEach((btn, idx) => {
      const [cStart, cEnd] = chapterRanges[idx];
      const fill = clamp((progress - cStart) / (cEnd - cStart), 0, 1);
      const isCurrent = idx === nextActive;
      btn.classList.toggle('is-active', isCurrent);
      btn.setAttribute('aria-selected', String(isCurrent));
      btn.style.setProperty('--chapter-progress', fill.toFixed(3));
    });
  }

  // Click chapter buttons to smoothly jump to that cinematic scene
  const CHAPTER_SCROLL_TARGETS = [0.02, 0.34, 0.60, 0.88];
  chapterButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      if (prefersReducedMotion.matches) {
        setReducedMotionChapter(idx);
        return;
      }
      if (!heroSection) return;
      const heroTop = heroSection.offsetTop;
      const scrollRunway = Math.max(1, heroSection.offsetHeight - window.innerHeight);
      const targetY = heroTop + scrollRunway * CHAPTER_SCROLL_TARGETS[idx];
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });

  /* ------------------------------------------------------------------------
     3. Introduction & Starlight Scroll Zoom Fallback (when scroll-timeline unsupported)
     ------------------------------------------------------------------------ */
  const introZoomFrame = document.getElementById('introZoomFrame');
  const introZoomImg = document.getElementById('introZoomImg');
  const starlightSection = document.getElementById('starlight');
  const starlightBgImg = document.getElementById('starlightBgImg');
  const supportsCssScrollTimeline = CSS.supports('animation-timeline: view()');

  function updateSectionScrollZooms() {
    if (prefersReducedMotion.matches || supportsCssScrollTimeline) return;

    const vh = window.innerHeight || 900;

    if (introZoomFrame && introZoomImg) {
      const rect = introZoomFrame.getBoundingClientRect();
      const t = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      const zoom = lerp(1.0, 1.16, t);
      introZoomImg.style.setProperty('--intro-zoom', zoom.toFixed(4));
    }

    if (starlightSection && starlightBgImg) {
      const rect = starlightSection.getBoundingClientRect();
      const t = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      const zoom = lerp(1.02, 1.2, t);
      starlightBgImg.style.setProperty('--starlight-zoom', zoom.toFixed(4));
    }
  }

  /* ------------------------------------------------------------------------
     4. Unified requestAnimationFrame Scroll Engine
     ------------------------------------------------------------------------ */
  let rafScheduled = false;

  function onScrollFrame() {
    rafScheduled = false;
    updateHeaderState();

    if (heroSection) {
      const heroTop = heroSection.offsetTop;
      const scrollRunway = Math.max(1, heroSection.offsetHeight - window.innerHeight);
      const progress = clamp((window.scrollY - heroTop) / scrollRunway, 0, 1);
      renderHeroScroll(progress);
    }

    updateSectionScrollZooms();
  }

  function scheduleScrollUpdate() {
    if (!rafScheduled) {
      rafScheduled = true;
      window.requestAnimationFrame(onScrollFrame);
    }
  }

  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
  onScrollFrame();

  /* ------------------------------------------------------------------------
     5. IntersectionObserver Reveal Animations
     ------------------------------------------------------------------------ */
  const revealBlocks = document.querySelectorAll('.reveal-block');
  if ('IntersectionObserver' in window && !prefersReducedMotion.matches) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    );
    revealBlocks.forEach((el) => observer.observe(el));
  } else {
    revealBlocks.forEach((el) => el.classList.add('is-revealed'));
  }

  /* ------------------------------------------------------------------------
     6. Airport Route Estimator
     ------------------------------------------------------------------------ */
  const airportSelect = document.getElementById('airportSelect');
  const districtSelect = document.getElementById('districtSelect');
  const routeDuration = document.getElementById('routeDuration');
  const routeProtocol = document.getElementById('routeProtocol');
  const plannerBookBtn = document.getElementById('plannerBookBtn');

  const ROUTE_MATRIX = {
    LHR: {
      Mayfair: ['45 – 55 min', 'Windsor Suite / Meet & Greet'],
      Knightsbridge: ['40 – 50 min', 'Terminals 2–5 Meet & Greet'],
      City: ['60 – 75 min', 'Live Traffic Routing · 60 min Grace'],
      Marylebone: ['45 – 55 min', 'Terminals 2–5 Meet & Greet'],
    },
    FAB: {
      Mayfair: ['55 – 70 min', 'Airside TAG Tarmac Access'],
      Knightsbridge: ['50 – 65 min', 'Airside TAG Tarmac Access'],
      City: ['75 – 90 min', 'Direct Flight Crew Coordination'],
      Marylebone: ['60 – 75 min', 'Airside TAG Tarmac Access'],
    },
    BQH: {
      Mayfair: ['50 – 65 min', 'ExecuJet Ramp Clearance'],
      Knightsbridge: ['50 – 65 min', 'ExecuJet Ramp Clearance'],
      City: ['40 – 55 min', 'Helipad & Ramp Transfer'],
      Marylebone: ['55 – 70 min', 'ExecuJet Ramp Clearance'],
    },
    LCY: {
      Mayfair: ['35 – 45 min', 'Jet Centre Concierge Escort'],
      Knightsbridge: ['40 – 50 min', 'Jet Centre Concierge Escort'],
      City: ['18 – 25 min', 'Express Canary Wharf Link'],
      Marylebone: ['40 – 50 min', 'Jet Centre Concierge Escort'],
    },
    LTN: {
      Mayfair: ['55 – 70 min', 'Harrods Aviation Tarmac'],
      Knightsbridge: ['60 – 75 min', 'Harrods Aviation Tarmac'],
      City: ['60 – 75 min', 'Signature FBO Priority Meet'],
      Marylebone: ['50 – 65 min', 'Harrods Aviation Tarmac'],
    },
  };

  function updateRouteEstimate() {
    if (!airportSelect || !districtSelect || !routeDuration || !routeProtocol) return;
    const airport = airportSelect.value;
    const district = districtSelect.value;
    const data = ROUTE_MATRIX[airport]?.[district];
    if (data) {
      routeDuration.textContent = data[0];
      routeProtocol.textContent = data[1];
    }
  }

  if (airportSelect && districtSelect) {
    airportSelect.addEventListener('change', updateRouteEstimate);
    districtSelect.addEventListener('change', updateRouteEstimate);
    updateRouteEstimate();
  }

  /* ------------------------------------------------------------------------
     7. Fleet Horizontal Carousel (Buttons + Tabs + Keyboard + Drag)
     ------------------------------------------------------------------------ */
  const fleetTrack = document.getElementById('fleetTrack');
  const fleetSlides = Array.from(document.querySelectorAll('.fleet-slide'));
  const fleetPrev = document.getElementById('fleetPrev');
  const fleetNext = document.getElementById('fleetNext');
  const fleetCounter = document.getElementById('fleetCounter');
  const fleetTabs = Array.from(document.querySelectorAll('.fleet-tab'));

  let fleetIndex = 0;

  function goToFleetSlide(index) {
    if (!fleetTrack || !fleetSlides.length) return;
    const total = fleetSlides.length;
    fleetIndex = ((index % total) + total) % total;

    const slide = fleetSlides[fleetIndex];
    const gap = parseFloat(window.getComputedStyle(fleetTrack).gap) || 24;
    const offset = fleetIndex * (slide.getBoundingClientRect().width + gap);

    fleetTrack.style.transform = `translate3d(${-offset}px, 0, 0)`;

    fleetSlides.forEach((s, i) => s.classList.toggle('is-current', i === fleetIndex));
    fleetTabs.forEach((t, i) => {
      const active = i === fleetIndex;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });

    if (fleetCounter) {
      fleetCounter.textContent = `0${fleetIndex + 1} / 0${total}`;
    }
  }

  if (fleetPrev && fleetNext) {
    fleetPrev.addEventListener('click', () => goToFleetSlide(fleetIndex - 1));
    fleetNext.addEventListener('click', () => goToFleetSlide(fleetIndex + 1));
  }

  fleetTabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => goToFleetSlide(idx));
  });

  window.addEventListener('resize', () => goToFleetSlide(fleetIndex), { passive: true });

  // Touch swipe on fleet viewport
  const fleetViewport = document.getElementById('fleetViewport');
  if (fleetViewport) {
    let touchStartX = 0;
    fleetViewport.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    fleetViewport.addEventListener(
      'touchend',
      (e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 45) {
          goToFleetSlide(deltaX < 0 ? fleetIndex + 1 : fleetIndex - 1);
        }
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------------
     8. Corporate Split Editorial Image Cross-Transition
     ------------------------------------------------------------------------ */
  const corpTabs = Array.from(document.querySelectorAll('.corp-tab'));
  const corpImages = Array.from(document.querySelectorAll('.corporate-img'));

  corpTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = Number(tab.dataset.corpTab);
      corpTabs.forEach((t, i) => {
        const active = i === target;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      corpImages.forEach((img, i) => {
        img.classList.toggle('is-visible', i === target);
      });
    });
  });

  /* ------------------------------------------------------------------------
     9. Bespoke Reservation Modal & Validation
     ------------------------------------------------------------------------ */
  const bookingModal = document.getElementById('bookingModal');
  const bookingBackdrop = document.getElementById('bookingBackdrop');
  const bookingClose = document.getElementById('bookingClose');
  const bookingForm = document.getElementById('bookingForm');
  const bookingService = document.getElementById('bookingService');
  const bookingVehicle = document.getElementById('bookingVehicle');
  const bookingPickup = document.getElementById('bookingPickup');
  const bookingDropoff = document.getElementById('bookingDropoff');
  const bookingDateTime = document.getElementById('bookingDateTime');
  const bookingError = document.getElementById('bookingError');
  const bookingConfirmation = document.getElementById('bookingConfirmation');
  const confirmationSummary = document.getElementById('confirmationSummary');
  const confirmationRef = document.getElementById('confirmationRef');
  const bookingDoneBtn = document.getElementById('bookingDoneBtn');

  let lastFocusedTrigger = null;

  function openBookingModal(options = {}) {
    if (!bookingModal) return;
    lastFocusedTrigger = document.activeElement;

    if (bookingForm && bookingConfirmation) {
      bookingForm.hidden = false;
      bookingConfirmation.hidden = true;
    }
    if (bookingError) {
      bookingError.hidden = true;
      bookingError.textContent = '';
    }

    if (options.service && bookingService) {
      bookingService.value = options.service;
    }
    if (options.vehicle && bookingVehicle) {
      bookingVehicle.value = options.vehicle;
    }
    if (options.pickup && bookingPickup) {
      bookingPickup.value = options.pickup;
    }
    if (options.dropoff && bookingDropoff) {
      bookingDropoff.value = options.dropoff;
    }

    if (bookingDateTime && !bookingDateTime.value) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setMinutes(0, 0, 0);
      bookingDateTime.value = tomorrow.toISOString().slice(0, 16);
    }

    bookingModal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (bookingClose) bookingClose.focus();
  }

  function closeBookingModal() {
    if (!bookingModal) return;
    bookingModal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
    }
  }

  document.querySelectorAll('[data-open-booking]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      openBookingModal({
        service: trigger.dataset.service,
        vehicle: trigger.dataset.vehicle,
      });
    });
  });

  if (plannerBookBtn && airportSelect && districtSelect) {
    plannerBookBtn.addEventListener('click', () => {
      const airportLabel = airportSelect.options[airportSelect.selectedIndex].text;
      const districtLabel = districtSelect.options[districtSelect.selectedIndex].text;
      openBookingModal({
        service: airportSelect.value === 'LHR' ? 'Executive Transfer' : 'Private Aviation Transfer',
        pickup: airportLabel,
        dropoff: districtLabel,
      });
    });
  }

  if (bookingBackdrop) bookingBackdrop.addEventListener('click', closeBookingModal);
  if (bookingClose) bookingClose.addEventListener('click', closeBookingModal);
  if (bookingDoneBtn) bookingDoneBtn.addEventListener('click', closeBookingModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal && !bookingModal.hidden) {
      closeBookingModal();
    }
  });

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!bookingError) return;

      const formData = new FormData(bookingForm);
      const pickup = String(formData.get('pickup') || '').trim();
      const dropoff = String(formData.get('dropoff') || '').trim();
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const vehicle = String(formData.get('vehicle') || '');
      const service = String(formData.get('service') || '');

      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const phoneValid = phone.replace(/\D/g, '').length >= 8;

      if (!pickup || !dropoff || !name) {
        bookingError.textContent = 'Please complete pickup, destination, and principal or PA name.';
        bookingError.hidden = false;
        return;
      }
      if (!emailValid) {
        bookingError.textContent = 'Please provide a valid contact email address.';
        bookingError.hidden = false;
        return;
      }
      if (!phoneValid) {
        bookingError.textContent = 'Please provide a valid telephone number including country code.';
        bookingError.hidden = false;
        return;
      }

      bookingError.hidden = true;
      const refCode = `STR-${Math.floor(100000 + Math.random() * 899999)}`;

      if (confirmationSummary && confirmationRef && bookingConfirmation) {
        confirmationSummary.textContent = `${service} aboard our ${vehicle} from ${pickup} to ${dropoff} has been assigned to a senior Mayfair coordinator. A formal itinerary will be dispatched to ${email}.`;
        confirmationRef.textContent = `Dispatch Reference · ${refCode}`;
        bookingForm.hidden = true;
        bookingConfirmation.hidden = false;
      }
    });
  }

  /* ------------------------------------------------------------------------
     10. Desktop Dropdown Accessibility & Active Nav Highlighting
     ------------------------------------------------------------------------ */
  const dropdowns = Array.from(document.querySelectorAll('[data-dropdown]'));
  dropdowns.forEach((dd) => {
    const trigger = dd.querySelector('.nav-dropdown-trigger');
    if (!trigger) return;

    dd.addEventListener('mouseenter', () => {
      trigger.setAttribute('aria-expanded', 'true');
    });
    dd.addEventListener('mouseleave', () => {
      dd.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        dd.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        const firstLink = dd.querySelector('.dropdown-link');
        if (firstLink) firstLink.focus();
      } else if (e.key === 'Escape') {
        dd.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.primary-nav a, .footer-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && currentPath.endsWith(href)) {
      link.classList.add('is-current');
    }
  });

  /* ------------------------------------------------------------------------
     11. Inner Page Parallax Image Drift
     ------------------------------------------------------------------------ */
  const parallaxImgs = Array.from(document.querySelectorAll('.parallax-img'));
  if (parallaxImgs.length && !prefersReducedMotion.matches) {
    const updateParallax = () => {
      const vh = window.innerHeight || 900;
      parallaxImgs.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const t = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
        const shift = lerp(-18, 18, t);
        img.style.setProperty('--parallax-y', `${shift.toFixed(1)}px`);
      });
    };
    window.addEventListener('scroll', () => window.requestAnimationFrame(updateParallax), {
      passive: true,
    });
    updateParallax();
  }

  /* ------------------------------------------------------------------------
     12. Airport Transfers Hub Selector (airport-transfers.html)
     ------------------------------------------------------------------------ */
  const hubTabs = Array.from(document.querySelectorAll('[data-hub-tab]'));
  const hubImg = document.getElementById('hubImg');
  const hubTitle = document.getElementById('hubTitle');
  const hubDesc = document.getElementById('hubDesc');
  const hubService = document.getElementById('hubService');
  const hubPickup = document.getElementById('hubPickup');

  const AIRPORT_HUBS = {
    heathrow: {
      title: 'London Heathrow Airport',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      service: 'Meet & Greet Inside Arrivals',
      pickup: 'Commercial Terminals & Private Suites',
      img: '/src/assets/images/page_heathrow_vip_arrival_1794911567183.jpg',
    },
    gatwick: {
      title: 'London Gatwick Airport',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      service: 'Live Flight Tracking',
      pickup: 'North & South Terminals',
      img: '/src/assets/images/hero_scene_chauffeur_welcome_1794910550273.jpg',
    },
    lcy: {
      title: 'London City Airport',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      service: 'Financial District Link',
      pickup: 'Main Terminal & Jet Centre',
      img: '/src/assets/images/service_city_roadshow_1794910550706.jpg',
    },
    luton: {
      title: 'London Luton Airport',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      service: 'Terminal & FBO Coordination',
      pickup: 'Main Arrivals & Private Terminals',
      img: '/src/assets/images/service_private_aviation_1794910551135.jpg',
    },
    stansted: {
      title: 'London Stansted Airport',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      service: 'Door-to-Door Executive Car',
      pickup: 'Main Terminal & Private Aviation',
      img: '/src/assets/images/hero_scene_london_skyline_1794910550156.jpg',
    },
    southampton: {
      title: 'Southampton Airport & Cruise Terminals',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      service: 'Airport & Ocean Port Link',
      pickup: 'Southampton Airport & Berths',
      img: '/src/assets/images/page_southampton_cruise_port_1794911567009.jpg',
    },
  };

  if (hubTabs.length && hubTitle && hubDesc) {
    hubTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.hubTab;
        const data = AIRPORT_HUBS[key];
        if (!data) return;

        hubTabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });

        hubTitle.textContent = data.title;
        hubDesc.textContent = data.desc;
        if (hubService) hubService.textContent = data.service;
        if (hubPickup) hubPickup.textContent = data.pickup;
        if (hubImg) hubImg.src = data.img;
      });
    });
  }

  /* ------------------------------------------------------------------------
     13. Special Occasions Filter (special-occasions.html)
     ------------------------------------------------------------------------ */
  const occasionFilterBtns = Array.from(document.querySelectorAll('[data-occasion-filter]'));
  const occasionCards = Array.from(document.querySelectorAll('.occasion-card'));

  if (occasionFilterBtns.length && occasionCards.length) {
    occasionFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.occasionFilter;
        occasionFilterBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        occasionCards.forEach((card) => {
          const matches = cat === 'all' || card.dataset.category === cat;
          card.hidden = !matches;
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     14. Luxury Experiences Sticky Preview (luxury-experiences.html)
     ------------------------------------------------------------------------ */
  const expItems = Array.from(document.querySelectorAll('[data-exp-index]'));
  const expImgs = Array.from(document.querySelectorAll('[data-exp-img]'));
  const expPreviewTitle = document.getElementById('expPreviewTitle');
  const expPreviewDesc = document.getElementById('expPreviewDesc');

  if (expItems.length && expImgs.length) {
    expItems.forEach((item) => {
      item.addEventListener('click', () => {
        const idx = Number(item.dataset.expIndex);
        expItems.forEach((el, i) => el.classList.toggle('is-active', i === idx));
        expImgs.forEach((img, i) => img.classList.toggle('is-visible', i === idx));
        if (expPreviewTitle) expPreviewTitle.textContent = item.dataset.expTitle || '';
        if (expPreviewDesc) expPreviewDesc.textContent = item.dataset.expNote || '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     15. Fleet Gallery Filter & Interactive Viewer (fleet.html)
     ------------------------------------------------------------------------ */
  const fleetCatBtns = Array.from(document.querySelectorAll('[data-fleet-cat]'));
  const fleetThumbBtns = Array.from(document.querySelectorAll('[data-fleet-gallery]'));
  const fleetStageImg = document.getElementById('fleetStageImg');
  const fleetStageCat = document.getElementById('fleetStageCat');
  const fleetStageTitle = document.getElementById('fleetStageTitle');
  const fleetStageDesc = document.getElementById('fleetStageDesc');

  const FLEET_GALLERY_ITEMS = [
    {
      cat: 'flagship',
      label: 'Flagship Luxury Saloon',
      title: 'Flagship Chauffeur Saloon',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/hero_scene_london_mayfair_1794910547621.jpg',
    },
    {
      cat: 'interior',
      label: 'Bespoke Interior',
      title: 'Starlight Cabin Environment',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/hero_scene_starlight_cabin_1794910548933.jpg',
    },
    {
      cat: 'executive',
      label: 'Executive Saloon',
      title: 'Executive City Saloon',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/hero_scene_london_skyline_1794910550156.jpg',
    },
    {
      cat: 'suv',
      label: 'Luxury SUV',
      title: 'Luxury Touring SUV',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/fleet_range_rover_1794910552895.jpg',
    },
    {
      cat: 'mpv',
      label: 'Executive Group MPV',
      title: 'Executive Lounge MPV',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/fleet_vclass_lounge_1794910552246.jpg',
    },
    {
      cat: 'interior',
      label: 'Coachwork Detail',
      title: 'Obsidian Coachwork Finish',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/intro_coachwork_detail_1794910553297.jpg',
    },
    {
      cat: 'executive',
      label: 'Aviation Arrival',
      title: 'Tarmac & Terminal Presentation',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/service_private_aviation_1794910551135.jpg',
    },
    {
      cat: 'suv',
      label: 'Estate & Countryside',
      title: 'Countryside & Estate Touring',
      desc: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident soluta accusamus impedit atque sequi facilis accusantium iste laboriosam commodi.',
      img: '/src/assets/images/page_luxury_countryside_1794911566072.jpg',
    },
  ];

  function showFleetGalleryItem(idx) {
    const item = FLEET_GALLERY_ITEMS[idx];
    if (!item) return;
    if (fleetStageImg) {
      fleetStageImg.src = item.img;
      fleetStageImg.alt = item.title;
    }
    if (fleetStageCat) fleetStageCat.textContent = item.label;
    if (fleetStageTitle) fleetStageTitle.textContent = item.title;
    if (fleetStageDesc) fleetStageDesc.textContent = item.desc;
    fleetThumbBtns.forEach((btn, i) => btn.classList.toggle('is-active', i === idx));
  }

  if (fleetThumbBtns.length && fleetStageImg) {
    fleetThumbBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        showFleetGalleryItem(Number(btn.dataset.fleetGallery));
      });
    });

    fleetCatBtns.forEach((catBtn) => {
      catBtn.addEventListener('click', () => {
        const cat = catBtn.dataset.fleetCat;
        fleetCatBtns.forEach((b) => b.classList.toggle('is-active', b === catBtn));
        let firstMatch = -1;
        fleetThumbBtns.forEach((thumb, i) => {
          const item = FLEET_GALLERY_ITEMS[i];
          const visible = cat === 'all' || (item && item.cat === cat);
          thumb.hidden = !visible;
          if (visible && firstMatch === -1) firstMatch = i;
        });
        if (firstMatch !== -1) showFleetGalleryItem(firstMatch);
      });
    });
  }

  /* ------------------------------------------------------------------------
     16. FAQs Animated Accordions & Topic Filter (faqs.html)
     ------------------------------------------------------------------------ */
  const faqFilterBtns = Array.from(document.querySelectorAll('[data-faq-filter]'));
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));

  if (faqItems.length) {
    faqItems.forEach((item) => {
      const trigger = item.querySelector('.faq-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        faqItems.forEach((other) => {
          other.classList.remove('is-open');
          const otherBtn = other.querySelector('.faq-trigger');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    faqFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const topic = btn.dataset.faqFilter;
        faqFilterBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        faqItems.forEach((item) => {
          const matches = topic === 'all' || item.dataset.faqTopic === topic;
          item.hidden = !matches;
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     17. Dedicated Contact Page Form (contact.html)
     ------------------------------------------------------------------------ */
  const contactForm = document.getElementById('contactForm');
  const contactError = document.getElementById('contactError');
  const contactConfirmation = document.getElementById('contactConfirmation');
  const contactResetBtn = document.getElementById('contactResetBtn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactError || !contactConfirmation) return;

      const data = new FormData(contactForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const message = String(data.get('message') || '').trim();
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !message) {
        contactError.textContent = 'Please provide your name and enquiry details.';
        contactError.hidden = false;
        return;
      }
      if (!emailValid) {
        contactError.textContent = 'Please enter a valid email address.';
        contactError.hidden = false;
        return;
      }

      contactError.hidden = true;
      contactForm.hidden = true;
      contactConfirmation.hidden = false;
    });

    if (contactResetBtn) {
      contactResetBtn.addEventListener('click', () => {
        contactForm.reset();
        contactForm.hidden = false;
        contactConfirmation.hidden = true;
      });
    }
  }

  /* ------------------------------------------------------------------------
     18. Dedicated Book Your Journey Page Form & Live Summary (book.html)
     ------------------------------------------------------------------------ */
  const journeyForm = document.getElementById('journeyBookingForm');
  const journeyError = document.getElementById('journeyError');
  const journeyConfirmation = document.getElementById('journeyConfirmation');
  const journeyConfirmText = document.getElementById('journeyConfirmText');
  const journeyConfirmRef = document.getElementById('journeyConfirmRef');
  const journeyNewBtn = document.getElementById('journeyNewBtn');

  if (journeyForm) {
    const syncField = (inputId, summaryId, fallback) => {
      const input = document.getElementById(inputId);
      const target = document.getElementById(summaryId);
      if (!input || !target) return;
      const update = () => {
        target.textContent = input.value.trim() || fallback;
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
      update();
    };

    syncField('jService', 'sumService', 'Executive Chauffeur');
    syncField('jPickup', 'sumPickup', 'To be confirmed');
    syncField('jDropoff', 'sumDropoff', 'To be confirmed');
    syncField('jDate', 'sumDate', 'To be confirmed');
    syncField('jTime', 'sumTime', 'To be confirmed');
    syncField('jPassengers', 'sumPassengers', '1 Passenger');

    journeyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!journeyError || !journeyConfirmation) return;

      const fd = new FormData(journeyForm);
      const name = String(fd.get('name') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const pickup = String(fd.get('pickup') || '').trim();
      const destination = String(fd.get('destination') || '').trim();
      const date = String(fd.get('date') || '').trim();
      const time = String(fd.get('time') || '').trim();
      const service = String(fd.get('service') || '').trim();

      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const phoneValid = phone.replace(/\D/g, '').length >= 8;

      if (!name || !pickup || !destination || !date || !time) {
        journeyError.textContent =
          'Please complete your name, pickup location, destination, date, and time.';
        journeyError.hidden = false;
        return;
      }
      if (!emailValid) {
        journeyError.textContent = 'Please provide a valid email address.';
        journeyError.hidden = false;
        return;
      }
      if (!phoneValid) {
        journeyError.textContent = 'Please provide a valid contact telephone number.';
        journeyError.hidden = false;
        return;
      }

      journeyError.hidden = true;
      const ref = `STR-${Math.floor(100000 + Math.random() * 899999)}`;
      if (journeyConfirmText) {
        journeyConfirmText.textContent = `Thank you, ${name}. Your ${service} request from ${pickup} to ${destination} on ${date} at ${time} has been received. Confirmation details will be sent to ${email}.`;
      }
      if (journeyConfirmRef) {
        journeyConfirmRef.textContent = `Enquiry Reference · ${ref}`;
      }
      journeyForm.hidden = true;
      journeyConfirmation.hidden = false;
    });

    if (journeyNewBtn) {
      journeyNewBtn.addEventListener('click', () => {
        journeyForm.reset();
        journeyForm.hidden = false;
        journeyConfirmation.hidden = true;
      });
    }
  }
})();
