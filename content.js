(() => {
  let shadowHost = null;
  let shadowRoot = null;
  let activeText = "";
  let lastTargetElement = null;
  let selectionTimeout = null;

  function initShadowDOM() {
    if (shadowHost) return;
    shadowHost = document.createElement('div');
    shadowHost.id = 'xtranslater-root';
    Object.assign(shadowHost.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      zIndex: '2147483647',
      pointerEvents: 'none'
    });
    shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
    document.documentElement.appendChild(shadowHost);

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      .xt-icon {
        position: absolute;
        pointer-events: auto;
        background: #2563eb;
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        box-shadow: 0px 4px 14px rgba(37,99,235,0.45);
        font-size: 13px;
        user-select: none;
        transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease;
        animation: xt-pop-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .xt-icon:hover {
        transform: scale(1.12);
        background-color: #1d4ed8;
      }
      
      .xt-tooltip {
        position: absolute;
        pointer-events: auto;
        background: #18181b;
        color: #f4f4f5;
        padding: 12px 14px;
        border-radius: 10px;
        box-shadow: 0px 8px 30px rgba(0,0,0,0.6), 0px 0px 1px rgba(255,255,255,0.1);
        max-width: 360px;
        min-width: 270px;
        font-size: 13px;
        line-height: 1.45;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        border: 1px solid #27272a;
        animation: xt-pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .xt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        border-bottom: 1px solid #27272a;
        padding-bottom: 6px;
        gap: 6px;
      }

      .xt-select {
        background: #27272a;
        color: #fff;
        border: 1px solid #3f3f46;
        border-radius: 5px;
        padding: 2px 5px;
        font-size: 11px;
        cursor: pointer;
        outline: none;
        transition: background 0.15s;
      }
      .xt-select:hover { background: #3f3f46; }

      .xt-btn {
        background: #27272a;
        border: 1px solid #3f3f46;
        color: #fff;
        border-radius: 5px;
        padding: 3px 6px;
        cursor: pointer;
        font-size: 11px;
        transition: background 0.15s, transform 0.1s;
      }
      .xt-btn:hover {
        background: #3f3f46;
        transform: translateY(-1px);
      }
      .xt-btn:active { transform: translateY(0); }

      .xt-result {
        word-break: break-word;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
        transition: opacity 0.15s ease;
      }

      .xt-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #ffffff;
        animation: xt-spin 0.6s linear infinite;
      }

      @keyframes xt-pop-in {
        0% { opacity: 0; transform: scale(0.85) translateY(4px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes xt-spin { 100% { transform: rotate(360deg); } }
    `;
    shadowRoot.appendChild(style);
  }

  function cleanupUI() {
    if (!shadowRoot) return;
    const targets = shadowRoot.querySelectorAll('.xt-icon, .xt-tooltip');
    targets.forEach(node => node.remove());
    window.speechSynthesis.cancel();
  }

  async function fetchTranslation(engine, targetLang, text) {
    const encodedText = encodeURIComponent(text);
    try {
      if (engine === 'google') {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        return { 
          text: data[0].map(item => item[0]).join(''), 
          detectedLang: (data[2] || 'auto').toUpperCase() 
        };
      } else {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|${targetLang}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        return { 
          text: data.responseData?.translatedText || "Sin traducción.", 
          detectedLang: (data.responseData?.detectedLanguage || 'auto').toUpperCase() 
        };
      }
    } catch (err) {
      if (engine === 'google') return fetchTranslation('mymemory', targetLang, text);
      throw new Error("Imposible conectar con los servicios de traducción.");
    }
  }

  function saveToHistory(original, translated) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get({ history: [] }, (res) => {
        const history = res.history || [];
        const updated = history.filter(item => item.original !== original);
        updated.unshift({ original, translated, date: new Date().toISOString() });
        chrome.storage.local.set({ history: updated.slice(0, 40) });
      });
    }
  }

  function replaceSelectedText(replacement) {
    const el = lastTargetElement;
    if (!el) return;

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      el.value = val.substring(0, start) + replacement + val.substring(end);
      el.selectionStart = el.selectionEnd = start + replacement.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.isContentEditable || document.designMode === 'on') {
      el.focus();
      document.execCommand('insertText', false, replacement);
    }
  }

  function renderTooltip(initialData, x, y) {
    cleanupUI();
    initShadowDOM();

    const tooltip = document.createElement('div');
    tooltip.className = 'xt-tooltip';
    
    const posX = Math.min(x + window.scrollX, window.innerWidth + window.scrollX - 380);
    const posY = y + window.scrollY + 25;

    tooltip.style.left = `${Math.max(10, posX)}px`;
    tooltip.style.top = `${posY}px`;

    tooltip.innerHTML = `
      <div class="xt-header">
        <select class="xt-select xt-engine">
          <option value="google" selected>Google</option>
          <option value="mymemory">MyMemory</option>
        </select>
        
        <div style="display: flex; align-items: center; gap: 4px;">
          <span class="xt-detected" style="font-size: 10px; color: #a1a1aa; font-weight: 600;">${initialData.detectedLang}</span>
          <span style="font-size: 10px; color: #a1a1aa;">→</span>
          <select class="xt-select xt-lang">
            <option value="es" selected>ES</option>
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="de">DE</option>
            <option value="pt">PT</option>
            <option value="it">IT</option>
          </select>
        </div>
        
        <div style="display: flex; gap: 4px;">
          <button class="xt-btn xt-replace" title="Reemplazar selección">✏️</button>
          <button class="xt-btn xt-audio" title="Escuchar">🔊</button>
          <button class="xt-btn xt-copy" title="Copiar">📋</button>
        </div>
      </div>
      <div class="xt-result">${escapeHtml(initialData.text)}</div>
    `;

    shadowRoot.appendChild(tooltip);

    if (initialData.text && !initialData.text.startsWith("Error")) {
      saveToHistory(activeText, initialData.text);
    }

    const engineSelect = tooltip.querySelector('.xt-engine');
    const langSelect = tooltip.querySelector('.xt-lang');
    const detectedTag = tooltip.querySelector('.xt-detected');
    const resultDiv = tooltip.querySelector('.xt-result');
    const btnReplace = tooltip.querySelector('.xt-replace');
    const btnAudio = tooltip.querySelector('.xt-audio');
    const btnCopy = tooltip.querySelector('.xt-copy');

    const updateTranslation = async () => {
      resultDiv.style.opacity = '0.4';
      try {
        const res = await fetchTranslation(engineSelect.value, langSelect.value, activeText);
        resultDiv.textContent = res.text;
        detectedTag.textContent = res.detectedLang;
        saveToHistory(activeText, res.text);
      } catch (err) {
        resultDiv.textContent = "Error al traducir.";
      }
      resultDiv.style.opacity = '1';
    };

    engineSelect.addEventListener('change', updateTranslation);
    langSelect.addEventListener('change', updateTranslation);

    btnReplace.addEventListener('click', () => {
      replaceSelectedText(resultDiv.textContent);
      cleanupUI();
    });

    btnAudio.addEventListener('click', () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(resultDiv.textContent);
      utterance.lang = langSelect.value;
      window.speechSynthesis.speak(utterance);
    });

    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(resultDiv.textContent);
      btnCopy.textContent = '✅';
      setTimeout(() => { btnCopy.textContent = '📋'; }, 1200);
    });
  }

  function renderTriggerIcon(x, y, text) {
    cleanupUI();
    initShadowDOM();
    activeText = text;

    const icon = document.createElement('div');
    icon.className = 'xt-icon';
    icon.textContent = '🌐';
    icon.title = 'Traducir';
    icon.style.left = `${x + window.scrollX}px`;
    icon.style.top = `${y + window.scrollY - 34}px`;

    shadowRoot.appendChild(icon);

    icon.addEventListener('mousedown', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      icon.innerHTML = '<div class="xt-spinner"></div>';
      try {
        const data = await fetchTranslation('google', 'es', text);
        renderTooltip(data, x, y);
      } catch (err) {
        renderTooltip({ text: "Error de traducción.", detectedLang: "ERR" }, x, y);
      }
    });
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, m => ({ 
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' 
    }[m]));
  }

  // Detectar selección de texto
  document.addEventListener('mouseup', (e) => {
    if (shadowHost && e.composedPath().includes(shadowHost)) return;

    lastTargetElement = e.target;

    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        renderTriggerIcon(rect.right, rect.top, selectedText);
      } else {
        cleanupUI();
      }
    }, 30);
  });

  // Atajos de teclado y limpieza
  document.addEventListener('keydown', async (e) => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        activeText = selectedText;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const data = await fetchTranslation('google', 'es', selectedText);
        renderTooltip(data, rect.right, rect.top);
      }
    }
    if (e.key === 'Escape') cleanupUI();
  });

  document.addEventListener('mousedown', (e) => {
    if (shadowHost && e.composedPath().includes(shadowHost)) return;
    cleanupUI();
  });

  chrome.runtime?.onMessage?.addListener((req) => {
    if (req.action === "translate_selection") {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        activeText = selectedText;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        fetchTranslation('google', 'es', selectedText).then(data => renderTooltip(data, rect.right, rect.top));
      }
    }
  });
})();
