document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  const formMessage = document.getElementById('form-message');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');
  const SUCCESS_TEXT = 'Thank you. Your message has been sent successfully.';
  const ERROR_TEXT = 'Sorry — something went wrong. Please email info@beaurancethompson.com directly.';

  const params = new URLSearchParams(window.location.search);
  const inquiryTitle = params.get('inquiry')?.trim();
  if (inquiryTitle && subjectInput) {
    subjectInput.value = `Inquiry: ${inquiryTitle}`;
    subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (inquiryTitle && messageInput && !messageInput.value.trim()) {
    messageInput.value = `Hello,\n\nI am interested in learning more about "${inquiryTitle}". Please share any details on availability, pricing, or viewing options.\n\nThank you.`;
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

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

  contactForm?.addEventListener('submit', async (e) => {
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
        if (formMessage) formMessage.textContent = SUCCESS_TEXT;
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
});
