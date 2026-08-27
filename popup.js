<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 320px;
      background: #09090b;
      color: #f4f4f5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
      letter-spacing: -0.01em;
    }
    .badge {
      background: #2563eb;
      color: #ffffff;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .history-list {
      max-height: 240px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 2px;
    }
    .history-list::-webkit-scrollbar {
      width: 4px;
    }
    .history-list::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 4px;
    }
    .history-item {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
    }
    .history-orig { 
      color: #a1a1aa; 
      margin-bottom: 4px; 
      word-break: break-word;
      line-height: 1.3;
    }
    .history-trans { 
      color: #60a5fa; 
      font-weight: 600; 
      word-break: break-word;
      line-height: 1.3;
    }
    .empty { 
      color: #71717a; 
      font-size: 12px; 
      text-align: center; 
      padding: 24px 0; 
    }
    button.clear-btn {
      width: 100%;
      margin-top: 12px;
      background: #18181b;
      color: #f4f4f5;
      border: 1px solid #27272a;
      padding: 7px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: background 0.2s, border-color 0.2s;
    }
    button.clear-btn:hover { 
      background: #27272a; 
      border-color: #3f3f46;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>Xtranslater</h3>
    <span class="badge">v1.4.0</span>
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
      return text.replace(/[&<>"']/g, m => ({ 
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' 
      }[m]));
    }

    clearBtn.addEventListener('click', () => {
      chrome.storage.local.set({ history: [] }, loadHistory);
    });

    loadHistory();
  </script>
</body>
</html>
