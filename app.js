document.addEventListener('DOMContentLoaded', () => {
  const MODAL_TRANSITION_MS = 400;
  const mainContent = document.getElementById('works') || document.getElementById('site-main');
  const navWrapper = document.getElementById('nav-wrapper');
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let lastLightboxFocusedElement = null;

  const lockPageScroll = (...args) => window.siteNav?.lockPageScroll(...args);
  const unlockPageScroll = (...args) => window.siteNav?.unlockPageScroll(...args);

  function trapFocus(container, event) {
    if (!container) return;
    const focusable = Array.from(container.querySelectorAll(focusableSelector))
      .filter((el) => !el.hasAttribute('hidden'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setMainHidden(hidden) {
    if (!mainContent) return;
    mainContent.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    mainContent.inert = hidden;
  }

  function syncMainHiddenState() {
    const menuOpen = navWrapper?.classList.contains('open');
    const lightboxOpen = document.getElementById('lightbox')?.classList.contains('active');
    setMainHidden(Boolean(menuOpen || lightboxOpen));
  }

  document.addEventListener('site:menu-open', syncMainHiddenState);
  document.addEventListener('site:menu-close', syncMainHiddenState);
  syncMainHiddenState();

  // ==========================================
  // Lightbox Modal
  // ==========================================
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

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
  const artCards = document.querySelectorAll('.art-card');

  const availabilityCopy = {
    available:         { label: 'Available',       cta: 'Acquire this work',          href: 'contact.html' },
    inquire:           { label: 'Inquire',         cta: 'Inquire about this work',    href: 'contact.html' },
    'print-available': { label: 'Print Available', cta: 'View Prints in the Shop',    href: 'shop.html' },
    sold:              { label: 'Sold',            cta: 'Inquire about similar work', href: 'contact.html' }
  };

  const visibleCards = () =>
    Array.from(artCards).filter((card) => card.querySelector('.art-image-wrapper img'));

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
      meta: card.querySelector('.art-meta')?.textContent?.replace(/\s*·\s*\d{4}\s*$/, '') || ''
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

  function fillLightbox(card, slideIndex) {
    const gallery = getCardGallery(card);
    if (!gallery.length) return;

    currentSlideIndex = ((slideIndex % gallery.length) + gallery.length) % gallery.length;
    const slide = gallery[currentSlideIndex];
    const year = card.querySelector('.art-year')?.textContent || '';
    const cardImg = card.querySelector('.art-image-wrapper img');

    if (lightboxImage) {
      const src = slide.src || cardImg?.currentSrc || cardImg?.src || '';
      lightboxImage.src = src;
      lightboxImage.alt = `${slide.title} - Artwork by Beau Thompson`;
      lightboxImage.decoding = 'async';
    }

    if (lightboxTitle) lightboxTitle.textContent = slide.title;
    if (lightboxMeta) lightboxMeta.innerHTML = year ? `${slide.meta} &bull; ${year}` : slide.meta;

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
      lightboxInquireBtn.setAttribute('href', availability?.href || 'contact.html');
      lightboxInquireBtn.dataset.action = availabilityKey === 'print-available' ? 'shop' : 'inquire';
    }

    if (gallery.length > 1) {
      if (lightboxCounter) {
        lightboxCounter.textContent = `${currentSlideIndex + 1} / ${gallery.length}`;
        lightboxCounter.classList.add('active');
      }
    } else if (lightboxCounter) {
      lightboxCounter.textContent = '';
      lightboxCounter.classList.remove('active');
    }

    renderLightboxThumbs(gallery);
  }

  function showCurrentSlide() {
    const cards = visibleCards();
    if (!cards.length) return;
    fillLightbox(cards[currentCardIndex], currentSlideIndex);
  }

  function openLightbox(cardIndex, slideIndex = 0) {
    const cards = visibleCards();
    if (!cards.length) return;

    currentCardIndex = ((cardIndex % cards.length) + cards.length) % cards.length;
    fillLightbox(cards[currentCardIndex], slideIndex);

    lastLightboxFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    lightboxClose?.focus();
    syncMainHiddenState();
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

  artCards.forEach((card) => {
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
    const wasOpen = lightbox.classList.contains('active');

    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    unlockPageScroll();
    if (wasOpen && lastLightboxFocusedElement instanceof HTMLElement) {
      lastLightboxFocusedElement.focus();
    }
    syncMainHiddenState();
    setTimeout(() => {
      if (lightboxThumbs) {
        lightboxThumbs.innerHTML = '';
        lightboxThumbs.classList.remove('active');
      }
      if (lightboxImage) {
        lightboxImage.removeAttribute('src');
        lightboxImage.alt = '';
      }
    }, MODAL_TRANSITION_MS);
  };

  lightboxClose?.addEventListener('click', closeLightbox);

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
    if (e.key === 'Tab') {
      trapFocus(lightbox, e);
      return;
    }
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  });

  let lightboxTouchStartX = 0;

  lightbox.addEventListener('touchstart', (e) => {
    if (!lightbox.classList.contains('active')) return;
    lightboxTouchStartX = e.changedTouches[0]?.screenX ?? 0;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (!lightbox.classList.contains('active')) return;
    const touchEndX = e.changedTouches[0]?.screenX ?? 0;
    const diff = lightboxTouchStartX - touchEndX;
    if (Math.abs(diff) < 56) return;
    if (diff > 0) goNext();
    else goPrev();
  }, { passive: true });

  lightboxInquireBtn?.addEventListener('click', (e) => {
    const action = lightboxInquireBtn.dataset.action || 'inquire';
    if (action === 'shop') {
      closeLightbox();
      return;
    }

    e.preventDefault();
    const title = lightboxTitle?.textContent.trim();
    if (!title) return;

    closeLightbox();
    window.location.href = `contact.html?inquiry=${encodeURIComponent(title)}`;
  });
});
