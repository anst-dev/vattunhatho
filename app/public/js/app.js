// Auto-hide messages after 3 seconds
document.addEventListener('DOMContentLoaded', function() {
  const messages = document.querySelectorAll('.msg');
  messages.forEach(msg => {
    setTimeout(() => {
      msg.style.transition = 'opacity 0.5s';
      msg.style.opacity = '0';
      setTimeout(() => msg.remove(), 500);
    }, 3000);
  });
});
