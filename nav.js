document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const navWrapper = document.getElementById('nav-wrapper');
  const navOverlay = document.getElementById('nav-overlay');
  if (!menuToggle || !navWrapper) return;

  let scrollLockDepth = 0;
  let savedScrollY = 0;
  let lastMenuFocusedElement = null;

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
    unlockPageScroll();
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    if (wasOpen && lastMenuFocusedElement instanceof HTMLElement) {
      lastMenuFocusedElement.focus();
    }
    document.dispatchEvent(new CustomEvent('site:menu-close'));
  }

  function openMenu() {
    lastMenuFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menuToggle.classList.add('active');
    navWrapper.classList.add('open');
    navOverlay?.classList.add('active');
    lockPageScroll();
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    navWrapper.querySelector('a, button')?.focus();
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

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && navWrapper.classList.contains('open')) {
      trapFocus(navWrapper, e);
      return;
    }
    if (e.key !== 'Escape') return;
    if (navWrapper.classList.contains('open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navWrapper.classList.contains('open')) {
      closeMenu();
    }
  }, { passive: true });

  window.siteNav = { closeMenu, lockPageScroll, unlockPageScroll };
});
