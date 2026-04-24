// Deprecated: counter success logic now lives in /js/counter.js
// This file is kept only to avoid 404s if referenced elsewhere.

document.addEventListener('DOMContentLoaded', () => {
  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  window.addEventListener('beforeprint', () => {
    const ticket = document.querySelector('.ticket');
    if (ticket) {
      const heightMm = Math.ceil((ticket.offsetHeight + 40) * 25.4 / 96);
      let styleDiv = document.getElementById('dynamic-print-size');
      if (!styleDiv) {
        styleDiv = document.createElement('style');
        styleDiv.id = 'dynamic-print-size';
        document.head.appendChild(styleDiv);
      }
      styleDiv.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
    }
  });
});
