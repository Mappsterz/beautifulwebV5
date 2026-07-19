document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const navWrapper = document.getElementById('nav-wrapper');
  const navOverlay = document.getElementById('nav-overlay');
  const header = document.getElementById('header');
  const pageNodes = [document.getElementById('site-main'), document.getElementById('works'), document.querySelector('footer')]
    .filter(Boolean);
  const mobileNavQuery = window.matchMedia('(max-width: 768px)');
  if (!menuToggle || !navWrapper) return;

  let scrollLockDepth = 0;
  let savedScrollY = 0;
  let lastMenuFocusedElement = null;
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(focusableSelector))
      .filter((element) => {
        if (element.hasAttribute('hidden') || element.closest('[inert]')) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }

  function trapFocus(container, event) {
    const focusable = getFocusable(container);
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

  function setPageInert(inert) {
    pageNodes.forEach((node) => {
      node.inert = inert;
      if (inert) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
    });
  }

  function syncClosedMenuState() {
    const isOpen = navWrapper.classList.contains('open');
    navWrapper.inert = mobileNavQuery.matches && !isOpen;
    navWrapper.setAttribute('aria-hidden', mobileNavQuery.matches && !isOpen ? 'true' : 'false');
  }

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

  function closeMenu() {
    const wasOpen = navWrapper.classList.contains('open');
    menuToggle.classList.remove('active');
    navWrapper.classList.remove('open');
    navOverlay?.classList.remove('active');
    if (wasOpen) unlockPageScroll();
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    setPageInert(false);
    syncClosedMenuState();
    if (wasOpen && lastMenuFocusedElement instanceof HTMLElement) {
      lastMenuFocusedElement.focus();
    }
    document.dispatchEvent(new CustomEvent('site:menu-close'));
  }

  function openMenu() {
    lastMenuFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menuToggle.classList.add('active');
    navWrapper.classList.add('open');
    navWrapper.inert = false;
    navWrapper.setAttribute('aria-hidden', 'false');
    navOverlay?.classList.add('active');
    lockPageScroll();
    document.body.classList.add('menu-open');
    setPageInert(true);
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    setTimeout(() => getFocusable(navWrapper)[0]?.focus({ preventScroll: true }), 50);
    document.dispatchEvent(new CustomEvent('site:menu-open'));
  }

  menuToggle.addEventListener('click', () => {
    if (navWrapper.classList.contains('open')) closeMenu();
    else openMenu();
  });

  navOverlay?.addEventListener('click', closeMenu);
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && navWrapper.classList.contains('open')) {
      trapFocus(navWrapper, e);
      return;
    }
    if (e.key !== 'Escape') return;
    if (navWrapper.classList.contains('open')) closeMenu();
  });

  const handleNavBreakpoint = () => {
    if (!mobileNavQuery.matches && navWrapper.classList.contains('open')) {
      closeMenu();
    }
    syncClosedMenuState();
  };
  mobileNavQuery.addEventListener?.('change', handleNavBreakpoint);
  syncClosedMenuState();

  if (header) {
    let headerTicking = false;
    const updateHeaderScroll = () => {
      const scrolled = (window.scrollY || window.pageYOffset || 0) > 24;
      header.classList.toggle('scrolled', scrolled);
      if (scrolled && navWrapper.classList.contains('open')) closeMenu();
      headerTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (headerTicking) return;
      headerTicking = true;
      requestAnimationFrame(updateHeaderScroll);
    }, { passive: true });

    updateHeaderScroll();
  }

  window.siteNav = {
    closeMenu,
    getFocusable,
    lockPageScroll,
    setPageInert,
    trapFocus,
    unlockPageScroll
  };
});
