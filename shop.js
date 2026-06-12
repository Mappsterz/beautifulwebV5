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

  // --- Mobile Navigation ---
  const menuToggle = document.getElementById('menu-toggle');
  const navWrapper = document.getElementById('nav-wrapper');
  const navOverlay = document.getElementById('nav-overlay');
  const mainContent = document.getElementById('site-main');
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  let scrollLockDepth = 0;
  let savedScrollY = 0;
  let lastMenuFocusedElement = null;
  let lastProductModalFocusedElement = null;

  function lockPageScroll() {
    if (scrollLockDepth === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${savedScrollY}px`;
      document.body.classList.add('scroll-locked');
    }
    scrollLockDepth += 1;
  }

  function unlockPageScroll() {
    if (scrollLockDepth === 0) return;
    scrollLockDepth -= 1;
    if (scrollLockDepth > 0) return;
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }

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
    const nodes = [mainContent, document.querySelector('footer')];
    nodes.filter(Boolean).forEach((node) => {
      node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      node.inert = hidden;
    });
  }

  function syncMainHiddenState() {
    const menuOpen = navWrapper?.classList.contains('open');
    const productOpen = document.getElementById('product-modal-overlay')?.classList.contains('active');
    setMainHidden(Boolean(menuOpen || productOpen));
  }

  function closeMenu() {
    const wasOpen = navWrapper?.classList.contains('open');
    menuToggle?.classList.remove('active');
    navWrapper?.classList.remove('open');
    navOverlay?.classList.remove('active');
    unlockPageScroll();
    document.body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open menu');
    if (wasOpen && lastMenuFocusedElement instanceof HTMLElement) {
      lastMenuFocusedElement.focus();
    }
    syncMainHiddenState();
  }

  function openMenu() {
    lastMenuFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menuToggle.classList.add('active');
    navWrapper?.classList.add('open');
    navOverlay?.classList.add('active');
    lockPageScroll();
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    navWrapper?.querySelector('a, button')?.focus();
    syncMainHiddenState();
  }

  menuToggle?.addEventListener('click', () => {
    const isOpen = navWrapper?.classList.contains('open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navOverlay?.addEventListener('click', closeMenu);
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (navWrapper?.classList.contains('open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navWrapper?.classList.contains('open')) {
      closeMenu();
    }
  }, { passive: true });
  syncMainHiddenState();

  // --- Scroll Reveal ---
  const revealElements = document.querySelectorAll('.reveal');

  function revealIfInView(el) {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      el.classList.add('visible');
      return true;
    }
    return false;
  }

  if (revealElements.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => {
      if (!revealIfInView(el)) revealObserver.observe(el);
    });
  } else {
    revealElements.forEach(el => el.classList.add('visible'));
  }

  // --- Product Gallery Modal ---
  let activeProductGallery = [];
  let activeProductGalleryIndex = 0;

  const header = document.getElementById('header');
  const productModalOverlay = document.getElementById('product-modal-overlay');
  const productModal = document.getElementById('product-modal');
  const productModalClose = document.getElementById('product-modal-close');
  const productModalImage = document.getElementById('product-modal-image');
  const productModalGallery = document.getElementById('product-modal-gallery');
  const productModalGalleryLabel = document.getElementById('product-modal-gallery-label');
  const productModalPrev = document.getElementById('product-modal-prev');
  const productModalNext = document.getElementById('product-modal-next');
  const productModalTitle = document.getElementById('product-modal-title');
  const productModalPrice = document.getElementById('product-modal-price');
  const productModalMeta = document.getElementById('product-modal-meta');
  const productModalDescription = document.getElementById('product-modal-description');

  // --- Dynamic Scroll Header ---
  const updateHeaderScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScrollFrame(updateHeaderScroll), { passive: true });
  updateHeaderScroll();

  function closeProductModal() {
    if (!productModalOverlay?.classList.contains('active')) return;
    productModalOverlay?.classList.remove('active');
    productModalOverlay?.setAttribute('aria-hidden', 'true');
    activeProductGallery = [];
    activeProductGalleryIndex = 0;
    unlockPageScroll();
    if (lastProductModalFocusedElement instanceof HTMLElement) {
      lastProductModalFocusedElement.focus();
    }
    syncMainHiddenState();
  }

  function getProductGallery(card) {
    if (card.dataset.gallery) {
      try {
        return JSON.parse(card.dataset.gallery);
      } catch {
        return null;
      }
    }

    const img = card.querySelector('.product-image-wrapper img');
    if (!img) return [];

    return [{
      src: img.getAttribute('src') || '',
      label: 'Product view'
    }];
  }

  function showProductGallerySlide(index) {
    if (!activeProductGallery.length) return;

    activeProductGalleryIndex = ((index % activeProductGallery.length) + activeProductGallery.length) % activeProductGallery.length;
    const slide = activeProductGallery[activeProductGalleryIndex];
    const title = productModalTitle.textContent || 'Product image';

    productModalImage.src = slide.src;
    productModalImage.alt = slide.label ? `${title} — ${slide.label}` : title;

    if (productModalGalleryLabel) {
      if (activeProductGallery.length > 1) {
        const labelText = slide.label || `Image ${activeProductGalleryIndex + 1}`;
        productModalGalleryLabel.textContent = `${labelText} (${activeProductGalleryIndex + 1} / ${activeProductGallery.length})`;
        productModalGalleryLabel.classList.add('active');
      } else {
        productModalGalleryLabel.textContent = '';
        productModalGalleryLabel.classList.remove('active');
      }
    }

    productModalGallery?.querySelectorAll('.product-modal-thumb').forEach((btn, btnIndex) => {
      btn.classList.toggle('active', btnIndex === activeProductGalleryIndex);
    });

    const hasMultiple = activeProductGallery.length > 1;
    productModalPrev?.toggleAttribute('hidden', !hasMultiple);
    productModalNext?.toggleAttribute('hidden', !hasMultiple);
  }

  function renderProductGallery(gallery) {
    activeProductGallery = gallery;
    activeProductGalleryIndex = 0;

    if (!productModalGallery) {
      showProductGallerySlide(0);
      return;
    }

    productModalGallery.innerHTML = '';

    if (gallery.length <= 1) {
      productModalGallery.classList.remove('active');
      showProductGallerySlide(0);
      return;
    }

    productModalGallery.classList.add('active');
    gallery.forEach((slide, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'product-modal-thumb' + (index === 0 ? ' active' : '');
      btn.setAttribute('aria-label', slide.label || `View image ${index + 1} of ${gallery.length}`);
      btn.innerHTML = `<img src="${slide.src}" alt="">`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showProductGallerySlide(index);
      });
      productModalGallery.appendChild(btn);
    });

    showProductGallerySlide(0);
  }

  function openProductModal(card) {
    if (!card) return;

    const title = card.querySelector('.art-title')?.textContent || '';
    const price = card.querySelector('.art-year')?.textContent || '';
    const meta = card.querySelector('.art-meta')?.textContent || '';
    const description = card.getAttribute('data-description') || '';

    productModalTitle.textContent = title;
    productModalPrice.textContent = price;
    productModalMeta.textContent = meta;
    productModalDescription.textContent = description;

    renderProductGallery(getProductGallery(card));

    lastProductModalFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    productModalOverlay.classList.add('active');
    productModalOverlay.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    productModalClose?.focus();
    syncMainHiddenState();
  }

  productModalPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    showProductGallerySlide(activeProductGalleryIndex - 1);
  });

  productModalNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    showProductGallerySlide(activeProductGalleryIndex + 1);
  });

  productModalClose?.addEventListener('click', closeProductModal);
  productModalOverlay?.addEventListener('click', (e) => {
    if (e.target === productModalOverlay) closeProductModal();
  });

  let productModalTouchStartX = 0;
  productModal?.addEventListener('touchstart', (e) => {
    if (!productModalOverlay?.classList.contains('active')) return;
    productModalTouchStartX = e.changedTouches[0]?.screenX ?? 0;
  }, { passive: true });

  productModal?.addEventListener('touchend', (e) => {
    if (!productModalOverlay?.classList.contains('active')) return;
    if (activeProductGallery.length <= 1) return;
    const touchEndX = e.changedTouches[0]?.screenX ?? 0;
    const delta = productModalTouchStartX - touchEndX;
    if (Math.abs(delta) < 56) return;
    if (delta > 0) showProductGallerySlide(activeProductGalleryIndex + 1);
    else showProductGallerySlide(activeProductGalleryIndex - 1);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && productModalOverlay?.classList.contains('active')) {
      trapFocus(productModal, e);
      return;
    }

    if (e.key === 'Tab' && navWrapper?.classList.contains('open')) {
      trapFocus(navWrapper, e);
      return;
    }

    if (e.key === 'Escape') {
      closeProductModal();
      return;
    }

    if (productModalOverlay?.classList.contains('active') && activeProductGallery.length > 1) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showProductGallerySlide(activeProductGalleryIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showProductGallerySlide(activeProductGalleryIndex + 1);
      }
    }
  });

  document.querySelectorAll('.product-card').forEach(card => {
    card.querySelector('.product-open-trigger')?.addEventListener('click', () => openProductModal(card));
    card.querySelector('.art-title-row')?.addEventListener('click', () => openProductModal(card));
    card.querySelector('.art-meta')?.addEventListener('click', () => openProductModal(card));
  });
});
