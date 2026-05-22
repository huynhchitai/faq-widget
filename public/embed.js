/**
 * FAQ Widget embed script — faq-widget / chitai.dev
 *
 * Usage: <script src="https://your-deploy.com/embed.js"
 *                 data-widget-url="https://your-deploy.com/widget"
 *                 data-kb="YOUR_KNOWLEDGE_BASE_TEXT_HERE"></script>
 *
 * Or, omit data-kb and post the KB via window.postMessage after load:
 *   window.__faqWidget.postKb("Your KB text here…");
 *
 * Security:
 *  - The iframe is sandboxed with allow-scripts allow-same-origin.
 *    allow-same-origin is needed so the iframe can call the same-origin
 *    /api/ask endpoint. Cross-origin parent pages cannot access the frame.
 *  - The KB text is passed via postMessage, not via a URL query param,
 *    to avoid it appearing in server logs / referrer headers. (The query
 *    param fallback in widget/page.tsx is for preview/debugging only.)
 *  - No cookies are set. No localStorage is written by this script.
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var widgetUrl = script.getAttribute('data-widget-url') || 'http://localhost:3000/widget';
  var kbText = script.getAttribute('data-kb') || '';

  // ── Create floating button ────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'faq-widget-btn';
  btn.setAttribute('aria-label', 'Open FAQ chat');
  btn.innerHTML = '?';

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483646',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#e8613a',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '24px',
    fontWeight: '700',
    boxShadow: '0 8px 24px rgba(232,97,58,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  });

  btn.addEventListener('mouseenter', function () {
    btn.style.transform = 'scale(1.08)';
    btn.style.boxShadow = '0 12px 32px rgba(232,97,58,0.45)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 8px 24px rgba(232,97,58,0.35)';
  });

  // ── Create iframe container ───────────────────────────────────────────────
  var container = document.createElement('div');
  container.id = 'faq-widget-container';

  Object.assign(container.style, {
    position: 'fixed',
    bottom: '92px',
    right: '24px',
    zIndex: '2147483647',
    width: '360px',
    height: '520px',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(232,97,58,0.12)',
    border: '2px solid #e8d5c5',
    display: 'none',
    transition: 'opacity 0.2s, transform 0.2s',
    opacity: '0',
    transform: 'translateY(12px) scale(0.97)',
  });

  // Sandboxed iframe — allow-scripts needed for React to run;
  // allow-same-origin needed for the /api/ask fetch.
  var iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  iframe.setAttribute('title', 'FAQ Assistant');
  iframe.setAttribute('loading', 'lazy');

  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  });

  container.appendChild(iframe);

  var isOpen = false;
  var kbSent = false;

  // Once the iframe loads, send the KB via postMessage
  iframe.addEventListener('load', function () {
    if (kbText && !kbSent) {
      try {
        iframe.contentWindow.postMessage(
          { type: 'FAQ_SET_KB', kb: kbText },
          new URL(widgetUrl).origin
        );
        kbSent = true;
      } catch (e) {
        // postMessage failed — widget will show "waiting for KB" message
      }
    }
  });

  function openWidget() {
    isOpen = true;
    container.style.display = 'block';
    // Trigger animation on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0) scale(1)';
      });
    });
    btn.setAttribute('aria-expanded', 'true');
    btn.innerHTML = '×';
    btn.setAttribute('aria-label', 'Close FAQ chat');
  }

  function closeWidget() {
    isOpen = false;
    container.style.opacity = '0';
    container.style.transform = 'translateY(12px) scale(0.97)';
    setTimeout(function () {
      container.style.display = 'none';
    }, 200);
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '?';
    btn.setAttribute('aria-label', 'Open FAQ chat');
  }

  btn.addEventListener('click', function () {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeWidget();
  });

  document.body.appendChild(container);
  document.body.appendChild(btn);

  // ── Public API ────────────────────────────────────────────────────────────
  window.__faqWidget = {
    open: openWidget,
    close: closeWidget,
    /** Send KB text after load. Useful when KB is fetched asynchronously. */
    postKb: function (text) {
      kbText = String(text).slice(0, 40000);
      kbSent = false;
      try {
        iframe.contentWindow.postMessage(
          { type: 'FAQ_SET_KB', kb: kbText },
          new URL(widgetUrl).origin
        );
        kbSent = true;
      } catch (e) {
        // Will retry on next iframe load
      }
    },
  };
})();
