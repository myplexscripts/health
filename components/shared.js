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

const nutrient = (key, label, unit, target, mode = 'minimum', options = {}) => ({
  key, label, shortLabel: options.shortLabel || label, unit, target, mode,
  colour: options.colour || 'var(--ios-blue)', icon: options.icon || 'circle',
  max: options.max ?? 100000, step: options.step ?? (unit === 'g' ? 0.1 : 1)
});

// Matches the complete Nutrition list in Apple Health, in alphabetical order.
export const NUTRIENTS = [
  nutrient('biotin', 'Biotin', 'mcg', 30, 'minimum', { colour: 'var(--ios-purple)', icon: 'sparkles', max: 10000, step: 1 }),
  nutrient('caffeine', 'Caffeine', 'mg', 400, 'maximum', { colour: 'var(--ios-brown)', icon: 'coffee', max: 5000, step: 1 }),
  nutrient('calcium', 'Calcium', 'mg', 1300, 'minimum', { colour: 'var(--ios-indigo)', icon: 'bone', max: 10000, step: 10 }),
  nutrient('carbs', 'Carbohydrates', 'g', 275, 'maximum', { shortLabel: 'Carbs', colour: 'var(--ios-orange)', icon: 'wheat', max: 2000, step: 1 }),
  nutrient('chloride', 'Chloride', 'mg', 2300, 'minimum', { colour: 'var(--ios-cyan)', icon: 'droplets', max: 20000, step: 10 }),
  nutrient('chromium', 'Chromium', 'mcg', 35, 'minimum', { colour: 'var(--ios-gray)', icon: 'circle', max: 10000, step: 1 }),
  nutrient('copper', 'Copper', 'mg', 0.9, 'minimum', { colour: 'var(--ios-orange)', icon: 'circle', max: 1000, step: 0.1 }),
  nutrient('cholesterol', 'Dietary Cholesterol', 'mg', 300, 'maximum', { shortLabel: 'Cholesterol', colour: 'var(--ios-red)', icon: 'circle', max: 5000, step: 1 }),
  nutrient('calories', 'Dietary Energy', 'kcal', 2200, 'target', { shortLabel: 'Energy', colour: 'var(--ios-blue)', icon: 'flame', max: 10000, step: 10 }),
  nutrient('sugars', 'Dietary Sugar', 'g', 50, 'maximum', { shortLabel: 'Sugar', colour: 'var(--ios-pink)', icon: 'candy', max: 1000, step: 1 }),
  nutrient('fibre', 'Fibre', 'g', 28, 'minimum', { colour: 'var(--ios-green)', icon: 'leaf', max: 500, step: 1 }),
  nutrient('folate', 'Folate', 'mcg', 400, 'minimum', { colour: 'var(--ios-green)', icon: 'leaf', max: 10000, step: 1 }),
  nutrient('iodine', 'Iodine', 'mcg', 150, 'minimum', { colour: 'var(--ios-indigo)', icon: 'circle', max: 10000, step: 1 }),
  nutrient('iron', 'Iron', 'mg', 18, 'minimum', { colour: 'var(--ios-gray)', icon: 'circle', max: 1000, step: 0.1 }),
  nutrient('magnesium', 'Magnesium', 'mg', 420, 'minimum', { colour: 'var(--ios-purple)', icon: 'circle', max: 10000, step: 1 }),
  nutrient('manganese', 'Manganese', 'mg', 2.3, 'minimum', { colour: 'var(--ios-teal)', icon: 'circle', max: 1000, step: 0.1 }),
  nutrient('molybdenum', 'Molybdenum', 'mcg', 45, 'minimum', { colour: 'var(--ios-blue)', icon: 'circle', max: 10000, step: 1 }),
  nutrient('monounsaturatedFat', 'Monounsaturated Fat', 'g', 0, 'track', { shortLabel: 'Monounsaturated Fat', colour: 'var(--ios-yellow)', icon: 'droplet', max: 1000, step: 0.1 }),
  nutrient('niacin', 'Niacin', 'mg', 16, 'minimum', { colour: 'var(--ios-orange)', icon: 'sparkles', max: 1000, step: 0.1 }),
  nutrient('pantothenicAcid', 'Pantothenic Acid', 'mg', 5, 'minimum', { colour: 'var(--ios-pink)', icon: 'sparkles', max: 1000, step: 0.1 }),
  nutrient('phosphorus', 'Phosphorus', 'mg', 1250, 'minimum', { colour: 'var(--ios-indigo)', icon: 'circle', max: 10000, step: 10 }),
  nutrient('polyunsaturatedFat', 'Polyunsaturated Fat', 'g', 0, 'track', { shortLabel: 'Polyunsaturated Fat', colour: 'var(--ios-yellow)', icon: 'droplet', max: 1000, step: 0.1 }),
  nutrient('potassium', 'Potassium', 'mg', 4700, 'minimum', { colour: 'var(--ios-cyan)', icon: 'banana', max: 20000, step: 10 }),
  nutrient('protein', 'Protein', 'g', 120, 'minimum', { colour: 'var(--ios-red)', icon: 'dumbbell', max: 1000, step: 1 }),
  nutrient('riboflavin', 'Riboflavin', 'mg', 1.3, 'minimum', { colour: 'var(--ios-yellow)', icon: 'sparkles', max: 1000, step: 0.1 }),
  nutrient('saturatedFat', 'Saturated Fat', 'g', 20, 'maximum', { colour: 'var(--ios-orange)', icon: 'droplet', max: 1000, step: 0.1 }),
  nutrient('selenium', 'Selenium', 'mcg', 55, 'minimum', { colour: 'var(--ios-teal)', icon: 'circle', max: 10000, step: 1 }),
  nutrient('sodium', 'Sodium', 'mg', 2300, 'maximum', { colour: 'var(--ios-indigo)', icon: 'salad', max: 50000, step: 10 }),
  nutrient('thiamin', 'Thiamin', 'mg', 1.2, 'minimum', { colour: 'var(--ios-blue)', icon: 'sparkles', max: 1000, step: 0.1 }),
  nutrient('fat', 'Total Fat', 'g', 75, 'maximum', { shortLabel: 'Fat', colour: 'var(--ios-purple)', icon: 'droplet', max: 1000, step: 1 }),
  nutrient('vitaminA', 'Vitamin A', 'mcg', 900, 'minimum', { colour: 'var(--ios-orange)', icon: 'carrot', max: 100000, step: 1 }),
  nutrient('vitaminB6', 'Vitamin B6', 'mg', 1.7, 'minimum', { colour: 'var(--ios-purple)', icon: 'sparkles', max: 1000, step: 0.1 }),
  nutrient('vitaminB12', 'Vitamin B12', 'mcg', 2.4, 'minimum', { colour: 'var(--ios-red)', icon: 'sparkles', max: 10000, step: 0.1 }),
  nutrient('vitaminC', 'Vitamin C', 'mg', 90, 'minimum', { colour: 'var(--ios-orange)', icon: 'citrus', max: 10000, step: 1 }),
  nutrient('vitaminD', 'Vitamin D', 'mcg', 20, 'minimum', { colour: 'var(--ios-yellow)', icon: 'sun', max: 1000, step: 0.1 }),
  nutrient('vitaminE', 'Vitamin E', 'mg', 15, 'minimum', { colour: 'var(--ios-green)', icon: 'leaf', max: 10000, step: 0.1 }),
  nutrient('vitaminK', 'Vitamin K', 'mcg', 120, 'minimum', { colour: 'var(--ios-green)', icon: 'leaf', max: 10000, step: 1 }),
  nutrient('water', 'Water', 'mL', 0, 'track', { colour: 'var(--ios-blue)', icon: 'droplets', max: 20000, step: 10 }),
  nutrient('zinc', 'Zinc', 'mg', 11, 'minimum', { colour: 'var(--ios-gray)', icon: 'circle', max: 1000, step: 0.1 })
];

