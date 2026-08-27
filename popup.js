document.addEventListener('DOMContentLoaded', () => {
  const translateBtn = document.getElementById('translateBtn');
  const ttsBtn = document.getElementById('ttsBtn');
  const sourceText = document.getElementById('sourceText');
  const targetLang = document.getElementById('targetLang');
  const engine = document.getElementById('engine');
  const resultText = document.getElementById('resultText');

  async function performTranslation() {
    const text = sourceText.value.trim();
    const lang = targetLang.value;
    const selectedEngine = engine.value;

    if (!text) {
      resultText.innerText = "Por favor ingresa un texto.";
      return;
    }

    resultText.innerText = "Traduciendo...";

    try {
      let translated = "";
      if (selectedEngine === "google") {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        translated = data[0].map(item => item[0]).join('');
      } else if (selectedEngine === "mymemory") {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`;
        const res = await fetch(url);
        const data = await res.json();
        translated = data.responseData.translatedText;
      }
      resultText.innerText = translated;
    } catch (error) {
      resultText.innerText = "Error al conectar con el servidor de traducción.";
    }
  }

  function playAudio() {
    const text = resultText.innerText;
    if (!text || text === "Traduciendo..." || text === "Esperando texto...") return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang.value;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tu navegador no soporta síntesis de voz.");
    }
  }

  translateBtn.addEventListener('click', performTranslation);
  ttsBtn.addEventListener('click', playAudio);
});
