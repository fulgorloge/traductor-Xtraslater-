let currentIcon = null;
let currentTooltip = null;
let activeText = "";
let lastTargetElement = null;

if (!document.getElementById('xtranslater-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'xtranslater-styles';
  styleEl.innerHTML = `
    @keyframes xt-pop-in {
      0% { opacity: 0; transform: scale(0.85) translateY(6px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes xt-fade-out {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.9); }
    }
    @keyframes xt-spin { 100% { transform: rotate(360deg); } }
    .xt-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%; border-top-color: #fff;
      animation: xt-spin 0.6s linear infinite;
    }
    .xt-btn-hover { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; }
    .xt-btn-hover:hover { background: #3f3f46 !important; transform: translateY(-1px); }
    #xtranslater-icon { transition: transform 0.2s ease, background-color 0.2s ease !important; }
    #xtranslater-icon:hover { transform: scale(1.15) !important; background-color: #1d4ed8 !important; }
  `;
  document.head.appendChild(styleEl);
}

function cleanupUI() {
  if (currentIcon) {
    currentIcon.style.opacity = '0';
    currentIcon.style.transform = 'scale(0.5)';
    setTimeout(() => { if (currentIcon) { currentIcon.remove(); currentIcon = null; } }, 150);
  }
  if (currentTooltip) {
    currentTooltip.style.animation = 'xt-fade-out 0.15s ease forwards';
    setTimeout(() => { if (currentTooltip) { currentTooltip.remove(); currentTooltip = null; } }, 140);
  }
  window.speechSynthesis.cancel();
}

async function fetchTranslation(engine, targetLang, text) {
  const encodedText = encodeURIComponent(text);
  try {
    if (engine === 'google') {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`);
      const data = await res.json();
      return { text: data[0].map(item => item[0]).join(''), detectedLang: data[2] || 'auto' };
    } else {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|${targetLang}`);
      const data = await res.json();
      return { text: data.responseData?.translatedText || "Sin traducción.", detectedLang: data.responseData?.detectedLanguage || 'auto' };
    }
  } catch (err) {
    if (engine === 'google') return fetchTranslation('mymemory', targetLang, text);
    throw err;
  }
}

function saveToHistory(original, translated) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get({ history: [] }, (res) => {
      const history = res.history;
      history.unshift({ original, translated, date: new Date().toISOString() });
      chrome.storage.local.set({ history: history.slice(0, 30) });
    });
  }
}

function replaceSelectedText(replacement) {
  const el = lastTargetElement;
  if (!el) return;

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.substring(0, start) + replacement + el.value.substring(end);
    el.selectionStart = el.selectionEnd = start + replacement.length;
  } else if (el.isContentEditable) {
    document.execCommand('insertText', false, replacement);
  }
}

