let currentIcon = null;
let currentTooltip = null;

// Remueve los elementos emergentes existentes
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

// Crea la ventana emergente con la traducción
function createTooltip(text, x, y) {
  cleanupUI();

  const tooltip = document.createElement('div');
  tooltip.id = 'xtranslater-tooltip';
  tooltip.innerText = text;
  
  Object.assign(tooltip.style, {
    position: 'absolute',
    left: `${x + window.scrollX}px`,
    top: `${y + window.scrollY + 30}px`,
    zIndex: '2147483647',
    background: '#1e1e1e',
    color: '#ffffff',
    padding: '10px 14px',
    borderRadius: '6px',
    boxShadow: '0px 4px 15px rgba(0,0,0,0.4)',
    maxWidth: '320px',
    fontSize: '13px',
    lineHeight: '1.4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid #444'
  });

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

// Crea el icono flotante al seleccionar texto
function createTriggerIcon(x, y, selectedText) {
  cleanupUI();

  const icon = document.createElement('div');
  icon.id = 'xtranslater-icon';
  icon.innerText = '🌐';
  icon.title = 'Traducir con Xtranslater';

  Object.assign(icon.style, {
    position: 'absolute',
    left: `${x + window.scrollX}px`,
    top: `${y + window.scrollY - 35}px`,
    zIndex: '2147483647',
    background: '#007bff',
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

  // Al hacer clic en el icono, realiza la traducción
  icon.addEventListener('mousedown', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    icon.innerText = '⏳';
    
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(selectedText)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translatedText = data[0].map(item => item[0]).join('');
      
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

// Cierra ventanas al hacer clic fuera o presionar Escape
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#xtranslater-icon') && !e.target.closest('#xtranslater-tooltip')) {
    cleanupUI();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cleanupUI();
});
