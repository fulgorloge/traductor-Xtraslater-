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
    top: `${y + window.scrollY + 25}px`,
    zIndex: '999999',
    background: '#222',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    boxShadow: '0px 4px 12px rgba(0,0,0,0.3)',
    maxWidth: '300px',
    fontSize: '13px',
    lineHeight: '1.4',
    fontFamily: 'Arial, sans-serif'
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
    top: `${y + window.scrollY - 30}px`,
    zIndex: '999999',
    background: '#007bff',
    color: '#fff',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    align-items: 'center',
    cursor: 'pointer',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.25)',
    fontSize: '14px',
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
  // Ignora clics dentro de la propia interfaz emergente
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
  }, 10);
});

// Cierra ventanas al hacer clic fuera o al presionar Escape
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#xtranslater-icon') && !e.target.closest('#xtranslater-tooltip')) {
    cleanupUI();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cleanupUI();
});
