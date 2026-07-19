document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  const formMessage = document.getElementById('form-message');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');
  const CONTACT_EMAIL = 'info@beaurancethompson.com';

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

  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    formMessage?.classList.remove('success', 'error');

    if (!contactForm.reportValidity()) {
      if (formMessage) {
        formMessage.textContent = 'Please complete the required fields.';
        formMessage.classList.add('error');
      }
      return;
    }

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const subject = subjectInput?.value.trim() || `Portfolio inquiry from ${name}`;
    const message = messageInput?.value.trim() || '';
    const body = [
      message,
      '',
      `From: ${name}`,
      `Reply to: ${email}`
    ].join('\n');

    if (formMessage) {
      formMessage.textContent = `Opening your email app. If it does not open, email ${CONTACT_EMAIL} directly.`;
      formMessage.classList.add('success');
    }

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});
