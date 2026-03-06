/**
 * printService
 * Utilities to print HTML strings or Blob/PDFs without opening a new browser tab.
 */
export function printHtmlString(html) {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');

      const cleanup = () => {
        try { document.body.removeChild(iframe); } catch (e) {}
      };

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow || iframe;
          // Some browsers need a slight delay before printing
          setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(() => { cleanup(); resolve(); }, 600);
          }, 50);
        } catch (e) {
          cleanup();
          reject(e);
        }
      };

      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    } catch (e) {
      reject(e);
    }
  });
}

export function printBlob(blob) {
  return new Promise((resolve, reject) => {
    try {
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      iframe.setAttribute('aria-hidden', 'true');

      const cleanup = () => {
        try { window.URL.revokeObjectURL(url); } catch (e) {}
        try { document.body.removeChild(iframe); } catch (e) {}
      };

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow || iframe;
          setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(() => { cleanup(); resolve(); }, 600);
          }, 50);
        } catch (e) {
          cleanup();
          reject(e);
        }
      };

      document.body.appendChild(iframe);
    } catch (e) {
      reject(e);
    }
  });
}
