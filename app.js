document.addEventListener('DOMContentLoaded', () => {
  const MODAL_TRANSITION_MS = 400;
  const mainContent = document.getElementById('works') || document.getElementById('site-main');
  let lastLightboxFocusedElement = null;
  let clearLightboxTimer = null;

  const lockPageScroll = (...args) => window.siteNav?.lockPageScroll(...args);
  const unlockPageScroll = (...args) => window.siteNav?.unlockPageScroll(...args);

  function setMainHidden(hidden) {
    if (!mainContent) return;
    mainContent.inert = hidden;
    if (hidden) mainContent.setAttribute('aria-hidden', 'true');
    else mainContent.removeAttribute('aria-hidden');
  }

  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.inert = true;

  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxMeta = document.getElementById('lightbox-meta');
  const lightboxAvailability = document.getElementById('lightbox-availability');
  const lightboxStatement = document.getElementById('lightbox-statement');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxInquireBtn = document.getElementById('lightbox-inquire-btn');
  const lightboxStatus = document.getElementById('lightbox-status');
  const lightboxImageWrapper = lightbox.querySelector('.lightbox-image-wrapper');
  const artCards = document.querySelectorAll('.art-card');

  const availabilityCopy = {
    available:         { label: 'Available',       cta: 'Acquire this work',          href: 'contact.html' },
    inquire:           { label: 'Inquire',         cta: 'Inquire about this work',    href: 'contact.html' },
    'print-available': { label: 'Print Available', cta: 'View Prints in the Shop',    href: 'shop.html' },
    sold:              { label: 'Sold',            cta: 'Inquire about similar work', href: 'contact.html' }
  };

  let currentCard = null;
  let currentGallery = [];
  let currentSlideIndex = 0;

  function normalizeSrc(src) {
    if (!src) return '';
    return src.split('/').pop()?.split('?')[0] || src;
  }

  function getCardGallery(card) {
    if (card.dataset.gallery) {
      try {
        const parsed = JSON.parse(card.dataset.gallery);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {
        /* fall through */
      }
    }

    const img = card.querySelector('.art-image-wrapper img');
    if (!img) return [];

    return [{
      src: img.getAttribute('src') || '',
      title: card.querySelector('.art-title')?.textContent || '',
      meta: card.querySelector('.art-meta')?.textContent?.replace(/\s*·\s*\d{4}\s*$/, '') || ''
    }];
  }

  function getSlideIndexForImage(gallery, imgSrc) {
    const target = normalizeSrc(imgSrc);
    const index = gallery.findIndex((slide) => normalizeSrc(slide.src) === target);
    return index >= 0 ? index : 0;
  }

  function updateLightboxNav() {
    const hasMultiple = currentGallery.length > 1;
    lightboxPrev?.classList.toggle('is-hidden', !hasMultiple);
    lightboxNext?.classList.toggle('is-hidden', !hasMultiple);
    lightboxPrev?.toggleAttribute('disabled', !hasMultiple);
    lightboxNext?.toggleAttribute('disabled', !hasMultiple);
    lightboxPrev?.setAttribute('aria-hidden', hasMultiple ? 'false' : 'true');
    lightboxNext?.setAttribute('aria-hidden', hasMultiple ? 'false' : 'true');
  }

  function fillLightboxSlide() {
    if (!currentCard || !currentGallery.length) return;

    const slide = currentGallery[currentSlideIndex];
    const year = currentCard.querySelector('.art-year')?.textContent || '';

    if (lightboxImage) {
      lightboxImage.src = slide.src;
      lightboxImage.alt = `${slide.title} - Artwork by Beau Thompson`;
      lightboxImage.decoding = 'async';
    }

    if (lightboxTitle) lightboxTitle.textContent = slide.title;
    const detailView = slide.meta?.toLowerCase().startsWith('detail view');
    if (lightboxMeta) lightboxMeta.textContent = year && !detailView ? `${slide.meta} · ${year}` : slide.meta;
    if (lightboxStatus) {
      lightboxStatus.textContent = currentGallery.length > 1
        ? `${slide.title}, view ${currentSlideIndex + 1} of ${currentGallery.length}`
        : slide.title;
    }

    const availabilityKey = currentCard.dataset.availability || '';
    const availability = availabilityCopy[availabilityKey];
    if (lightboxAvailability) {
      if (availability && availabilityKey !== 'print-available') {
        lightboxAvailability.textContent = availability.label;
        lightboxAvailability.dataset.status = availabilityKey;
        lightboxAvailability.classList.add('active');
      } else {
        lightboxAvailability.textContent = '';
        lightboxAvailability.classList.remove('active');
        delete lightboxAvailability.dataset.status;
      }
    }

    const statement = currentCard.dataset.statement || '';
    if (lightboxStatement) {
      lightboxStatement.textContent = statement;
      lightboxStatement.classList.toggle('active', Boolean(statement));
    }

    if (lightboxInquireBtn) {
      lightboxInquireBtn.textContent = availability?.cta || 'Inquire about this work';
      lightboxInquireBtn.setAttribute('href', availability?.href || 'contact.html');
      lightboxInquireBtn.dataset.action = availabilityKey === 'print-available' ? 'shop' : 'inquire';
    }
  }

  function openLightbox(card) {
    const img = card.querySelector('.art-image-wrapper img');
    if (!img) return;

    currentCard = card;
    currentGallery = getCardGallery(card);
    const src = img.currentSrc || img.getAttribute('src') || '';
    currentSlideIndex = getSlideIndexForImage(currentGallery, src);
    fillLightboxSlide();
    updateLightboxNav();

    if (clearLightboxTimer) {
      clearTimeout(clearLightboxTimer);
      clearLightboxTimer = null;
    }
    lastLightboxFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lightbox.inert = false;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    setMainHidden(true);
    setTimeout(() => lightboxClose?.focus({ preventScroll: true }), 50);
  }

  function goNext() {
    if (currentGallery.length <= 1) return;
    currentSlideIndex = (currentSlideIndex + 1) % currentGallery.length;
    fillLightboxSlide();
  }

  function goPrev() {
    if (currentGallery.length <= 1) return;
    currentSlideIndex = (currentSlideIndex - 1 + currentGallery.length) % currentGallery.length;
    fillLightboxSlide();
  }

  artCards.forEach((card) => {
    const title = card.querySelector('.art-title')?.textContent?.trim() || 'artwork';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `View ${title}`);
    card.addEventListener('click', () => {
      openLightbox(card);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openLightbox(card);
    });
  });

  const closeLightbox = () => {
    const wasOpen = lightbox.classList.contains('active');

    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.inert = true;
    unlockPageScroll();
    if (wasOpen && lastLightboxFocusedElement instanceof HTMLElement) {
      lastLightboxFocusedElement.focus();
    }
    setMainHidden(false);
    currentCard = null;
    currentGallery = [];
    currentSlideIndex = 0;
    clearLightboxTimer = setTimeout(() => {
      if (lightbox.classList.contains('active')) return;
      if (lightboxImage) {
        lightboxImage.removeAttribute('src');
        lightboxImage.alt = '';
      }
      clearLightboxTimer = null;
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
      window.siteNav?.trapFocus(lightbox, e);
      return;
    }
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  });

  let lightboxTouchStartX = 0;

  lightboxImageWrapper?.addEventListener('touchstart', (e) => {
    if (!lightbox.classList.contains('active')) return;
    lightboxTouchStartX = e.changedTouches[0]?.screenX ?? 0;
  }, { passive: true });

  lightboxImageWrapper?.addEventListener('touchend', (e) => {
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
