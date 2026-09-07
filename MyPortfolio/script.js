document.addEventListener('DOMContentLoaded', () => {
  // Contact Form Submission
  const contactForm = document.getElementById('contact-form');
  const statusDiv = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = contactForm.querySelector('[name="name"]');
      const emailInput = contactForm.querySelector('[name="email"]');
      const messageInput = contactForm.querySelector('[name="message"]');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name || !email || !message) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.className = 'form-status warning';
          statusDiv.textContent = 'Please fill in all fields.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'form-status info';
        statusDiv.textContent = 'Sending your message to Shreyi...';
      }

      const whatsappText = encodeURIComponent(
        `Hi Shreyi, I'm reaching out from your portfolio website!\n\n` +
        `👤 Name: ${name}\n` +
        `📧 Email: ${email}\n` +
        `💬 Message: ${message}`
      );
      const whatsappUrl = `https://wa.me/917702091678?text=${whatsappText}`;

      try {
        // Submit directly to FormSubmit to deliver email to bitrashreyi97@gmail.com
        const response = await fetch('https://formsubmit.co/ajax/bitrashreyi97@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            email: email,
            message: message,
            _subject: `New Portfolio Message from ${name} (${email})`,
            _template: 'table'
          })
        });

        const data = await response.json();

        if (statusDiv) {
          statusDiv.className = 'form-status success';
          statusDiv.innerHTML = `
            <strong>✓ Message sent successfully!</strong><br>
            Delivered to <em>bitrashreyi97@gmail.com</em>.<br>
            <a href="${whatsappUrl}" target="_blank" rel="noopener" class="whatsapp-link">
              💬 Click here to also send on WhatsApp (+91 7702091678)
            </a>
          `;
        }

        // Open WhatsApp chat in a new tab for seamless multi-channel delivery
        window.open(whatsappUrl, '_blank');

        contactForm.reset();
      } catch (err) {
        console.warn('FormSubmit network notice, falling back to direct WhatsApp link:', err);
        if (statusDiv) {
          statusDiv.className = 'form-status success';
          statusDiv.innerHTML = `
            <strong>Message prepared!</strong><br>
            <a href="${whatsappUrl}" target="_blank" rel="noopener" class="whatsapp-link">
              💬 Click here to send directly on WhatsApp (+91 7702091678)
            </a><br>
            Or send an email directly to <a href="mailto:bitrashreyi97@gmail.com">bitrashreyi97@gmail.com</a>
          `;
        }
        window.open(whatsappUrl, '_blank');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }
      }
    });
  }

  // Scroll to Top Button
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollTopBtn.style.display = 'block';
      } else {
        scrollTopBtn.style.display = 'none';
      }
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
