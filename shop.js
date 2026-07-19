document.addEventListener('DOMContentLoaded', () => {
  const navWrapper = document.getElementById('nav-wrapper');
  const mainContent = document.getElementById('site-main');
  let lastCartFocusedElement = null;
  let lastProductModalFocusedElement = null;
  let lastSuccessFocusedElement = null;

  function lockPageScroll() {
    window.siteNav?.lockPageScroll();
  }

  function unlockPageScroll() {
    window.siteNav?.unlockPageScroll();
  }

  function setMainHidden(hidden) {
    const nodes = [mainContent, document.querySelector('footer')];
    nodes.filter(Boolean).forEach((node) => {
      if (hidden) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
      node.inert = hidden;
    });
  }

  function syncMainHiddenState() {
    const menuOpen = navWrapper?.classList.contains('open');
    const cartOpen = document.getElementById('cart-drawer')?.classList.contains('active');
    const productOpen = document.getElementById('product-modal-overlay')?.classList.contains('active');
    const successOpen = document.getElementById('success-modal-overlay')?.classList.contains('active');
    const header = document.getElementById('header');
    const shopOverlayOpen = Boolean(cartOpen || productOpen || successOpen);

    setMainHidden(Boolean(menuOpen || cartOpen || productOpen || successOpen));
    if (header) {
      if (shopOverlayOpen) header.setAttribute('aria-hidden', 'true');
      else header.removeAttribute('aria-hidden');
      header.inert = shopOverlayOpen;
    }
  }

  document.addEventListener('site:menu-open', syncMainHiddenState);
  document.addEventListener('site:menu-close', syncMainHiddenState);
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

  // --- Cart State ---
  let cart = [];
  let activeProductCard = null;
  let activeProductGallery = [];
  let activeProductGalleryIndex = 0;
  const CART_STORAGE_KEY = 'beau-thompson-shop-cart';
  const MAX_QUANTITY = 10;
  const ORDER_EMAIL = 'info@beaurancethompson.com';

  // --- DOM Elements ---
  const cartNavBtn = document.getElementById('cart-nav-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartBadge = document.getElementById('cart-badge');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutStatus = document.getElementById('checkout-status');
  const successModal = document.getElementById('success-modal-overlay');
  const successModalTitle = document.getElementById('success-modal-title');
  const successModalMessage = document.getElementById('success-modal-message');
  const successModalCloseBtn = document.getElementById('success-modal-close-btn');
  const productModalOverlay = document.getElementById('product-modal-overlay');
  const productModal = document.getElementById('product-modal');
  const productModalClose = document.getElementById('product-modal-close');
  const productModalImage = document.getElementById('product-modal-image');
  const productModalImageStage = document.querySelector('.product-modal-image-stage');
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

  // --- Cart Drawer Toggles ---
  function openCart() {
    window.siteNav?.closeMenu();
    lastCartFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    cartDrawer.removeAttribute('inert');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartOverlay.removeAttribute('inert');
    cartOverlay.setAttribute('aria-hidden', 'false');
    cartNavBtn.setAttribute('aria-expanded', 'true');
    lockPageScroll();
    syncMainHiddenState();
    setTimeout(() => cartCloseBtn?.focus({ preventScroll: true }), 50);
  }

  function closeCart() {
    if (!cartDrawer.classList.contains('active')) return;
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    cartDrawer.setAttribute('inert', '');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartOverlay.setAttribute('inert', '');
    cartOverlay.setAttribute('aria-hidden', 'true');
    cartNavBtn.setAttribute('aria-expanded', 'false');
    unlockPageScroll();
    if (lastCartFocusedElement instanceof HTMLElement) {
      lastCartFocusedElement.focus();
    }
    syncMainHiddenState();
  }

  cartNavBtn.addEventListener('click', openCart);
  cartCloseBtn.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  function closeProductModal() {
    if (!productModalOverlay?.classList.contains('active')) return;
    productModalOverlay?.classList.remove('active');
    productModalOverlay?.setAttribute('aria-hidden', 'true');
    productModalOverlay?.setAttribute('inert', '');
    activeProductCard = null;
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
        const gallery = JSON.parse(card.dataset.gallery);
        return Array.isArray(gallery)
          ? gallery.filter((slide) => slide && typeof slide.src === 'string')
          : [];
      } catch {
        return [];
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

    productModalGallery.replaceChildren();

    if (gallery.length <= 1) {
      productModalGallery.classList.remove('active');
      showProductGallerySlide(0);
      return;
    }

    productModalGallery.classList.add('active');
    gallery.forEach((slide, index) => {
      const btn = document.createElement('button');
      const image = document.createElement('img');
      btn.type = 'button';
      btn.className = 'product-modal-thumb' + (index === 0 ? ' active' : '');
      btn.setAttribute('aria-label', slide.label || `View image ${index + 1} of ${gallery.length}`);
      image.src = slide.src;
      image.alt = '';
      btn.appendChild(image);
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

    lastProductModalFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    productModalOverlay.classList.add('active');
    productModalOverlay.setAttribute('aria-hidden', 'false');
    productModalOverlay.removeAttribute('inert');
    lockPageScroll();
    syncMainHiddenState();
    setTimeout(() => productModalClose?.focus({ preventScroll: true }), 50);
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
  productModalImageStage?.addEventListener('touchstart', (e) => {
    if (!productModalOverlay?.classList.contains('active')) return;
    productModalTouchStartX = e.changedTouches[0]?.screenX ?? 0;
  }, { passive: true });

  productModalImageStage?.addEventListener('touchend', (e) => {
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
      window.siteNav?.trapFocus(productModal, e);
      return;
    }

    if (e.key === 'Tab' && cartDrawer?.classList.contains('active')) {
      window.siteNav?.trapFocus(cartDrawer, e);
      return;
    }

    if (e.key === 'Tab' && successModal?.classList.contains('active')) {
      window.siteNav?.trapFocus(successModal, e);
      return;
    }

    if (e.key === 'Escape') {
      closeProductModal();
      closeCart();
      closeSuccessModal();
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

    productModalOptions.replaceChildren(...Array.from(options.children, (child) => child.cloneNode(true)));
    bindOptionSelectors(productModalOptions, card);
  }

  document.querySelectorAll('.product-card').forEach(card => {
    bindOptionSelectors(card, card);

    const productTrigger = card.querySelector('.product-open-trigger');
    if (productTrigger) {
      productTrigger.setAttribute('role', 'button');
      productTrigger.setAttribute('tabindex', '0');
      productTrigger.setAttribute('aria-label', `View ${card.querySelector('.art-title')?.textContent || 'product'} details`);
      productTrigger.addEventListener('click', () => openProductModal(card));
      productTrigger.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openProductModal(card);
      });
    }
    card.querySelector('.art-title-row')?.addEventListener('click', () => openProductModal(card));
    card.querySelector('.art-meta')?.addEventListener('click', () => openProductModal(card));
  });

  // --- Cart Actions ---
  function addToCart({ id, baseId, name, price, type, image, size, color }) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
      if (existingItem.quantity >= MAX_QUANTITY) {
        setCheckoutStatus(`Maximum quantity is ${MAX_QUANTITY} per item.`, 'info');
        closeProductModal();
        openCart();
        return;
      }
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

    const addedItem = cart.find((item) => item.id === id);
    setCheckoutStatus(
      addedItem?.quantity === MAX_QUANTITY
        ? `${name} added. Maximum quantity of ${MAX_QUANTITY} reached.`
        : `${name} added to your cart.`,
      'info'
    );
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

    const nextQuantity = item.quantity + delta;
    if (nextQuantity > MAX_QUANTITY) {
      setCheckoutStatus(`Maximum quantity is ${MAX_QUANTITY} per item.`, 'info');
      return;
    }

    item.quantity = nextQuantity;
    if (item.quantity <= 0) {
      cart = cart.filter(entry => entry.id !== id);
    }
    setCheckoutStatus(
      item.quantity === MAX_QUANTITY
        ? `Maximum quantity of ${MAX_QUANTITY} reached for ${item.name}.`
        : '',
      'info'
    );
    updateCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(entry => entry.id !== id);
    setCheckoutStatus('');
    updateCart();
  }

  function updateCart() {
    renderCartItems();
    updateBadge();
    updateSubtotal();
    persistCart();
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
      checkoutBtn.disabled = cart.length === 0;
      checkoutBtn.textContent = 'Email Order Request';
    }
  }

  function persistCart() {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // The cart still works when browser storage is unavailable.
    }
  }

  function restoreCart() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return;

      cart = stored.filter((item) => (
        item &&
        typeof item.id === 'string' &&
        typeof item.baseId === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(Number(item.price)) &&
        Number(item.price) >= 0 &&
        typeof item.size === 'string' &&
        typeof item.color === 'string'
      )).map((item) => ({
        id: item.id,
        baseId: item.baseId,
        name: item.name,
        price: Number(item.price),
        type: typeof item.type === 'string' ? item.type : 'apparel',
        image: typeof item.image === 'string' ? item.image : '',
        size: item.size,
        color: item.color,
        quantity: Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(item.quantity) || 1)))
      }));
    } catch {
      cart = [];
    }
  }

  function setCheckoutStatus(message = '', type = 'info') {
    if (!checkoutStatus) return;

    checkoutStatus.textContent = message;
    checkoutStatus.className = `checkout-status ${message ? 'active' : ''} ${type}`;
  }

  function buildOrderEmail() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const lines = cart.map((item, index) => (
      `${index + 1}. ${item.name}\n` +
      `   Variant: Size ${item.size}, ${item.color}\n` +
      `   Quantity: ${item.quantity}\n` +
      `   Price: $${item.price.toFixed(2)} each\n` +
      `   Line total: $${(item.price * item.quantity).toFixed(2)}`
    ));
    const body = [
      'Hello Beau Thompson Studio,',
      '',
      'I would like to request the following order:',
      '',
      ...lines.flatMap((line) => [line, '']),
      `Subtotal: $${subtotal.toFixed(2)} USD`,
      '',
      'Please let me know the next steps for availability, shipping, and payment.',
      '',
      'Name:',
      'Shipping location:'
    ].join('\n');

    return `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent('Studio shop order request')}&body=${encodeURIComponent(body)}`;
  }

  function openSuccessModal() {
    lastSuccessFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    successModalTitle.textContent = 'Order Email Ready';
    successModalMessage.textContent = 'Your email app has been opened with your selected items. Send the message to request your order; your cart will remain saved in this tab.';
    successModal.classList.add('active');
    successModal.setAttribute('aria-hidden', 'false');
    successModal.removeAttribute('inert');
    lockPageScroll();
    syncMainHiddenState();
    setTimeout(() => successModalCloseBtn.focus({ preventScroll: true }), 50);
  }

  function closeSuccessModal() {
    if (!successModal?.classList.contains('active')) return;
    successModal.classList.remove('active');
    successModal.setAttribute('aria-hidden', 'true');
    successModal.setAttribute('inert', '');
    unlockPageScroll();
    if (lastSuccessFocusedElement instanceof HTMLElement) {
      lastSuccessFocusedElement.focus();
    }
    syncMainHiddenState();
  }

  function renderCartItems() {
    cartItemsList.replaceChildren();

    if (cart.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'cart-empty-message';
      emptyMessage.textContent = 'Your shopping cart is currently empty.';
      cartItemsList.appendChild(emptyMessage);
      return;
    }

    cart.forEach(item => {
      const cartItemEl = document.createElement('div');
      const imageWrap = document.createElement('div');
      const details = document.createElement('div');
      const itemInfo = document.createElement('div');
      const title = document.createElement('div');
      const variant = document.createElement('div');
      const price = document.createElement('div');
      const controls = document.createElement('div');
      const quantitySelector = document.createElement('div');
      const decreaseBtn = document.createElement('button');
      const quantityValue = document.createElement('div');
      const increaseBtn = document.createElement('button');
      const removeBtn = document.createElement('button');

      cartItemEl.className = 'cart-item';
      imageWrap.className = 'cart-item-image';
      if (item.image) {
        const image = document.createElement('img');
        image.src = item.image;
        image.alt = item.name;
        imageWrap.appendChild(image);
      } else {
        imageWrap.setAttribute('aria-hidden', 'true');
      }

      details.className = 'cart-item-details';
      title.className = 'cart-item-title';
      title.textContent = item.name;
      variant.className = 'cart-item-variant';
      variant.textContent = `Size ${item.size} • ${item.color}`;
      price.className = 'cart-item-price';
      price.textContent = `$${item.price.toFixed(2)}`;
      itemInfo.append(title, variant, price);

      controls.className = 'cart-item-controls';
      quantitySelector.className = 'qty-selector';
      decreaseBtn.className = 'qty-btn dec-btn';
      decreaseBtn.type = 'button';
      decreaseBtn.textContent = '−';
      decreaseBtn.setAttribute('aria-label', `Decrease ${item.name} quantity`);
      quantityValue.className = 'qty-val';
      quantityValue.textContent = item.quantity;
      quantityValue.setAttribute('aria-label', `Quantity ${item.quantity}`);
      increaseBtn.className = 'qty-btn inc-btn';
      increaseBtn.type = 'button';
      increaseBtn.textContent = '+';
      increaseBtn.disabled = item.quantity >= MAX_QUANTITY;
      increaseBtn.setAttribute('aria-label', item.quantity >= MAX_QUANTITY
        ? `${item.name} is at the maximum quantity of ${MAX_QUANTITY}`
        : `Increase ${item.name} quantity`);
      removeBtn.className = 'cart-item-remove';
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('aria-label', `Remove ${item.name}, size ${item.size}, ${item.color}`);

      decreaseBtn.addEventListener('click', () => updateQty(item.id, -1));
      increaseBtn.addEventListener('click', () => updateQty(item.id, 1));
      removeBtn.addEventListener('click', () => removeFromCart(item.id));

      quantitySelector.append(decreaseBtn, quantityValue, increaseBtn);
      controls.append(quantitySelector, removeBtn);
      details.append(itemInfo, controls);
      cartItemEl.append(imageWrap, details);
      cartItemsList.appendChild(cartItemEl);
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
    if (cart.length === 0) {
      setCheckoutStatus('Add an item to your cart before requesting an order.', 'error');
      return;
    }

    const mailtoUrl = buildOrderEmail();
    setCheckoutStatus('Opening your email app with the order details…', 'info');
    window.location.href = mailtoUrl;
    closeCart();
    openSuccessModal();
  });

  successModalCloseBtn.addEventListener('click', closeSuccessModal);
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      closeSuccessModal();
    }
  });

  restoreCart();
  updateCart();
});
