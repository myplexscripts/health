import { defineComponent } from '../framework/framework.js';
import { backHeader } from './shared.js';

let tesseractPromise;

function loadTesseract() {
  if (globalThis.Tesseract?.recognize) return Promise.resolve(globalThis.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(globalThis.Tesseract);
    script.onerror = () => reject(new Error('Text recognition could not be loaded'));
    document.head.append(script);
  });
  return tesseractPromise;
}

async function recogniseText(file, onProgress) {
  if ('TextDetector' in globalThis) {
    const bitmap = await createImageBitmap(file);
    try {
      const blocks = await new TextDetector().detect(bitmap);
      const text = blocks.map(block => block.rawValue).join('\n');
      if (text.trim()) return text;
    } finally {
      bitmap.close?.();
    }
  }
  const engine = await loadTesseract();
  const result = await engine.recognize(file, 'eng', {
    logger: event => {
      if (event.status === 'recognizing text') onProgress(Math.round((event.progress || 0) * 100));
    }
  });
  return result?.data?.text || '';
}

function firstNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(String(match[1]).replace(',', '.')) || 0;
  }
  return 0;
}

function parseNutrition(text) {
  const clean = text.replace(/\r/g, '').replace(/[|]/g, 'I');
  const servingMatch = clean.match(/(?:serving size|per)\s*[:/]?\s*([^\n]{2,36})/i);
  return {
    source: 'scan',
    name: '',
    serving: servingMatch?.[1]?.trim() || '',
    calories: firstNumber(clean, [/calories?\s*[:]?\s*(\d{1,4})/i, /energy\s*[:]?\s*(\d{1,4})\s*kcal/i]),
    fat: firstNumber(clean, [/(?:total\s+)?fat\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i, /lipides?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i]),
    carbs: firstNumber(clean, [/(?:total\s+)?carbohydrates?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i, /glucides?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i]),
    fibre: firstNumber(clean, [/(?:dietary\s+)?fi(?:bre|ber)\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i]),
    sugars: firstNumber(clean, [/(?:total\s+)?sugars?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i, /sucres?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i]),
    protein: firstNumber(clean, [/proteins?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i, /prot[ée]ines?\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*g/i]),
    sodium: firstNumber(clean, [/sodium\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*mg/i]),
    vitaminD: firstNumber(clean, [/vitamin\s*d\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*(?:mcg|µg|ug)/i, /vitamine\s*d\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*(?:mcg|µg|ug)/i])
  };
}

export const LabelScan = defineComponent({
  state: { previewUrl: '', filename: '', scanning: false, progress: 0, error: '' },

  render({ state }) {
    return `
      ${backHeader('Scan Label', 'Today')}
      <div class="ios-scroll"><div class="ios-content health-form-content">
        <h1 class="ios-large-title">Scan Label</h1>
        <section class="ios-section">
          <div class="health-scan-stage${state.previewUrl ? ' has-image' : ''}">
            ${state.previewUrl ? `<img src="${state.previewUrl}" alt="Selected nutrition label">` : `<div class="health-scan-placeholder"><span data-ios-symbol="scanLine"></span><h2>Nutrition Facts</h2><p>Fill the frame with the label and keep the text straight.</p></div>`}
            <span class="health-scan-corner health-scan-corner--tl"></span><span class="health-scan-corner health-scan-corner--tr"></span><span class="health-scan-corner health-scan-corner--bl"></span><span class="health-scan-corner health-scan-corner--br"></span>
          </div>
          ${state.scanning ? `<div class="health-scan-progress" role="status" aria-live="polite"><div class="health-scan-progress__row"><span>Reading label…</span><strong>${state.progress}%</strong></div><progress class="ios-progress" value="${state.progress}" max="100">${state.progress}%</progress></div>` : ''}
          ${state.error ? `<div class="ios-inline-message health-inline-message health-inline-message--warning" role="alert"><span class="health-inline-icon"><span data-ios-symbol="triangleAlert"></span></span><div class="ios-inline-message__body"><div class="ios-inline-message__title">Automatic scan unavailable</div><div class="ios-inline-message__text">${state.error} You can still enter the label values manually.</div></div></div>` : ''}
        </section>
        <section class="ios-section"><label class="ios-button ios-button--prominent ios-button--block health-file-button${state.scanning ? ' is-disabled' : ''}"><span data-ios-symbol="camera"></span>${state.previewUrl ? 'Retake Photo' : 'Take Label Photo'}<input type="file" accept="image/*" capture="environment" data-label-photo ${state.scanning ? 'disabled' : ''}></label>
          <button class="ios-button ios-button--tinted ios-button--block" type="button" data-enter-manually ${state.scanning ? 'disabled' : ''}><span data-ios-symbol="pencil"></span>Enter Manually</button>
          <div class="ios-section__footer">The photo is processed for text recognition and is not saved with your health data.</div>
        </section>
      </div></div>`;
  },

  events: {
    'change [data-label-photo]': async (event, { app, router, state, setState }) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      await setState({ previewUrl, filename: file.name, scanning: true, progress: 2, error: '' });
      try {
        const text = await recogniseText(file, progress => setState({ progress: Math.max(4, progress) }));
        const nutrition = parseNutrition(text);
        const found = ['calories', 'fat', 'carbs', 'protein', 'sodium'].some(key => nutrition[key] > 0);
        if (!found) throw new Error('The label text was not clear enough to read.');
        await setState({ scanning: false, progress: 100 });
        router.navigate('/food/new?source=scan', { state: { scannedNutrition: nutrition } });
      } catch (error) {
        await setState({ scanning: false, progress: 0, error: error?.message || 'Text recognition failed.' });
        app.toast.show('Open manual entry to finish this label');
      }
    },
    'click [data-enter-manually]': (event, { router }) => { event.preventDefault(); router.navigate('/food/new'); }
  },

  beforeUnmount({ state }) { if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); }
});
