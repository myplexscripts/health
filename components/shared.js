export function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

export function backHeader(title, backLabel = 'Back') {
  return `
    <header class="ios-navigation-bar is-scrolled">
      <div class="ios-navigation-bar__row">
        <div class="ios-navigation-bar__leading"><div class="ios-glass-group">
          <button class="ios-bar-button" type="button" data-ios-back><span data-ios-symbol="chevronLeft"></span><span>${escapeHTML(backLabel)}</span></button>
        </div></div>
        <div class="ios-navigation-bar__title" style="opacity:1;transform:none">${escapeHTML(title)}</div>
        <div class="ios-navigation-bar__trailing"></div>
      </div>
    </header>`;
}

export function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formDataObject(form) { return Object.fromEntries(new FormData(form).entries()); }

export function makeId(prefix = 'entry') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function field(label, name, options = {}) {
  const { type = 'number', value = '', placeholder = '', unit = '', min = '0', max = '', step = 'any', required = false, inputmode = 'decimal', help = '', autocomplete = 'off' } = options;
  const attributes = [`type="${escapeHTML(type)}"`, `name="${escapeHTML(name)}"`, `value="${escapeHTML(value)}"`, `placeholder="${escapeHTML(placeholder)}"`, `autocomplete="${escapeHTML(autocomplete)}"`];
  if (type === 'number') {
    attributes.push(`min="${escapeHTML(min)}"`, `step="${escapeHTML(step)}"`, `inputmode="${escapeHTML(inputmode)}"`);
    if (max !== '') attributes.push(`max="${escapeHTML(max)}"`);
  }
  if (required) attributes.push('required');
  return `<label class="ios-field"><span class="ios-field__label">${escapeHTML(label)}</span><span class="ios-text-field health-unit-field"><input ${attributes.join(' ')}>${unit ? `<span class="health-field-unit" aria-hidden="true">${escapeHTML(unit)}</span>` : ''}</span>${help ? `<span class="ios-field__help">${escapeHTML(help)}</span>` : ''}</label>`;
}

export function selectField(label, name, choices, selected) {
  return `<label class="ios-field"><span class="ios-field__label">${escapeHTML(label)}</span><span class="ios-picker-field"><select name="${escapeHTML(name)}">${choices.map(([value, text]) => `<option value="${escapeHTML(value)}"${value === selected ? ' selected' : ''}>${escapeHTML(text)}</option>`).join('')}</select></span></label>`;
}

export function textField(label, name, options = {}) {
  const { type = 'text', value = '', placeholder = '', required = false, autocomplete = 'off' } = options;
  return `<label class="ios-field"><span class="ios-field__label">${escapeHTML(label)}</span><span class="ios-text-field"><input type="${escapeHTML(type)}" name="${escapeHTML(name)}" value="${escapeHTML(value)}" placeholder="${escapeHTML(placeholder)}" autocomplete="${escapeHTML(autocomplete)}"${required ? ' required' : ''}></span></label>`;
}

export function toISODate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
