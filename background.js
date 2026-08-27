chrome.commands.onCommand.addListener((command) => {
  if (command === "trigger-translation") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "translate_selection" });
      }
    });
  }
});