function createTooltip(initialData, x, y) {
  cleanupUI();

  const tooltip = document.createElement('div');
  tooltip.id = 'xtranslater-tooltip';
  
  Object.assign(tooltip.style, {
    position: 'absolute',
    left: `${x + window.scrollX}px`,
    top: `${y + window.scrollY + 30}px`,
    zIndex: '2147483647',
    background: '#18181b',
    color: '#f4f4f5',
    padding: '12px 14px',
    borderRadius: '10px',
    boxShadow: '0px 8px 25px rgba(0,0,0,0.5)',
    maxWidth: '360px',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid #27272a',
    animation: 'xt-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  });

  tooltip.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #27272a; padding-bottom: 6px; gap: 6px;">
      <select id="xt-engine-select" class="xt-btn-hover" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 6px; padding: 3px 6px; font-size: 11px; cursor: pointer; outline: none;">
        <option value="google" selected>Google</option>
        <option value="mymemory">MyMemory</option>
      </select>
      
      <div style="display: flex; align-items: center; gap: 4px;">
        <span id="xt-detected-tag" style="font-size: 10px; color: #a1a1aa; text-transform: uppercase;">${initialData.detectedLang}</span>
        <span style="font-size: 10px; color: #a1a1aa;">→</span>
        <select id="xt-lang-select" class="xt-btn-hover" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 6px; padding: 3px 6px; font-size: 11px; cursor: pointer; outline: none;">
          <option value="es" selected>ES</option>
          <option value="en">EN</option>
          <option value="fr">FR</option>
          <option value="de">DE</option>
          <option value="pt">PT</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 4px;">
        <button id="xt-btn-replace" class="xt-btn-hover" title="Reemplazar texto" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; border-radius: 6px; padding: 3px 7px; cursor: pointer; font-size: 11px;">✏️</button>
        <button id="xt-btn-audio" class="xt-btn-hover" title="Escuchar" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; border-radius: 6px; padding: 3px 7px; cursor: pointer; font-size: 11px;">🔊</button>
        <button id="xt-btn-copy" class="xt-btn-hover" title="Copiar" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; border-radius: 6px; padding: 3px 7px; cursor: pointer; font-size: 11px;">📋</button>
      </div>
    </div>
    <div id="xt-result" style="word-break: break-word; transition: opacity 0.15s ease;">${initialData.text}</div>
  `;

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
  saveToHistory(activeText, initialData.text);

  const engineSelect = tooltip.querySelector('#xt-engine-select');
  const langSelect = tooltip.querySelector('#xt-lang-select');
  const detectedTag = tooltip.querySelector('#xt-detected-tag');
  const resultDiv = tooltip.querySelector('#xt-result');
  const btnReplace = tooltip.querySelector('#xt-btn-replace');
  const btnAudio = tooltip.querySelector('#xt-btn-audio');
  const btnCopy = tooltip.querySelector('#xt-btn-copy');

  const handleUpdate = async () => {
    resultDiv.style.opacity = '0.4';
    try {
      const res = await fetchTranslation(engineSelect.value, langSelect.value, activeText);
      resultDiv.innerText = res.text;
      detectedTag.innerText = res.detectedLang;
      saveToHistory(activeText, res.text);
    } catch (err) {
      resultDiv.innerText = "Error en la traducción.";
    }
    resultDiv.style.opacity = '1';
  };

  engineSelect.addEventListener('change', handleUpdate);
  langSelect.addEventListener('change', handleUpdate);

  btnReplace.addEventListener('click', () => {
    replaceSelectedText(resultDiv.innerText);
    cleanupUI();
  });

  btnAudio.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(resultDiv.innerText);
    utterance.lang = langSelect.value;
    window.speechSynthesis.speak(utterance);
  });

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(resultDiv.innerText);
    btnCopy.innerText = '✅';
    setTimeout(() => { btnCopy.innerText = '📋'; }, 1200);
  });
}

function createTriggerIcon(x, y, selectedText) {
  cleanupUI();
  activeText = selectedText;

  const icon = document.createElement('div');
  icon.id = 'xtranslater-icon';
  icon.innerText = '🌐';
  icon.title = 'Traducir';

  Object.assign(icon.style, {
    position: 'absolute',
    left: `${x + window.scrollX}px`,
    top: `${y + window.scrollY - 35}px`,
    zIndex: '2147483647',
    background: '#2563eb',
    color: '#ffffff',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    align-items: 'center',
    cursor: 'pointer',
    boxShadow: '0px 4px 12px rgba(37,99,235,0.4)',
    fontSize: '14px',
    userSelect: 'none',
    transform: 'scale(0.8)',
    opacity: '0'
  });

  document.body.appendChild(icon);
  currentIcon = icon;

  requestAnimationFrame(() => {
    icon.style.opacity = '1';
    icon.style.transform = 'scale(1)';
  });

  icon.addEventListener('mousedown', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    icon.innerHTML = '<div class="xt-spinner"></div>';
    try {
      const data = await fetchTranslation('google', 'es', selectedText);
      createTooltip(data, x, y);
    } catch (err) {
      createTooltip({ text: "Error de traducción.", detectedLang: "err" }, x, y);
    }
  });
}

document.addEventListener('mouseup', (e) => {
  if (e.target.closest('#xtranslater-icon') || e.target.closest('#xtranslater-tooltip')) return;

  lastTargetElement = e.target;

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      createTriggerIcon(rect.right, rect.top, selectedText);
    } else {
      cleanupUI();
    }
  }, 20);
});

document.addEventListener('keydown', async (e) => {
  if (e.altKey && (e.key === 't' || e.key === 'T')) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0) {
      activeText = selectedText;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const data = await fetchTranslation('google', 'es', selectedText);
      createTooltip(data, rect.right, rect.top);
    }
  }
  if (e.key === 'Escape') cleanupUI();
});

document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#xtranslater-icon') && !e.target.closest('#xtranslater-tooltip')) {
    cleanupUI();
  }
});

chrome.runtime?.onMessage?.addListener((req) => {
  if (req.action === "translate_selection") {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0) {
      activeText = selectedText;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      fetchTranslation('google', 'es', selectedText).then(data => createTooltip(data, rect.right, rect.top));
    }
  }
});
