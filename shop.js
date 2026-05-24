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

  function closeMenu() {
    menuToggle?.classList.remove('active');
    navWrapper?.classList.remove('open');
    navOverlay?.classList.remove('active');
    document.body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  menuToggle?.addEventListener('click', () => {
    const isOpen = navWrapper?.classList.contains('open');
    if (isOpen) {
      closeMenu();
    } else {
      menuToggle.classList.add('active');
      navWrapper?.classList.add('open');
      navOverlay?.classList.add('active');
      document.body.classList.add('menu-open');
      menuToggle.setAttribute('aria-expanded', 'true');
    }
  });

  navOverlay?.addEventListener('click', closeMenu);
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

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

  // --- Cart State ---
  let cart = [];
  let activeProductCard = null;
  let activeProductGallery = [];
  let activeProductGalleryIndex = 0;
  let paypalInitialized = false;

  // --- DOM Elements ---
  const header = document.getElementById('header');
  const cartNavBtn = document.getElementById('cart-nav-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartBadge = document.getElementById('cart-badge');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutStatus = document.getElementById('checkout-status');
  const paypalButtonContainer = document.getElementById('paypal-button-container');
  const successModal = document.getElementById('success-modal-overlay');
  const successModalTitle = document.getElementById('success-modal-title');
  const successModalMessage = document.getElementById('success-modal-message');
  const successModalCloseBtn = document.getElementById('success-modal-close-btn');
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
  const productModalOptions = document.getElementById('product-modal-options');
  const productModalAddBtn = document.getElementById('product-modal-add-btn');
  const paypalConfig = window.PAYPAL_CONFIG || {};
  const paypalClientId = paypalConfig.clientId || '';
  const PAYPAL_CREATE_ORDER_URL = '/api/paypal/create-order';
  const PAYPAL_CAPTURE_ORDER_URL = '/api/paypal/capture-order';

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

  // --- Cart Drawer Toggles ---
  function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    initPayPalCheckout();
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    if (!productModalOverlay?.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  cartNavBtn.addEventListener('click', openCart);
  cartCloseBtn.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  function closeProductModal() {
    productModalOverlay?.classList.remove('active');
    productModalOverlay?.setAttribute('aria-hidden', 'true');
    activeProductCard = null;
    activeProductGallery = [];
    activeProductGalleryIndex = 0;
    if (!cartDrawer.classList.contains('active')) {
      document.body.style.overflow = '';
    }
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

    activeProductCard = card;
    const title = card.querySelector('.art-title')?.textContent || '';
    const price = card.querySelector('.art-year')?.textContent || '';
    const meta = card.querySelector('.art-meta')?.textContent || '';
    const description = card.getAttribute('data-description') || '';
    const addBtn = card.querySelector('.btn-add-to-cart');

    productModalTitle.textContent = title;
    productModalPrice.textContent = price;
    productModalMeta.textContent = meta;
    productModalDescription.textContent = description;

    renderProductGallery(getProductGallery(card));

    productModalAddBtn.setAttribute('data-id', addBtn?.getAttribute('data-id') || '');
    productModalAddBtn.setAttribute('data-name', addBtn?.getAttribute('data-name') || '');
    productModalAddBtn.setAttribute('data-price', addBtn?.getAttribute('data-price') || '');
    productModalAddBtn.setAttribute('data-type', addBtn?.getAttribute('data-type') || 'apparel');

    renderModalOptions(card);

    productModalOverlay.classList.add('active');
    productModalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    productModalClose?.focus();
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCart();
      successModal.classList.remove('active');
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

  // --- Product Option Selectors ---
  function getSelectedOption(card, optionName) {
    const selector = card.querySelector(`.option-selector[data-option="${optionName}"]`);
    const activeBtn = selector?.querySelector('.option-btn.active');
    return activeBtn?.getAttribute('data-value') || '';
  }

  function setSelectedOption(card, optionName, value) {
    const selector = card.querySelector(`.option-selector[data-option="${optionName}"]`);
    selector?.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-value') === value);
    });
  }

  function buildVariantId(baseId, size, color) {
    const sizeKey = size.toLowerCase();
    const colorKey = color.toLowerCase().replace(/\s+/g, '-');
    return `${baseId}-${sizeKey}-${colorKey}`;
  }

  function bindOptionSelectors(scope, card) {
    scope.querySelectorAll('.option-selector').forEach(selector => {
      const optionName = selector.getAttribute('data-option');
      selector.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const value = btn.getAttribute('data-value') || '';
          setSelectedOption(card, optionName, value);
          if (activeProductCard === card) {
            renderModalOptions(card);
          }
        });
      });
    });
  }

  function renderModalOptions(card) {
    const options = card.querySelector('.product-options');
    if (!options || !productModalOptions) return;

    productModalOptions.innerHTML = options.innerHTML;
    bindOptionSelectors(productModalOptions, card);
  }

  document.querySelectorAll('.product-card').forEach(card => {
    bindOptionSelectors(card, card);

    card.querySelector('.product-open-trigger')?.addEventListener('click', () => openProductModal(card));
    card.querySelector('.art-title-row')?.addEventListener('click', () => openProductModal(card));
    card.querySelector('.art-meta')?.addEventListener('click', () => openProductModal(card));
  });

  // --- Cart Actions ---
  function addToCart({ id, baseId, name, price, type, image, size, color }) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id,
        baseId,
        name,
        price: parseFloat(price),
        type,
        image,
        size,
        color,
        quantity: 1
      });
    }

    updateCart();
    closeProductModal();
    openCart();
  }

  function addProductFromCard(card) {
    const btn = card.querySelector('.btn-add-to-cart');
    if (!btn) return;

    const baseId = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    const price = btn.getAttribute('data-price');
    const type = btn.getAttribute('data-type');
    const img = card.querySelector('.product-image-wrapper img');
    const image = img?.getAttribute('src') || '';
    const size = getSelectedOption(card, 'size');
    const color = getSelectedOption(card, 'color');

    if (!size || !color) return;

    addToCart({
      id: buildVariantId(baseId, size, color),
      baseId,
      name,
      price,
      type,
      image,
      size,
      color
    });
  }

  function updateQty(id, delta) {
    const item = cart.find(entry => entry.id === id);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(entry => entry.id !== id);
    }
    updateCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(entry => entry.id !== id);
    updateCart();
  }

  function updateCart() {
    renderCartItems();
    updateBadge();
    updateSubtotal();
  }

  function updateBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    cartBadge.classList.toggle('active', totalItems > 0);
  }

  function updateSubtotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartSubtotal.textContent = `$${total.toFixed(2)}`;
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.hidden = isPayPalConfigured();
      checkoutBtn.textContent = isPayPalConfigured()
        ? 'PayPal Checkout'
        : 'Configure PayPal';
    }
    paypalButtonContainer?.classList.toggle('is-disabled', cart.length === 0);
  }

  function isPayPalConfigured() {
    return Boolean(paypalClientId && paypalClientId !== 'YOUR_PAYPAL_CLIENT_ID');
  }

  function setCheckoutStatus(message = '', type = 'info') {
    if (!checkoutStatus) return;

    checkoutStatus.textContent = message;
    checkoutStatus.className = `checkout-status ${message ? 'active' : ''} ${type}`;
  }

  function buildPayPalCart() {
    return cart.map(({ baseId, quantity, size, color }) => ({
      baseId,
      quantity,
      size,
      color
    }));
  }

  function formatPayPalError(data, fallback) {
    if (data?.error) return data.error;
    if (Array.isArray(data?.details) && data.details[0]?.description) {
      return data.details[0].description;
    }
    return fallback;
  }

  function handleCheckoutSuccess(orderData) {
    cart = [];
    updateCart();
    closeCart();
    setCheckoutStatus('');

    if (successModalTitle) {
      successModalTitle.textContent = 'Payment Captured';
    }

    if (successModalMessage) {
      const transactionLine = orderData.captureId
        ? ` PayPal transaction ID: ${orderData.captureId}.`
        : '';
      successModalMessage.textContent = `Thank you for supporting Beau Thompson's studio. Your payment is complete and your order is ready for fulfillment.${transactionLine}`;
    }

    successModal.classList.add('active');
  }

  function loadPayPalSdk() {
    if (window.paypal?.Buttons) {
      return Promise.resolve(window.paypal);
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const currency = paypalConfig.currency || 'USD';
      const intent = paypalConfig.intent || 'capture';

      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=${encodeURIComponent(currency)}&intent=${encodeURIComponent(intent)}&components=buttons`;
      script.async = true;
      script.onload = () => resolve(window.paypal);
      script.onerror = () => reject(new Error('Unable to load the PayPal SDK.'));
      document.head.appendChild(script);
    });
  }

  async function renderPayPalButtons() {
    if (!paypalButtonContainer) return;

    if (!isPayPalConfigured()) {
      paypalButtonContainer.hidden = true;
      if (checkoutBtn) {
        checkoutBtn.hidden = false;
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Configure PayPal';
      }
      setCheckoutStatus('Add your PayPal sandbox client ID in shop.html to enable checkout.', 'error');
      return;
    }

    try {
      const paypal = await loadPayPalSdk();
      paypalButtonContainer.hidden = false;
      if (checkoutBtn) {
        checkoutBtn.hidden = true;
      }
      setCheckoutStatus('');

      paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'paypal'
        },
        onClick(_data, actions) {
          if (cart.length === 0) {
            setCheckoutStatus('Add an item to your cart before checking out.', 'error');
            return actions.reject();
          }

          setCheckoutStatus('');
          return actions.resolve();
        },
        async createOrder() {
          setCheckoutStatus('Creating secure PayPal order...', 'info');

          const response = await fetch(PAYPAL_CREATE_ORDER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: buildPayPalCart() })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(formatPayPalError(data, 'Unable to create PayPal order.'));
          }

          return data.id;
        },
        async onApprove(data) {
          setCheckoutStatus('Capturing PayPal payment...', 'info');

          const response = await fetch(PAYPAL_CAPTURE_ORDER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID })
          });
          const orderData = await response.json();

          if (!response.ok) {
            throw new Error(formatPayPalError(orderData, 'Unable to capture PayPal payment.'));
          }

          handleCheckoutSuccess(orderData);
        },
        onCancel() {
          setCheckoutStatus('Checkout cancelled. Your cart is still saved.', 'info');
        },
        onError(error) {
          setCheckoutStatus(error?.message || 'PayPal checkout failed. Please try again.', 'error');
        }
      }).render('#paypal-button-container');
    } catch (error) {
      paypalButtonContainer.hidden = true;
      setCheckoutStatus(error?.message || 'PayPal checkout is unavailable.', 'error');
    }
  }

  function initPayPalCheckout() {
    if (paypalInitialized) return;
    paypalInitialized = true;
    renderPayPalButtons();
  }

  function getSVGIconForType(type) {
    switch (type) {
      case 'apparel':
        return `<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;
      default:
        return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }

  function renderCartItems() {
    if (cart.length === 0) {
      cartItemsList.innerHTML = `<div class="cart-empty-message">Your shopping cart is currently empty.</div>`;
      return;
    }

    cartItemsList.innerHTML = '';
    cart.forEach(item => {
      const cartItemEl = document.createElement('div');
      cartItemEl.className = 'cart-item';

      const itemVisual = item.image
        ? `<img src="${item.image}" alt="${item.name}">`
        : getSVGIconForType(item.type);

      const variantLine = item.size && item.color
        ? `<div class="cart-item-variant">Size ${item.size} &bull; ${item.color}</div>`
        : '';

      cartItemEl.innerHTML = `
        <div class="cart-item-image">
          ${itemVisual}
        </div>
        <div class="cart-item-details">
          <div>
            <div class="cart-item-title">${item.name}</div>
            ${variantLine}
            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          </div>
          <div class="cart-item-controls">
            <div class="qty-selector">
              <button class="qty-btn dec-btn" data-id="${item.id}">&minus;</button>
              <div class="qty-val">${item.quantity}</div>
              <button class="qty-btn inc-btn" data-id="${item.id}">&plus;</button>
            </div>
            <button class="cart-item-remove" data-id="${item.id}">Remove</button>
          </div>
        </div>
      `;
      cartItemsList.appendChild(cartItemEl);
    });

    cartItemsList.querySelectorAll('.dec-btn').forEach(btn => {
      btn.addEventListener('click', () => updateQty(btn.getAttribute('data-id'), -1));
    });
    cartItemsList.querySelectorAll('.inc-btn').forEach(btn => {
      btn.addEventListener('click', () => updateQty(btn.getAttribute('data-id'), 1));
    });
    cartItemsList.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.getAttribute('data-id')));
    });
  }

  document.querySelectorAll('.product-card .btn-add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addProductFromCard(btn.closest('.product-card'));
    });
  });

  productModalAddBtn?.addEventListener('click', () => {
    if (activeProductCard) {
      addProductFromCard(activeProductCard);
    }
  });

  checkoutBtn?.addEventListener('click', () => {
    initPayPalCheckout();
    setCheckoutStatus('PayPal checkout needs a sandbox client ID before it can process orders.', 'error');
  });

  successModalCloseBtn.addEventListener('click', () => {
    successModal.classList.remove('active');
  });
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.classList.remove('active');
    }
  });
});
