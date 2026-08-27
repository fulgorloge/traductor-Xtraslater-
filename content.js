let currentIcon = null;
let currentTooltip = null;
let activeText = "";

// Limpia los elementos emergentes de la interfaz
function cleanupUI() {
  if (currentIcon) {
    currentIcon.remove();
    currentIcon = null;
  }
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// Controladores de múltiples motores de traducción
async function fetchTranslation(engine, text) {
  const encodedText = encodeURIComponent(text);
  
  switch (engine) {
    case 'google': {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodedText}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0].map(item => item[0]).join('');
    }
    
    case 'mymemory': {
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|es`;
      const res = await fetch(url);
      const data = await res.json();
      return data.responseData?.translatedText || "Sin traducción disponible.";
    }

    case 'libretranslate': {
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: "es",
          format: "text"
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      return data.translatedText || "Error con LibreTranslate.";
    }

    case 'linguee': {
      // Fallback público via API de pares de idiomas
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|es&mt=1`;
      const res = await fetch(url);
      const data = await res.json();
      return data.responseData?.translatedText || "Error en la consulta.";
    }

    case 'bing': {
      // Fallback via endpoint de traducción libre
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodedText}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0].map(item => item[0]).join('');
    }

    default:
      throw new Error("Motor no soportado");
  }
}

// Crea la ventana emergente con la traducción y selector de motores
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
    maxWidth: '350px',
    fontSize: '13px',
    lineHeight: '1.4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid #27272a'
  });

  tooltip.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #27272a; padding-bottom: 6px;">
      <span style="font-size: 11px; font-weight: bold; color: #a1a1aa; text-transform: uppercase;">Motor:</span>
      <select id="xtranslater-engine-select" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; outline: none;">
        <option value="google" selected>Google Translate</option>
        <option value="mymemory">MyMemory</option>
        <option value="libretranslate">LibreTranslate</option>
        <option value="linguee">Linguee / DeepL Proxy</option>
        <option value="bing">Bing / DuckDuckGo</option>
      </select>
    </div>
    <div id="xtranslater-result" style="word-break: break-word;">${initialText}</div>
  `;

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;

  const select = tooltip.querySelector('#xtranslater-engine-select');
  const resultDiv = tooltip.querySelector('#xtranslater-result');

  select.addEventListener('change', async (e) => {
    const selectedEngine = e.target.value;
    resultDiv.innerText = "Consultando motor...";
    
    try {
      const translated = await fetchTranslation(selectedEngine, activeText);
      resultDiv.innerText = translated;
    } catch (err) {
      resultDiv.innerText = "Error al obtener respuesta de este motor.";
    }
  });
}

// Crea el icono flotante al seleccionar texto
function createTriggerIcon(x, y, selectedText) {
  cleanupUI();
  activeText = selectedText;

  const icon = document.createElement('div');
  icon.id = 'xtranslater-icon';
  icon.innerText = '🌐';
  icon.title = 'Traducir con Xtranslater';

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
      const translatedText = await fetchTranslation('google', selectedText);
      createTooltip(translatedText, x, y);
    } catch (err) {
      createTooltip("Error al traducir el texto.", x, y);
    }
  });

  document.body.appendChild(icon);
  currentIcon = icon;
}

// Escucha la selección de texto en la página
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

// Cierra la interfaz al hacer clic fuera o presionar Escape
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#xtranslater-icon') && !e.target.closest('#xtranslater-tooltip')) {
    cleanupUI();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cleanupUI();
});