export function normaliseGoalConfig(config = {}) {
  const defaults = { calories: true, protein: true, fibre: true, sugars: true };
  return Object.fromEntries(NUTRIENTS.map(nutrient => {
    const saved = config[nutrient.key] || {};
    return [nutrient.key, {
      enabled: saved.enabled ?? Boolean(defaults[nutrient.key]),
      mode: ['maximum', 'minimum', 'target', 'track'].includes(saved.mode) ? saved.mode : nutrient.mode
    }];
  }));
}

export function goalRows(goals, config, { compact = false } = {}) {
  return NUTRIENTS.map(nutrient => {
    const setting = config[nutrient.key] || { enabled: false, mode: nutrient.mode };
    const target = goals[nutrient.key] ?? nutrient.target;
    const modes = nutrient.key === 'calories'
      ? [['target', 'Daily target'], ['track', 'Track only']]
      : [['minimum', 'Reach at least'], ['maximum', 'Stay under'], ['track', 'Track only']];
    if (compact) return `<label class="health-goal-row health-goal-row--compact" data-goal-label="${escapeHTML(nutrient.label.toLowerCase())}"><input type="checkbox" name="enabled_${nutrient.key}" ${setting.enabled ? 'checked' : ''}><span>${escapeHTML(nutrient.label)}</span><span class="ios-switch"><span class="ios-switch__track"></span></span><input type="hidden" name="mode_${nutrient.key}" value="${escapeHTML(setting.mode)}"><input type="hidden" name="goal_${nutrient.key}" value="${escapeHTML(target)}"></label>`;
    return `<div class="health-goal-row" data-goal-label="${escapeHTML(nutrient.label.toLowerCase())}">
      <label class="health-goal-toggle"><input type="checkbox" name="enabled_${nutrient.key}" ${setting.enabled ? 'checked' : ''}><span class="health-goal-icon" style="--goal-colour:${nutrient.colour}"><span data-ios-symbol="${nutrient.icon}"></span></span><span><strong>${escapeHTML(nutrient.label)}</strong><small>${setting.mode === 'maximum' ? 'Daily limit' : setting.mode === 'track' ? 'Track only' : 'Daily goal'}</small></span><span class="ios-switch"><span class="ios-switch__track"></span></span></label>
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
