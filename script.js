// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');
toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
menu.addEventListener('click', (e) => {
  if (e.target.matches('a')) {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

// Download buttons: label by OS, link stays on the GitHub releases page
const RELEASES = 'https://github.com/ChinmayNaik-1/NextRound-x-HacktoberFest/releases';
const ua = navigator.userAgent;
const os = /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : '';
document.querySelectorAll('[data-download]').forEach((a) => {
  a.href = RELEASES;
  a.target = '_blank';
  a.rel = 'noopener';
});
if (os) {
  document.querySelectorAll('[data-os-label]').forEach((el) => {
    el.textContent = `Download for ${os}`;
  });
}

// Copy clone commands
const copyBtn = document.getElementById('copy-btn');
copyBtn.addEventListener('click', async () => {
  const text = document.getElementById('clone-code').innerText;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied';
  } catch {
    copyBtn.textContent = 'Press Ctrl+C to copy';
  }
  setTimeout(() => (copyBtn.textContent = 'Copy commands'), 2000);
});
