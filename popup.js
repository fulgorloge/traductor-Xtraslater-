const container = document.getElementById('historyContainer');
const clearBtn = document.getElementById('clearBtn');

function loadHistory() {
  chrome.storage.local.get({ history: [] }, (res) => {
    if (!res.history || res.history.length === 0) {
      container.innerHTML = '<div class="empty">Sin traducciones recientes</div>';
      return;
    }
    container.innerHTML = res.history.map(item => `
      <div class="history-item">
        <div class="history-orig">${escapeHtml(item.original)}</div>
        <div class="history-trans">${escapeHtml(item.translated)}</div>
      </div>
    `).join('');
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

clearBtn.addEventListener('click', () => {
  chrome.storage.local.set({ history: [] }, loadHistory);
});

loadHistory();
