function createTooltip(text, x, y) {
  let oldTooltip = document.getElementById('xtranslater-tooltip');
  if (oldTooltip) oldTooltip.remove();

  const tooltip = document.createElement('div');
  tooltip.id = 'xtranslater-tooltip';
  tooltip.innerText = text;
  
  tooltip.style.position = 'absolute';
  tooltip.style.left = `${x + window.scrollX + 10}px`;
  tooltip.style.top = `${y + window.scrollY + 10}px`;
  tooltip.style.zIndex = '999999';
  tooltip.style.background = '#333';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '8px 12px';
  tooltip.style.borderRadius = '5px';
  tooltip.style.boxShadow = '0px 2px 10px rgba(0,0,0,0.3)';
  tooltip.style.maxWidth = '300px';
  tooltip.style.fontSize = '13px';
  tooltip.style.lineHeight = '1.4';

  document.body.appendChild(tooltip);

  setTimeout(() => {
    document.addEventListener('click', function closeTooltip() {
      tooltip.remove();
      document.removeEventListener('click', closeTooltip);
    });
  }, 100);
}

document.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'q') {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(selectedText)}`;
        const res = await fetch(url);
        const data = await res.json();
        const translatedText = data[0].map(item => item[0]).join('');
        
        createTooltip(translatedText, rect.left, rect.bottom);
      } catch (err) {
        createTooltip("Error al traducir el texto.", rect.left, rect.bottom);
      }
    }
  }
});
