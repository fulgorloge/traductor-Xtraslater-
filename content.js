let currentIcon = null;
let currentTooltip = null;
let activeText = "";

// Limpia la interfaz flotante
function cleanupUI() {
  if (currentIcon) {
    currentIcon.remove();
    currentIcon = null;
  }
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
  window.speechSynthesis.cancel(); // Detiene el audio al cerrar
}

// Consultas a motores de traducción
async function fetchTranslation(engine, targetLang, text) {
  const encodedText = encodeURIComponent(text);
  
  switch (engine) {
    case 'google': {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0].map(item => item[0]).join('');
    }
    case 'mymemory': {
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|${targetLang}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.responseData?.translatedText || "Sin traducción disponible.";
    }
    case 'libretranslate': {
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      return data.translatedText || "Error con LibreTranslate.";
    }
    default:
      throw new Error("Motor no soportado");
  }
}

// Guarda la traducción en el historial de la extensión
function saveToHistory(original, translated, engine, targetLang) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ history: [] }, (result) => {
      const history = result.history;
      history.unshift({
        original,
        translated,
        engine,
        targetLang,
        date: new Date().toISOString()
      });
      // Mantiene solo las últimas 50 traducciones
      chrome.storage.local.set({ history: history.slice(0, 50) });
    });
  }
}

// Reproducción de audio (Text-to-Speech)
function speakText(text, lang) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

// Ventana emergente flotante (Tooltip)
function createTooltip(initialText, x, y) {
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
    borderRadius: '8px',
    boxShadow: '0px 6px 20px rgba(0,0,0,0.5)',
    maxWidth: '360px',
    fontSize: '13px',
    lineHeight: '1.4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid #27272a'
  });

  tooltip.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #27272a; padding-bottom: 6px; gap: 6px;">
      <select id="xt-engine-select" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 4px; padding: 2px 4px; font-size: 11px; cursor: pointer; outline: none;">
        <option value="google" selected>Google</option>
        <option value="mymemory">MyMemory</option>
        <option value="libretranslate">LibreTranslate</option>
      </select>
      
      <select id="xt-lang-select" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 4px; padding: 2px 4px; font-size: 11px; cursor: pointer; outline: none;">
        <option value="es" selected>Español</option>
        <option value="en">Inglés</option>
        <option value="fr">Francés</option>
        <option value="de">Alemán</option>
        <option value="pt">Portugués</option>
        <option value="it">Italiano</option>
      </select>
      
      <div style="display: flex; gap: 4px;">
        <button id="xt-btn-audio" title="Escuchar traducción" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 11px;">🔊</button>
        <button id="xt-btn-copy" title="Copiar traducción" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 11px;">📋</button>
      </div>
    </div>
    <div id="xt-result" style="word-break: break-word;">${initialText}</div>
  `;

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;

  saveToHistory(activeText, initialText, 'google', 'es');

  const engineSelect = tooltip.querySelector('#xt-engine-select');
  const langSelect = tooltip.querySelector('#xt-lang-select');
  const resultDiv = tooltip.querySelector('#xt-result');
  const btnAudio = tooltip.querySelector('#xt-btn-audio');
  const btnCopy = tooltip.querySelector('#xt-btn-copy');

  // Recarga la traducción al cambiar de motor o idioma
  const handleUpdate = async () => {
    resultDiv.innerText = "Traduciendo...";
    try {
      const translated = await fetchTranslation(engineSelect.value, langSelect.value, activeText);
      resultDiv.innerText = translated;
      saveToHistory(activeText, translated, engineSelect.value, langSelect.value);
    } catch (err) {
      resultDiv.innerText = "Error en la traducción.";
    }
  };

  engineSelect.addEventListener('change', handleUpdate);
  langSelect.addEventListener('change', handleUpdate);

  // Escuchar audio
  btnAudio.addEventListener('click', () => {
    speakText(resultDiv.innerText, langSelect.value);
  });

  // Copiar texto
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(resultDiv.innerText);
    btnCopy.innerText = '✅';
    setTimeout(() => { btnCopy.innerText = '📋'; }, 1200);
  });
}

// Icono flotante 🌐
function createTriggerIcon(x, y, selectedText) {
  cleanupUI();
  activeText = selectedText;

  const icon = document.createElement('div');
  icon.id = 'xtranslater-icon';
  icon.innerText = '🌐';
  icon.title = 'Traducir (Xtranslater)';

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
    boxShadow: '0px 2px 10px rgba(0,0,0,0.3)',
    fontSize: '15px',
    userSelect: 'none'
  });

  icon.addEventListener('mousedown', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    icon.innerText = '⏳';
    try {
      const translatedText = await fetchTranslation('google', 'es', selectedText);
      createTooltip(translatedText, x, y);
    } catch (err) {
      createTooltip("Error al traducir el texto.", x, y);
    }
  });

  document.body.appendChild(icon);
  currentIcon = icon;
}

// Escucha la selección de texto
document.addEventListener('mouseup', (e) => {
  if (e.target.closest('#xtranslater-icon') || e.target.closest('#xtranslater-tooltip')) {
    return;
  }

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

// Atajo de teclado: Alt + T
document.addEventListener('keydown', async (e) => {
  if (e.altKey && (e.key === 't' || e.key === 'T')) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      activeText = selectedText;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const translatedText = await fetchTranslation('google', 'es', selectedText);
      createTooltip(translatedText, rect.right, rect.top);
    }
  }

  if (e.key === 'Escape') cleanupUI();
});

// Cerrar al hacer clic fuera
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#xtranslater-icon') && !e.target.closest('#xtranslater-tooltip')) {
    cleanupUI();
  }
});
