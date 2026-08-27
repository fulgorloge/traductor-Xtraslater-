<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 300px;
      background: #09090b;
      color: #f4f4f5;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 14px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #27272a;
    }
    h3 {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge {
      background: #2563eb;
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .history-list {
      max-height: 220px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .history-item {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
    }
    .history-orig { color: #a1a1aa; margin-bottom: 3px; word-break: break-word; }
    .history-trans { color: #60a5fa; font-weight: 600; word-break: break-word; }
    .empty { color: #71717a; font-size: 12px; text-align: center; padding: 16px 0; }
    button.clear-btn {
      width: 100%;
      margin-top: 12px;
      background: #27272a;
      color: #f4f4f5;
      border: 1px solid #3f3f46;
      padding: 6px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: background 0.2s;
    }
    button.clear-btn:hover { background: #3f3f46; }
  </style>
</head>
<body>
  <div class="header">
    <h3>Xtranslater</h3>
    <span class="badge">v1.3.0</span>
  </div>
  <div id="historyContainer" class="history-list"></div>
  <button id="clearBtn" class="clear-btn">Limpiar Historial</button>

  <script>
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
      return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    clearBtn.addEventListener('click', () => {
      chrome.storage.local.set({ history: [] }, loadHistory);
    });

    loadHistory();
  </script>
</body>
</html>
