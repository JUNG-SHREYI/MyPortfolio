document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = e.target.name.value;
  const email = e.target.email.value;
  const message = e.target.message.value;
  try {
    const resp = await fetch('https://YOUR_BACKEND_URL/send-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    const data = await resp.json();
    if (data.success) {
      alert('Message sent! You will receive a confirmation via SMS.');
      e.target.reset();
    } else {
      alert('Failed to send message: ' + (data.error || 'unknown error'));
    }
  } catch (err) {
    alert('Network error while sending message');
  }
});
