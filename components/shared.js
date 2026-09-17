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

export const NUTRIENTS = [
  { key: 'calories', label: 'Energy', shortLabel: 'Energy', unit: 'kcal', target: 2200, mode: 'target', colour: 'var(--ios-blue)', icon: 'flame', max: 10000, step: 10 },
  { key: 'protein', label: 'Protein', shortLabel: 'Protein', unit: 'g', target: 120, mode: 'minimum', colour: 'var(--ios-red)', icon: 'dumbbell', max: 1000, step: 1 },
  { key: 'carbs', label: 'Carbohydrates', shortLabel: 'Carbs', unit: 'g', target: 260, mode: 'maximum', colour: 'var(--ios-orange)', icon: 'wheat', max: 1000, step: 1 },
  { key: 'fat', label: 'Fat', shortLabel: 'Fat', unit: 'g', target: 75, mode: 'maximum', colour: 'var(--ios-purple)', icon: 'droplet', max: 1000, step: 1 },
  { key: 'fibre', label: 'Fibre', shortLabel: 'Fibre', unit: 'g', target: 30, mode: 'minimum', colour: 'var(--ios-green)', icon: 'leaf', max: 500, step: 1 },
  { key: 'sugars', label: 'Sugars', shortLabel: 'Sugar', unit: 'g', target: 50, mode: 'maximum', colour: 'var(--ios-pink)', icon: 'candy', max: 1000, step: 1 },
  { key: 'sodium', label: 'Sodium', shortLabel: 'Sodium', unit: 'mg', target: 2300, mode: 'maximum', colour: 'var(--ios-indigo)', icon: 'salad', max: 50000, step: 10 },
  { key: 'vitaminD', label: 'Vitamin D', shortLabel: 'Vitamin D', unit: 'mcg', target: 20, mode: 'minimum', colour: 'var(--ios-yellow)', icon: 'sun', max: 1000, step: 1 }
];

export function normaliseGoalConfig(config = {}) {
  const defaults = { calories: true, protein: true, fibre: true, sugars: true };
  return Object.fromEntries(NUTRIENTS.map(nutrient => {
    const saved = config[nutrient.key] || {};
    return [nutrient.key, {
      enabled: saved.enabled ?? Boolean(defaults[nutrient.key]),
      mode: saved.mode === 'maximum' || saved.mode === 'minimum' || saved.mode === 'target' ? saved.mode : nutrient.mode
    }];
  }));
}

export function goalRows(goals, config, { compact = false } = {}) {
  return NUTRIENTS.map(nutrient => {
    const setting = config[nutrient.key];
    const target = goals[nutrient.key] ?? nutrient.target;
    const modes = nutrient.key === 'calories'
      ? [['target', 'Daily target']]
      : [['minimum', 'Reach at least'], ['maximum', 'Stay under']];
    return `<div class="health-goal-row">
      <label class="health-goal-toggle"><input type="checkbox" name="enabled_${nutrient.key}" ${setting.enabled ? 'checked' : ''}><span class="health-goal-icon" style="--goal-colour:${nutrient.colour}"><span data-ios-symbol="${nutrient.icon}"></span></span><span><strong>${escapeHTML(nutrient.label)}</strong><small>${setting.mode === 'maximum' ? 'Daily limit' : 'Daily goal'}</small></span><span class="ios-switch"><span class="ios-switch__track"></span></span></label>
      <div class="health-goal-controls">
        <label><span class="health-visually-hidden">${escapeHTML(nutrient.label)} goal type</span><span class="ios-picker-field"><select name="mode_${nutrient.key}" aria-label="${escapeHTML(nutrient.label)} goal type">${modes.map(([value, label]) => `<option value="${value}"${setting.mode === value ? ' selected' : ''}>${label}</option>`).join('')}</select></span></label>
        <label><span class="health-visually-hidden">${escapeHTML(nutrient.label)} amount</span><span class="ios-text-field health-unit-field"><input type="number" name="goal_${nutrient.key}" value="${escapeHTML(target)}" min="0" max="${nutrient.max}" step="${nutrient.step}" inputmode="decimal" aria-label="${escapeHTML(nutrient.label)} amount"><span class="health-field-unit" aria-hidden="true">${escapeHTML(nutrient.unit)}</span></span></label>
      </div>
    </div>`;
  }).join('');
}

export function goalsFromForm(form) {
  const data = new FormData(form);
  const goals = {};
  const goalConfig = {};
  NUTRIENTS.forEach(nutrient => {
    goals[nutrient.key] = numberValue(data.get(`goal_${nutrient.key}`), nutrient.target);
    goalConfig[nutrient.key] = { enabled: data.has(`enabled_${nutrient.key}`), mode: String(data.get(`mode_${nutrient.key}`) || nutrient.mode) };
  });
  return { goals, goalConfig };
}
