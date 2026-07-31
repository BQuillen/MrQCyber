/**
 * CodeSnippetz — copy.js
 * Shared copy-to-clipboard logic for all snippet cards.
 */

const COPY_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

function copyCode(btn, id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = CHECK_SVG + 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = orig;
    }, 2000);
  }).catch(() => {
    /* fallback for older browsers */
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = CHECK_SVG + 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = orig;
    }, 2000);
  });
}
