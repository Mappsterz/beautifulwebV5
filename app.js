document.addEventListener('DOMContentLoaded', () => {

  function onScrollFrame(callback) {
    let ticking = false;
    return () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        callback();
        ticking = false;
      });
    };
  }

  // ==========================================
  // Mobile Navigation
  // ==========================================
  const menuToggle = document.getElementById('menu-toggle');
  const navWrapper = document.getElementById('nav-wrapper');
  const navOverlay = document.getElementById('nav-overlay');

  function closeMenu() {
    menuToggle?.classList.remove('active');
    navWrapper?.classList.remove('open');
    navOverlay?.classList.remove('active');
    document.body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    menuToggle?.classList.add('active');
    navWrapper?.classList.add('open');
    navOverlay?.classList.add('active');
    document.body.classList.add('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'true');
  }

  menuToggle?.addEventListener('click', () => {
    if (navWrapper?.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navOverlay?.addEventListener('click', closeMenu);

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // ==========================================
  // Header Scroll Effect
  // ==========================================
  const header = document.getElementById('header');

  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  // ==========================================
  // Hero Featured Works Rotation
  // ==========================================
  const heroSlides = document.querySelectorAll('.hero-slide');
  const heroCaption = document.getElementById('hero-caption');
  const heroCaptionTitle = document.getElementById('hero-caption-title');
  const heroCaptionMeta = document.getElementById('hero-caption-meta');
  let heroIndex = 0;
  let heroTimer = null;
  let heroCaptionTimer = null;
  let heroTransitioning = false;
  const heroPreloads = new Map();
  const CAPTION_SWAP_MS = 240;
  const LIGHTBOX_SWAP_MS = 120;
  const HERO_INTERVAL_MS = 5500;
  const HERO_TRANSITION_MS = 480;
  const MODAL_TRANSITION_MS = 400;

  function preloadHeroSrc(src) {
    if (!src) return Promise.resolve(false);
    if (heroPreloads.has(src)) return heroPreloads.get(src);

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });

    heroPreloads.set(src, promise);
    return promise;
  }

  async function prepareHeroSlide(slide) {
    const src = slide?.dataset.src || slide?.getAttribute('src');
    if (!src || src.startsWith('data:')) return;

    await preloadHeroSrc(src);
    if (slide.dataset.src) slide.src = slide.dataset.src;

    if (slide.decode) {
      try {
        await slide.decode();
      } catch {
        /* decoded or failed — continue */
      }
    } else if (!slide.complete) {
      await new Promise((resolve) => {
        slide.onload = resolve;
        slide.onerror = resolve;
      });
    }
  }

  function setHeroSlideClasses(activeIndex) {
    heroSlides.forEach((slide, i) => {
      slide.classList.remove('is-fading-in', 'is-visible');
      if (i === activeIndex) slide.classList.add('is-visible');
    });
  }

  function showHeroSlide(index, { immediate = false } = {}) {
    const target = heroSlides[index];
    if (!target) return;
    if (!immediate && index === heroIndex) return;

    if (immediate) {
      setHeroSlideClasses(index);
      heroIndex = index;
      writeHeroCaption(target);
      heroCaption?.classList.toggle('active', Boolean(target.dataset.title));
      heroCaption?.classList.remove('is-changing');
      return;
    }

    if (heroTransitioning) return;

    const previousIndex = heroIndex;
    const previous = heroSlides[previousIndex];
    heroTransitioning = true;
    heroIndex = index;

    heroSlides.forEach((slide, i) => {
      if (i !== previousIndex && i !== index) {
        slide.classList.remove('is-fading-in', 'is-visible');
      }
    });

    if (previous && previous !== target) {
      previous.classList.remove('is-fading-in');
      previous.classList.add('is-visible');
    }

    target.classList.remove('is-visible');
    target.classList.remove('is-fading-in');
    void target.offsetWidth;
    target.classList.add('is-fading-in');

    const finishTransition = (() => {
      let done = false;
      return () => {
        if (done) return;
        done = true;
        target.removeEventListener('animationend', onAnimationEnd);
        setHeroSlideClasses(index);
        heroTransitioning = false;
      };
    })();

    const onAnimationEnd = (event) => {
      if (event.target !== target || event.animationName !== 'heroCrossfade') return;
      finishTransition();
    };

    target.addEventListener('animationend', onAnimationEnd);
    setTimeout(finishTransition, HERO_TRANSITION_MS + 80);

    swapHeroCaption(target);
  }

  function writeHeroCaption(slide) {
    if (!slide) return;
    const title = slide.dataset.title || '';
    const meta = slide.dataset.meta || '';
    if (heroCaptionTitle) heroCaptionTitle.textContent = title;
    if (heroCaptionMeta) heroCaptionMeta.innerHTML = meta;
  }

  function swapHeroCaption(slide) {
    if (!slide || !heroCaption) return;

    clearTimeout(heroCaptionTimer);
    heroCaption.classList.add('is-changing');

    heroCaptionTimer = setTimeout(() => {
      writeHeroCaption(slide);
      heroCaption.classList.toggle('active', Boolean(slide.dataset.title));
      heroCaption.classList.remove('is-changing');
    }, CAPTION_SWAP_MS);
  }

  function advanceHeroSlide() {
    if (heroTransitioning) return;
    const nextIndex = (heroIndex + 1) % heroSlides.length;
    showHeroSlide(nextIndex);
  }

  function startHeroRotation() {
    if (heroSlides.length <= 1) return;
    stopHeroRotation();
    heroTimer = setInterval(advanceHeroSlide, HERO_INTERVAL_MS);
  }

  function stopHeroRotation() {
    if (heroTimer) {
      clearInterval(heroTimer);
      heroTimer = null;
    }
  }

  async function initHero() {
    if (!heroSlides.length) return;

    await Promise.all([...heroSlides].map((slide) => prepareHeroSlide(slide)));

    showHeroSlide(heroIndex, { immediate: true });
    if (heroSlides.length > 1) startHeroRotation();
  }

  initHero();

  // ==========================================
  // Scroll Reveal
  // ==========================================
  document.querySelectorAll('.art-card').forEach((card, index) => {
    card.classList.add('reveal');
    card.style.setProperty('--reveal-index', index);
  });

  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('visible'));
  }

  // ==========================================
  // Back to Top
  // ==========================================
  const backToTop = document.getElementById('back-to-top');

  const updateBackToTop = () => {
    if (window.scrollY > 600) {
      backToTop?.classList.add('visible');
    } else {
      backToTop?.classList.remove('visible');
    }
  };

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ==========================================
  // Gallery Filtering
  // ==========================================
  const filterButtons = document.querySelectorAll('.filter-btn');
  const subfiltersContainer = document.getElementById('gallery-subfilters');
  const artCards = document.querySelectorAll('.art-card');
  const galleryClusters = document.querySelectorAll('.gallery-cluster');
  const topLevelCards = document.querySelectorAll('.gallery-grid > .art-card');

  const subfilterOptions = {
    paintings: [
      { value: 'all', label: 'All Paintings' },
      { value: 'portraits', label: 'Portraits' },
      { value: 'animals', label: 'Animals' },
      { value: 'objects', label: 'Objects' }
    ],
    sculptures: [
      { value: 'all', label: 'All Sculptures' },
      { value: 'wall-works', label: 'Wall Works' },
      { value: 'assemblage', label: 'Assemblage' },
      { value: 'freestanding', label: 'Freestanding' }
    ]
  };

  let activeMainFilter = 'all';
  let activeSubFilter = 'all';

  function showCard(card) {
    card.classList.remove('hidden');
    card.style.display = 'flex';
  }

  function hideCard(card) {
    card.classList.add('hidden');
    card.style.display = 'none';
  }

  function matchesSubfilter(subcategory) {
    return activeSubFilter === 'all' || subcategory === activeSubFilter;
  }

  function renderSubfilters(category) {
    if (!subfiltersContainer) return;

    const options = subfilterOptions[category];
    if (!options) {
      subfiltersContainer.hidden = true;
      subfiltersContainer.innerHTML = '';
      return;
    }

    subfiltersContainer.hidden = false;
    subfiltersContainer.innerHTML = options.map(option => `
      <li>
        <button
          class="subfilter-btn${option.value === activeSubFilter ? ' active' : ''}"
          data-subfilter="${option.value}"
          type="button"
        >
          ${option.label}
        </button>
      </li>
    `).join('');

    subfiltersContainer.querySelectorAll('.subfilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSubFilter = btn.getAttribute('data-subfilter') || 'all';
        subfiltersContainer.querySelectorAll('.subfilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyGalleryFilters();
      });
    });
  }

  function applyGalleryFilters() {
    topLevelCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const subcategory = card.getAttribute('data-subcategory');
      const categoryMatch = activeMainFilter === 'all' || category === activeMainFilter;
      const subcategoryMatch = activeMainFilter === 'all' ||
        !subfilterOptions[activeMainFilter] ||
        matchesSubfilter(subcategory);

      if (categoryMatch && subcategoryMatch) {
        showCard(card);
      } else {
        hideCard(card);
      }
    });

    galleryClusters.forEach(cluster => {
      const category = cluster.getAttribute('data-category');
      const subcategory = cluster.getAttribute('data-subcategory') ||
        cluster.querySelector('.art-card')?.getAttribute('data-subcategory');
      const clusterCards = cluster.querySelectorAll('.art-card');
      const categoryMatch = activeMainFilter === 'all' || category === activeMainFilter;
      const subcategoryMatch = activeMainFilter === 'all' ||
        !subfilterOptions[activeMainFilter] ||
        matchesSubfilter(subcategory);

      if (categoryMatch && subcategoryMatch) {
        cluster.classList.remove('hidden');
        clusterCards.forEach(showCard);
      } else {
        cluster.classList.add('hidden');
        clusterCards.forEach(hideCard);
      }
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      activeMainFilter = btn.getAttribute('data-filter') || 'all';
      activeSubFilter = 'all';

      if (subfilterOptions[activeMainFilter]) {
        renderSubfilters(activeMainFilter);
      } else {
        renderSubfilters(null);
      }

      applyGalleryFilters();
    });
  });

  // ==========================================
  // Lightbox Modal
  // ==========================================
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxMeta = document.getElementById('lightbox-meta');
  const lightboxAvailability = document.getElementById('lightbox-availability');
  const lightboxStatement = document.getElementById('lightbox-statement');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxThumbs = document.getElementById('lightbox-thumbs');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxInquireBtn = document.getElementById('lightbox-inquire-btn');
  const contactForm = document.getElementById('contact-form');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');

  const availabilityCopy = {
    available:         { label: 'Available',       cta: 'Acquire this work',          href: '#contact' },
    inquire:           { label: 'Inquire',         cta: 'Inquire about this work',    href: '#contact' },
    'print-available': { label: 'Print Available', cta: 'View Prints in the Shop',    href: 'shop.html' },
    sold:              { label: 'Sold',            cta: 'Inquire about similar work', href: '#contact' }
  };

  const visibleCards = () =>
    Array.from(artCards).filter(card => {
      const img = card.querySelector('.art-image-wrapper img');
      const cluster = card.closest('.gallery-cluster');
      if (cluster?.classList.contains('hidden')) return false;
      return img && !card.classList.contains('hidden') && card.style.display !== 'none';
    });

  let currentCardIndex = 0;
  let currentSlideIndex = 0;

  function getCardGallery(card) {
    if (card.dataset.gallery) {
      try {
        return JSON.parse(card.dataset.gallery);
      } catch {
        return null;
      }
    }
    const img = card.querySelector('.art-image-wrapper img');
    if (!img) return [];
    return [{
      src: img.getAttribute('src'),
      title: card.querySelector('.art-title')?.textContent || '',
      meta: card.querySelector('.art-meta')?.textContent || ''
    }];
  }

  function renderLightboxThumbs(gallery) {
    if (!lightboxThumbs) return;
    lightboxThumbs.innerHTML = '';

    if (gallery.length <= 1) {
      lightboxThumbs.classList.remove('active');
      return;
    }

    lightboxThumbs.classList.add('active');
    gallery.forEach((slide, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lightbox-thumb' + (index === currentSlideIndex ? ' active' : '');
      btn.setAttribute('aria-label', `View image ${index + 1} of ${gallery.length}`);
      btn.innerHTML = `<img src="${slide.src}" alt="">`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentSlideIndex = index;
        showCurrentSlide();
      });
      lightboxThumbs.appendChild(btn);
    });
  }

  let lightboxSwapTimer = null;

  function loadLightboxImage(src, alt) {
    if (!lightboxImage) return;

    clearTimeout(lightboxSwapTimer);
    lightboxImage.onload = null;

    const reveal = () => lightboxImage.classList.remove('is-swapping');

    const apply = () => {
      lightboxImage.setAttribute('src', src);
      lightboxImage.setAttribute('alt', alt);
      if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
        requestAnimationFrame(reveal);
      } else {
        lightboxImage.onload = reveal;
      }
    };

    const currentSrc = lightboxImage.getAttribute('src');
    if (currentSrc && currentSrc !== src) {
      lightboxImage.classList.add('is-swapping');
      lightboxSwapTimer = setTimeout(apply, LIGHTBOX_SWAP_MS);
    } else {
      apply();
    }
  }

  function showCurrentSlide() {
    const cards = visibleCards();
    if (!cards.length) return;

    const card = cards[currentCardIndex];
    const gallery = getCardGallery(card);
    if (!gallery.length) return;

    currentSlideIndex = ((currentSlideIndex % gallery.length) + gallery.length) % gallery.length;
    const slide = gallery[currentSlideIndex];
    const year = card.querySelector('.art-year')?.textContent || '';

    loadLightboxImage(slide.src, `${slide.title} - Artwork by Beau Thompson`);
    lightboxImage.decoding = 'async';
    lightboxTitle.textContent = slide.title;
    lightboxMeta.innerHTML = `${slide.meta} &bull; ${year}`;

    const availabilityKey = card.dataset.availability || '';
    const availability = availabilityCopy[availabilityKey];
    if (lightboxAvailability) {
      if (availability) {
        lightboxAvailability.textContent = availability.label;
        lightboxAvailability.dataset.status = availabilityKey;
        lightboxAvailability.classList.add('active');
      } else {
        lightboxAvailability.textContent = '';
        lightboxAvailability.classList.remove('active');
      }
    }

    const statement = card.dataset.statement || '';
    if (lightboxStatement) {
      lightboxStatement.textContent = statement;
      lightboxStatement.classList.toggle('active', Boolean(statement));
    }

    if (lightboxInquireBtn) {
      lightboxInquireBtn.textContent = availability?.cta || 'Inquire about this work';
      lightboxInquireBtn.setAttribute('href', availability?.href || '#contact');
      lightboxInquireBtn.dataset.action = availabilityKey === 'print-available' ? 'shop' : 'inquire';
    }

    if (gallery.length > 1) {
      lightboxCounter.textContent = `${currentSlideIndex + 1} / ${gallery.length}`;
      lightboxCounter.classList.add('active');
    } else {
      lightboxCounter.textContent = '';
      lightboxCounter.classList.remove('active');
    }

    renderLightboxThumbs(gallery);
  }

  function openLightbox(cardIndex, slideIndex = 0) {
    const cards = visibleCards();
    if (!cards.length) return;

    currentCardIndex = ((cardIndex % cards.length) + cards.length) % cards.length;
    currentSlideIndex = slideIndex;

    const card = cards[currentCardIndex];
    const cardImg = card.querySelector('.art-image-wrapper img');
    const gallery = getCardGallery(card);
    const slide = gallery[slideIndex] || gallery[0];

    if (slideIndex === 0 && cardImg && lightboxImage && slide) {
      lightboxImage.src = cardImg.currentSrc || cardImg.src;
      lightboxImage.alt = `${slide.title} - Artwork by Beau Thompson`;
      lightboxImage.classList.remove('is-swapping');
    }

    showCurrentSlide();
    document.body.style.overflow = 'hidden';
    lightbox.classList.add('active');
  }

  function goNext() {
    const cards = visibleCards();
    const gallery = getCardGallery(cards[currentCardIndex]);

    if (currentSlideIndex < gallery.length - 1) {
      currentSlideIndex += 1;
      showCurrentSlide();
    } else if (currentCardIndex < cards.length - 1) {
      currentCardIndex += 1;
      currentSlideIndex = 0;
      showCurrentSlide();
    }
  }

  function goPrev() {
    const cards = visibleCards();

    if (currentSlideIndex > 0) {
      currentSlideIndex -= 1;
      showCurrentSlide();
    } else if (currentCardIndex > 0) {
      currentCardIndex -= 1;
      const prevGallery = getCardGallery(cards[currentCardIndex]);
      currentSlideIndex = Math.max(0, prevGallery.length - 1);
      showCurrentSlide();
    }
  }

  artCards.forEach(card => {
    card.addEventListener('click', () => {
      const img = card.querySelector('.art-image-wrapper img');
      if (!img) return;
      const cards = visibleCards();
      let cardIndex = cards.indexOf(card);
      if (cardIndex === -1) cardIndex = 0;
      openLightbox(cardIndex, 0);
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    lightboxImage?.classList.remove('is-swapping');
    document.body.style.overflow = '';
    clearTimeout(lightboxSwapTimer);
    setTimeout(() => {
      if (lightboxThumbs) {
        lightboxThumbs.innerHTML = '';
        lightboxThumbs.classList.remove('active');
      }
      if (lightboxImage) {
        lightboxImage.onload = null;
        lightboxImage.setAttribute('src', '');
      }
    }, MODAL_TRANSITION_MS);
  };

  lightboxClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  lightboxPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    goPrev();
  });

  lightboxNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    goNext();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  });

  lightboxInquireBtn?.addEventListener('click', (e) => {
    const action = lightboxInquireBtn.dataset.action || 'inquire';
    if (action === 'shop') {
      closeLightbox();
      return;
    }

    e.preventDefault();
    const title = lightboxTitle.textContent.trim();
    if (!title) return;

    closeLightbox();

    if (subjectInput) {
      subjectInput.value = `Inquiry: ${title}`;
      subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (messageInput && !messageInput.value.trim()) {
      messageInput.value = `Hello,\n\nI am interested in learning more about "${title}". Please share any details on availability, pricing, or viewing options.\n\nThank you.`;
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const contactSection = document.getElementById('contact');
    contactSection?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      const nameInput = document.getElementById('name');
      nameInput?.focus({ preventScroll: true });
    }, 600);
  });

  // ==========================================
  // Scroll Spy (Active Nav Link Styling)
  // ==========================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if (sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const id = visible.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }, {
      rootMargin: '-35% 0px -55% 0px',
      threshold: 0.25
    });

    sections.forEach(section => sectionObserver.observe(section));
  }

  const runScrollUpdates = onScrollFrame(() => {
    handleScroll();
    updateBackToTop();
  });

  window.addEventListener('scroll', runScrollUpdates, { passive: true });
  handleScroll();
  updateBackToTop();

  // ==========================================
  // Contact Form Submission
  // Posts to data-endpoint when configured (Formspree, Basin, Netlify Forms),
  // otherwise runs a local simulation so the form still feels responsive.
  // ==========================================
  const formMessage = document.getElementById('form-message');
  const SUCCESS_TEXT = 'Thank you. Your message has been sent successfully.';
  const ERROR_TEXT = 'Sorry — something went wrong. Please email info@beaurancethompson.com directly.';

  function showFormStatus(state) {
    if (!formMessage) return;
    formMessage.classList.remove('success', 'error');
    if (state === 'success') {
      formMessage.textContent = SUCCESS_TEXT;
      formMessage.classList.add('success');
    } else if (state === 'error') {
      formMessage.textContent = ERROR_TEXT;
      formMessage.classList.add('error');
    }
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('.submit-btn');
      const originalText = submitBtn.textContent;
      const endpoint = contactForm.dataset.endpoint?.trim();

      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      const restore = () => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      };

      const clearAfter = (ms) => {
        setTimeout(() => {
          formMessage?.classList.remove('success', 'error');
          formMessage.textContent = SUCCESS_TEXT;
        }, ms);
      };

      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(contactForm)
          });

          restore();

          if (response.ok) {
            showFormStatus('success');
            contactForm.reset();
            clearAfter(6000);
          } else {
            showFormStatus('error');
            clearAfter(8000);
          }
        } catch {
          restore();
          showFormStatus('error');
          clearAfter(8000);
        }
        return;
      }

      setTimeout(() => {
        restore();
        showFormStatus('success');
        contactForm.reset();
        clearAfter(5000);
      }, 1200);
    });
  }

});
