const root = document.querySelector('[data-glasskit-app]');
root?.removeAttribute('data-ios-app');

const [framework, components, shared] = await Promise.all([
  import('./framework/framework.js'),
  Promise.all([
    import('./components/food-entry.js'),
    import('./components/label-scan.js'),
    import('./components/health-entry.js'),
    import('./components/entry-detail.js'),
    import('./components/goals.js')
  ]),
  import('./components/shared.js')
]);

const { GlassKitApp, GlassKitStorage } = framework;
const [{ FoodEntry }, { LabelScan }, { HealthEntry }, { EntryDetail }, { Goals }] = components;
const { escapeHTML, formatDateTime } = shared;

const storage = new GlassKitStorage({ namespace: 'health' });
const defaultGoals = { calories: 2200, protein: 120, carbs: 260, fat: 75, fibre: 30, sodium: 2300 };

function dayStart(daysAgo = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function atTime(daysAgo, hour, minute = 0) {
  const date = dayStart(daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildSampleEntries() {
  const daily = [
    [410, 18, 62, 12, 9, 340], [390, 17, 58, 11, 8, 310], [445, 21, 61, 14, 10, 370],
    [370, 16, 54, 10, 7, 300], [430, 20, 59, 13, 9, 350], [400, 18, 57, 12, 8, 330], [420, 19, 60, 12, 9, 345]
  ];
  const dinners = [
    [720, 49, 78, 23, 10, 780], [810, 42, 94, 29, 8, 1040], [680, 52, 63, 21, 11, 690],
    [760, 45, 86, 25, 9, 910], [705, 48, 72, 24, 12, 720], [790, 44, 90, 27, 8, 980], [735, 51, 74, 22, 12, 740]
  ];
  const snacks = [210, 260, 190, 240, 220, 280, 205];
  const entries = [];
  for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
    const breakfast = daily[daysAgo];
    const dinner = dinners[daysAgo];
    entries.push({
      id: `sample-breakfast-${daysAgo}`, type: 'food', name: daysAgo === 0 ? 'Oatmeal and berries' : 'Yogurt oat bowl', serving: '1 bowl', meal: 'breakfast', datetime: atTime(daysAgo, 8, 10),
      calories: breakfast[0], protein: breakfast[1], carbs: breakfast[2], fat: breakfast[3], fibre: breakfast[4], sugars: 18, sodium: breakfast[5]
    });
    entries.push({
      id: `sample-dinner-${daysAgo}`, type: 'food', name: daysAgo === 0 ? 'Chicken grain bowl' : 'Grain bowl', serving: '1 bowl', meal: daysAgo === 0 ? 'lunch' : 'dinner', datetime: atTime(daysAgo, daysAgo === 0 ? 12 : 18, 40),
      calories: dinner[0], protein: dinner[1], carbs: dinner[2], fat: dinner[3], fibre: dinner[4], sugars: 9, sodium: dinner[5]
    });
    entries.push({
      id: `sample-snack-${daysAgo}`, type: 'food', name: daysAgo === 0 ? 'Greek yogurt' : 'Afternoon snack', serving: '1 serving', meal: 'snack', datetime: atTime(daysAgo, 15, 30),
      calories: snacks[daysAgo], protein: 16, carbs: 22, fat: 6, fibre: 3, sugars: 12, sodium: 120
    });
  }
  [[0, 124, 78, 68], [1, 127, 80, 71], [2, 122, 77, 66], [4, 129, 81, 72], [6, 126, 79, 69]].forEach(([daysAgo, systolic, diastolic, pulse]) => {
    entries.push({ id: `sample-bp-${daysAgo}`, type: 'health', readingType: 'blood-pressure', datetime: atTime(daysAgo, 7, 45), systolic, diastolic, pulse, position: 'seated', notes: '' });
  });
  entries.push({ id: 'sample-weight-0', type: 'health', readingType: 'weight', datetime: atTime(0, 7, 40), weight: 84.2, notes: '' });
  return entries.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
}

const saved = storage.get('state');
const initialState = saved && Array.isArray(saved.entries) ? {
  entries: saved.entries,
  goals: { ...defaultGoals, ...(saved.goals || {}) },
  preferences: { descriptiveInsights: true, ...(saved.preferences || {}) },
  usingSampleData: Boolean(saved.usingSampleData)
} : {
  entries: buildSampleEntries(), goals: defaultGoals, preferences: { descriptiveInsights: true }, usingSampleData: true
};

function persist(state) {
  storage.set('state', {
    entries: state.entries,
    goals: state.goals,
    preferences: state.preferences,
    usingSampleData: state.usingSampleData
  });
}

function shell() {
  const tab = (name, label, icon, selected = false) => `<button class="ios-tabbar__item" type="button" data-ios-tab="${name}" aria-selected="${selected}"><span data-ios-symbol="${icon}"></span><span>${label}</span></button>`;
  const header = (title, action = true) => `<header class="ios-navigation-bar"><div class="ios-navigation-bar__row"><div class="ios-navigation-bar__leading"></div><div class="ios-navigation-bar__title">${title}</div><div class="ios-navigation-bar__trailing">${action ? '<div class="ios-glass-group"><button class="ios-bar-button ios-bar-button--icon" type="button" data-add aria-label="Add entry"><span data-ios-symbol="plus"></span></button></div>' : ''}</div></div></header>`;
  return `
    <section class="ios-tab-panel" data-ios-tab-panel="today" tabindex="-1">${header('Today')}<div class="ios-scroll" data-ios-tabbar-minimize><div class="ios-content" data-today-content></div></div></section>
    <section class="ios-tab-panel" data-ios-tab-panel="trends" tabindex="-1" hidden>${header('Trends')}<div class="ios-scroll" data-ios-tabbar-minimize><div class="ios-content" data-trends-content></div></div></section>
    <section class="ios-tab-panel" data-ios-tab-panel="log" tabindex="-1" hidden>${header('Log')}<div class="ios-scroll" data-ios-tabbar-minimize><div class="ios-content" data-log-content></div></div></section>
    <section class="ios-tab-panel" data-ios-tab-panel="settings" tabindex="-1" hidden>${header('Settings', false)}<div class="ios-scroll" data-ios-tabbar-minimize><div class="ios-content" data-settings-content></div></div></section>
    <div class="ios-tabbar-wrap"><nav class="ios-tabbar" aria-label="Primary navigation">
      ${tab('today', 'Today', 'heartPulse', true)}${tab('trends', 'Trends', 'chartNoAxesCombined')}${tab('log', 'Log', 'list')}${tab('settings', 'Settings', 'gear')}
    </nav></div>`;
}

root.innerHTML = shell();

export const app = new GlassKitApp({
  root,
  name: 'Health',
  storage,
  request: { timeout: 10000, cacheTTL: 3600000 },
  router: { mode: 'hash', defaultRoute: '/', componentCacheSize: 10 },
  routes: [
    { name: 'today', path: '/', tab: 'today' },
    { name: 'trends', path: '/trends', tab: 'trends' },
    { name: 'log', path: '/log', tab: 'log' },
    { name: 'settings', path: '/settings', tab: 'settings' },
    { name: 'food-new', path: '/food/new', tab: 'today', component: FoodEntry, cache: false, cacheComponent: false },
    { name: 'label-scan', path: '/scan', tab: 'today', component: LabelScan, cache: false, cacheComponent: false },
    { name: 'health-new', path: '/health/new', tab: 'today', component: HealthEntry, cache: false, cacheComponent: false },
    { name: 'entry', path: '/entry/:id', tab: 'log', component: EntryDetail, cache: false },
    { name: 'goals', path: '/goals', tab: 'settings', component: Goals, cache: false },
    { path: '*', redirect: '/' }
  ],
  store: {
    state: { ...initialState, trendDays: 7, historyFilter: 'all', insightRules: { minimumTrendDays: 3, steadyRangePercent: 12, changeThresholdPercent: 8 } },
    actions: {
      addEntry({ state, set }, entry) {
        const previous = state.usingSampleData ? [] : state.entries;
        set('entries', [entry, ...previous].sort((a, b) => new Date(b.datetime) - new Date(a.datetime)));
        set('usingSampleData', false);
        persist(state);
      },
      deleteEntry({ state, set }, id) { set('entries', state.entries.filter(entry => entry.id !== id)); persist(state); },
      setGoals({ state, set }, goals) { set('goals', { ...state.goals, ...goals }); persist(state); },
      setPreferences({ state, set }, preferences) { set('preferences', { ...state.preferences, ...preferences }); persist(state); },
      clearData({ state, set }) { set('entries', []); set('usingSampleData', false); persist(state); },
      restoreSample({ state, set }) { set('entries', buildSampleEntries()); set('usingSampleData', true); persist(state); }
    }
  }
}).init();

function dateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDay(value, options = {}) {
  return new Intl.DateTimeFormat('en-CA', { weekday: options.short ? 'short' : 'long', month: 'short', day: 'numeric' }).format(new Date(value));
}

function foodTotals(entries) {
  return entries.filter(entry => entry.type === 'food').reduce((total, entry) => {
    ['calories', 'protein', 'carbs', 'fat', 'fibre', 'sugars', 'sodium'].forEach(key => { total[key] += Number(entry[key]) || 0; });
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugars: 0, sodium: 0 });
}

function clamp(value, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function percent(value, goal) { return goal > 0 ? Math.round((value / goal) * 100) : 0; }
function round(value, digits = 0) { return Number(value || 0).toFixed(digits).replace(/\.0$/, ''); }

function sampleBanner() {
  if (!app.store.state.usingSampleData) return '';
  return `<div class="ios-inline-message health-inline-message health-sample-banner"><span class="health-inline-icon" style="background:var(--ios-indigo)"><span data-ios-symbol="sparkles"></span></span><div class="ios-inline-message__body"><div class="ios-inline-message__title">Sample data</div><div class="ios-inline-message__text">Explore the app now. Your first saved entry replaces these examples.</div></div><button class="ios-button ios-button--plain" type="button" data-clear-sample>Clear</button></div>`;
}

function nutritionProgress(label, value, goal, unit, colour) {
  const raw = percent(value, goal);
  return `<div class="health-nutrient"><div class="health-nutrient__header"><span>${label}</span><strong>${round(value)}<small> / ${round(goal)} ${unit}</small></strong></div><div class="health-progress-track" role="progressbar" aria-label="${label}: ${round(value)} of ${round(goal)} ${unit}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.round(value)}"><span style="width:${clamp(raw)}%;background:${colour}"></span></div><span class="health-nutrient__percent">${raw}%</span></div>`;
}

function entryIcon(entry) {
  if (entry.type === 'food') return ['utensils', 'health-icon--food'];
  if (entry.readingType === 'blood-pressure') return ['heartPulse', 'health-icon--heart'];
  if (entry.readingType === 'weight') return ['scale', 'health-icon--weight'];
  return ['droplets', 'health-icon--glucose'];
}

function entryTitle(entry) {
  if (entry.type === 'food') return entry.name;
  if (entry.readingType === 'blood-pressure') return 'Blood Pressure';
  if (entry.readingType === 'weight') return 'Weight';
  return 'Blood Glucose';
}

function entryValue(entry) {
  if (entry.type === 'food') return `${Math.round(entry.calories)} kcal`;
  if (entry.readingType === 'blood-pressure') return `${entry.systolic}/${entry.diastolic}`;
  if (entry.readingType === 'weight') return `${round(entry.weight, 1)} kg`;
  return `${round(entry.glucose, 1)} mmol/L`;
}

function entryRow(entry) {
  const [icon, colourClass] = entryIcon(entry);
  const subtitle = entry.type === 'food' ? `${entry.serving} • ${new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(entry.datetime))}` : formatDateTime(entry.datetime);
  return `<button class="ios-row ios-row--disclosure" type="button" data-entry-row data-entry-category="${entry.type === 'food' ? 'nutrition' : 'health'}" data-entry-search="${escapeHTML(`${entryTitle(entry)} ${subtitle}`.toLowerCase())}" data-glasskit-link="/entry/${encodeURIComponent(entry.id)}"><span class="ios-row__icon ${colourClass}"><span data-ios-symbol="${icon}"></span></span><span class="ios-row__body"><span class="ios-row__title">${escapeHTML(entryTitle(entry))}</span><span class="ios-row__subtitle">${escapeHTML(subtitle)}</span></span><span class="ios-row__value health-row-value">${escapeHTML(entryValue(entry))}</span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button>`;
}

function describeToday(totals, goals) {
  if (!totals.calories) return 'Log a meal to see a plain-language summary of your day.';
  const proteinPct = percent(totals.protein, goals.protein);
  const fibrePct = percent(totals.fibre, goals.fibre);
  if (proteinPct >= 75 && fibrePct >= 70) return 'Protein and fibre are both building steadily toward your goals.';
  if (fibrePct < 45) return 'Fibre is the furthest from its target today. Your next meal can help close the gap.';
  if (proteinPct < 45) return 'Protein is the furthest from its target today. You still have room to balance the day.';
  return 'Your nutrition is tracking close to the shape of your daily goals.';
}

function renderToday() {
  const target = root.querySelector('[data-today-content]');
  const today = dateKey(new Date());
  const entries = app.store.state.entries.filter(entry => dateKey(entry.datetime) === today);
  const foods = entries.filter(entry => entry.type === 'food');
  const health = entries.filter(entry => entry.type === 'health');
  const totals = foodTotals(foods);
  const goals = app.store.state.goals;
  const energyPct = percent(totals.calories, goals.calories);
  const remaining = Math.max(0, goals.calories - totals.calories);
  const latestBP = health.find(entry => entry.readingType === 'blood-pressure') || app.store.state.entries.find(entry => entry.readingType === 'blood-pressure');
  target.innerHTML = `
    <div class="health-page-heading"><div><p class="health-eyebrow">${formatDay(new Date())}</p><h1 class="ios-large-title">Today</h1></div><button class="health-avatar" type="button" data-glasskit-link="/settings" aria-label="Open Settings"><span data-ios-symbol="person"></span></button></div>
    ${sampleBanner()}
    <section class="ios-section"><article class="ios-card health-energy-card">
      <div class="health-energy-ring" style="--health-progress:${clamp(energyPct) * 3.6}deg" role="img" aria-label="${energyPct}% of energy goal"><div><strong>${Math.round(totals.calories).toLocaleString('en-CA')}</strong><span>of ${goals.calories.toLocaleString('en-CA')} kcal</span></div></div>
      <div class="health-energy-copy"><span class="health-status-pill"><span></span>${energyPct > 100 ? 'Over goal' : 'On track'}</span><h2>${remaining.toLocaleString('en-CA')} kcal left</h2><p>${escapeHTML(describeToday(totals, goals))}</p></div>
    </article></section>
    <section class="ios-section"><div class="health-action-grid">
      <button class="health-action-card" type="button" data-glasskit-link="/scan"><span class="health-action-card__icon" style="background:var(--ios-blue)"><span data-ios-symbol="scanLine"></span></span><span><strong>Scan Label</strong><small>Use the camera</small></span></button>
      <button class="health-action-card" type="button" data-glasskit-link="/food/new"><span class="health-action-card__icon" style="background:var(--ios-orange)"><span data-ios-symbol="utensils"></span></span><span><strong>Add Food</strong><small>Enter it manually</small></span></button>
      <button class="health-action-card" type="button" data-glasskit-link="/health/new"><span class="health-action-card__icon" style="background:var(--ios-red)"><span data-ios-symbol="heartPulse"></span></span><span><strong>Health Data</strong><small>BP, weight, glucose</small></span></button>
    </div></section>
    <section class="ios-section"><div class="ios-section-heading"><div class="ios-section-heading__copy"><h2 class="ios-section-heading__title">Nutrition</h2><div class="ios-section-heading__subtitle">Your daily targets</div></div><button class="ios-button ios-button--plain" type="button" data-glasskit-link="/trends">See Trends</button></div>
      <article class="ios-card health-nutrition-card">
        ${nutritionProgress('Protein', totals.protein, goals.protein, 'g', 'var(--ios-red)')}
        ${nutritionProgress('Carbohydrates', totals.carbs, goals.carbs, 'g', 'var(--ios-orange)')}
        ${nutritionProgress('Fat', totals.fat, goals.fat, 'g', 'var(--ios-purple)')}
        ${nutritionProgress('Fibre', totals.fibre, goals.fibre, 'g', 'var(--ios-green)')}
        ${nutritionProgress('Sodium', totals.sodium, goals.sodium, 'mg', 'var(--ios-blue)')}
      </article>
    </section>
    <section class="ios-section"><div class="ios-section-heading"><div class="ios-section-heading__copy"><h2 class="ios-section-heading__title">Health</h2><div class="ios-section-heading__subtitle">Your most recent readings</div></div></div>
      <article class="ios-card health-vital-card">${latestBP ? `<div class="health-vital-card__icon"><span data-ios-symbol="heartPulse"></span></div><div><span>Blood Pressure</span><strong>${latestBP.systolic}<small>/</small>${latestBP.diastolic}</strong><p>mmHg • ${formatDay(latestBP.datetime, { short: true })}</p></div><button class="ios-button ios-button--tinted" type="button" data-glasskit-link="/entry/${encodeURIComponent(latestBP.id)}">View</button>` : `<div><strong>No readings yet</strong><p>Add your first blood pressure reading.</p></div><button class="ios-button ios-button--tinted" type="button" data-glasskit-link="/health/new">Add</button>`}</article>
    </section>
    <section class="ios-section"><div class="ios-section-heading"><div class="ios-section-heading__copy"><h2 class="ios-section-heading__title">Today's Log</h2><div class="ios-section-heading__subtitle">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</div></div><button class="ios-button ios-button--plain" type="button" data-glasskit-link="/log">View All</button></div>
      ${entries.length ? `<div class="ios-list">${entries.slice(0, 5).map(entryRow).join('')}</div>` : `<div class="ios-content-unavailable health-empty"><div><div class="ios-content-unavailable__icon"><span data-ios-symbol="clipboardList"></span></div><div class="ios-content-unavailable__title">Nothing Logged Yet</div><div class="ios-content-unavailable__description">Add food or a health reading to begin.</div></div></div>`}
    </section>`;
  app.enhance(target);
}

function daysInRange(count) {
  return Array.from({ length: count }, (_, index) => dayStart(count - index - 1));
}

function lineCoordinates(values, width = 306, height = 116, minValue = 0, maxValue = null) {
  const maximum = maxValue ?? Math.max(...values, 1);
  const minimum = minValue;
  const span = Math.max(1, maximum - minimum);
  return values.map((value, index) => ({ x: 14 + (values.length === 1 ? width / 2 : (index / (values.length - 1)) * width), y: 132 - ((value - minimum) / span) * height }));
}

function pathFrom(points) { return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '); }

function calorieChart(days, totalsByDay, goal) {
  const visibleDays = days.length > 30 ? days.filter((_, index) => index % 7 === 0 || index === days.length - 1) : days;
  const values = visibleDays.map(day => totalsByDay.get(dateKey(day))?.calories || 0);
  const points = lineCoordinates(values, 302, 108, 0, Math.max(goal * 1.15, ...values, 1));
  const area = `${pathFrom(points)} L${points.at(-1).x} 146 L${points[0].x} 146 Z`;
  const labels = [visibleDays[0], visibleDays[Math.floor((visibleDays.length - 1) / 2)], visibleDays.at(-1)];
  return `<div class="ios-chart health-line-chart" role="img" aria-label="Energy logged over ${days.length} days"><svg viewBox="0 0 330 176" aria-hidden="true"><line class="ios-chart__grid-line" x1="14" y1="38" x2="316" y2="38"/><line class="ios-chart__grid-line" x1="14" y1="92" x2="316" y2="92"/><line class="ios-chart__baseline" x1="14" y1="146" x2="316" y2="146"/><path class="ios-chart__area" d="${area}"/><path class="ios-chart__line" d="${pathFrom(points)}"/>${points.map(point => `<circle class="ios-chart__point" cx="${point.x}" cy="${point.y}" r="3.5"/>`).join('')}<text class="ios-chart__axis-label" x="14" y="169">${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(labels[0])}</text><text class="ios-chart__axis-label" x="165" y="169" text-anchor="middle">${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(labels[1])}</text><text class="ios-chart__axis-label" x="316" y="169" text-anchor="end">${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(labels[2])}</text></svg></div>`;
}

function bpChart(readings) {
  if (readings.length < 2) return '';
  const systolic = readings.map(entry => entry.systolic);
  const diastolic = readings.map(entry => entry.diastolic);
  const all = [...systolic, ...diastolic];
  const minimum = Math.floor(Math.min(...all) / 10) * 10 - 10;
  const maximum = Math.ceil(Math.max(...all) / 10) * 10 + 10;
  const top = lineCoordinates(systolic, 302, 104, minimum, maximum);
  const bottom = lineCoordinates(diastolic, 302, 104, minimum, maximum);
  return `<div class="ios-chart health-line-chart" role="img" aria-label="Blood pressure readings with systolic and diastolic lines"><svg viewBox="0 0 330 156" aria-hidden="true"><line class="ios-chart__grid-line" x1="14" y1="28" x2="316" y2="28"/><line class="ios-chart__grid-line" x1="14" y1="80" x2="316" y2="80"/><line class="ios-chart__baseline" x1="14" y1="132" x2="316" y2="132"/><path class="ios-chart__line" d="${pathFrom(top)}"/>${top.map(point => `<circle class="ios-chart__point" cx="${point.x}" cy="${point.y}" r="3.5"/>`).join('')}<path class="ios-chart__line ios-chart__line--secondary" d="${pathFrom(bottom)}"/>${bottom.map(point => `<circle class="ios-chart__point health-point-secondary" cx="${point.x}" cy="${point.y}" r="3.5"/>`).join('')}</svg></div>`;
}

function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }

function trendInsights(days, totalsByDay, goals) {
  const populated = days.map(day => totalsByDay.get(dateKey(day))).filter(Boolean);
  if (populated.length < app.store.state.insightRules.minimumTrendDays) return [{ icon: 'sparkles', colour: 'var(--ios-indigo)', title: 'More data needed', text: 'Log at least three days to unlock nutrition trends.' }];
  const calorieValues = populated.map(total => total.calories);
  const variation = (Math.max(...calorieValues) - Math.min(...calorieValues)) / Math.max(average(calorieValues), 1) * 100;
  const half = Math.max(1, Math.floor(populated.length / 2));
  const earlier = populated.slice(0, half);
  const recent = populated.slice(-half);
  const proteinChange = percent(average(recent.map(item => item.protein)) - average(earlier.map(item => item.protein)), Math.max(average(earlier.map(item => item.protein)), 1));
  const sodiumChange = percent(average(recent.map(item => item.sodium)) - average(earlier.map(item => item.sodium)), Math.max(average(earlier.map(item => item.sodium)), 1));
  const insights = [];
  insights.push(variation <= app.store.state.insightRules.steadyRangePercent ? { icon: 'circleCheck', colour: 'var(--ios-green)', title: 'Energy is consistent', text: `Your logged energy stayed within a ${Math.round(variation)}% range.` } : { icon: 'chartNoAxesCombined', colour: 'var(--ios-blue)', title: 'Energy varies by day', text: `Your logged energy moved across a ${Math.round(variation)}% range.` });
  insights.push(proteinChange >= app.store.state.insightRules.changeThresholdPercent ? { icon: 'trendingUp', colour: 'var(--ios-red)', title: 'Protein is trending up', text: `Your recent daily average is ${Math.abs(proteinChange)}% higher than earlier in this period.` } : { icon: 'target', colour: 'var(--ios-purple)', title: 'Protein is holding steady', text: `You averaged ${Math.round(average(recent.map(item => item.protein)))} g on recent logged days.` });
  insights.push(sodiumChange <= -app.store.state.insightRules.changeThresholdPercent ? { icon: 'trendingDown', colour: 'var(--ios-cyan)', title: 'Sodium is trending down', text: `Your recent daily average is ${Math.abs(sodiumChange)}% lower.` } : { icon: 'info', colour: 'var(--ios-orange)', title: 'Sodium context', text: `You averaged ${Math.round(average(recent.map(item => item.sodium)))} mg on recent logged days, compared with your ${goals.sodium} mg target.` });
  return insights;
}

function renderTrends() {
  const target = root.querySelector('[data-trends-content]');
  const range = app.store.state.trendDays;
  const days = daysInRange(range);
  const validKeys = new Set(days.map(dateKey));
  const foods = app.store.state.entries.filter(entry => entry.type === 'food' && validKeys.has(dateKey(entry.datetime)));
  const groupedEntries = new Map();
  foods.forEach(entry => {
    const key = dateKey(entry.datetime);
    groupedEntries.set(key, [...(groupedEntries.get(key) || []), entry]);
  });
  const grouped = new Map([...groupedEntries].map(([key, entries]) => [key, foodTotals(entries)]));
  const populated = [...grouped.values()];
  const calorieAverage = Math.round(average(populated.map(item => item.calories)));
  const proteinAverage = Math.round(average(populated.map(item => item.protein)));
  const fibreAverage = Math.round(average(populated.map(item => item.fibre)));
  const bpReadings = app.store.state.entries.filter(entry => entry.readingType === 'blood-pressure' && validKeys.has(dateKey(entry.datetime))).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const avgSystolic = Math.round(average(bpReadings.map(entry => entry.systolic)));
  const avgDiastolic = Math.round(average(bpReadings.map(entry => entry.diastolic)));
  const insightsSection = app.store.state.preferences.descriptiveInsights ? `<section class="ios-section"><div class="ios-section-heading"><div class="ios-section-heading__copy"><h2 class="ios-section-heading__title">What Stands Out</h2><div class="ios-section-heading__subtitle">Descriptive changes in your own log</div></div></div><div class="health-insight-list">${trendInsights(days, grouped, app.store.state.goals).map(insight => `<article class="ios-insight-card health-insight-card" style="--ios-insight-accent:${insight.colour}"><span class="health-insight-card__icon"><span data-ios-symbol="${insight.icon}"></span></span><div><h3>${insight.title}</h3><p>${insight.text}</p></div></article>`).join('')}</div></section>` : '';
  target.innerHTML = `
    <div class="health-page-heading"><div><p class="health-eyebrow">Patterns, not perfection</p><h1 class="ios-large-title">Trends</h1></div></div>
    ${sampleBanner()}
    <section class="ios-section"><div class="ios-segmented health-trend-range" data-ios-segmented aria-label="Trend range"><button type="button" data-trend-days="7" aria-selected="${range === 7}">Week</button><button type="button" data-trend-days="30" aria-selected="${range === 30}">Month</button><button type="button" data-trend-days="180" aria-selected="${range === 180}">6 Months</button></div></section>
    <section class="ios-section"><div class="ios-section-heading"><div class="ios-section-heading__copy"><h2 class="ios-section-heading__title">Nutrition</h2><div class="ios-section-heading__subtitle">Averages for days with food logged</div></div></div>
      <div class="health-stat-grid"><article><span>Energy</span><strong>${calorieAverage.toLocaleString('en-CA')}</strong><small>kcal per day</small></article><article><span>Protein</span><strong>${proteinAverage}</strong><small>g per day</small></article><article><span>Fibre</span><strong>${fibreAverage}</strong><small>g per day</small></article></div>
      <article class="ios-chart-card health-chart-card"><div class="ios-chart-card__header"><div class="ios-chart-card__copy"><h3 class="ios-chart-card__title">Energy Logged</h3><div class="ios-chart-card__subtitle">Daily total compared over time</div></div><div class="ios-chart-card__metric">${calorieAverage.toLocaleString('en-CA')}<small>avg</small></div></div>${calorieChart(days, grouped, app.store.state.goals.calories)}</article>
    </section>
    ${insightsSection}
    <section class="ios-section"><div class="ios-section-heading"><div class="ios-section-heading__copy"><h2 class="ios-section-heading__title">Blood Pressure</h2><div class="ios-section-heading__subtitle">Systolic and diastolic readings</div></div></div>
      ${bpReadings.length >= 2 ? `<article class="ios-chart-card health-chart-card health-bp-chart" style="--ios-chart-accent:var(--ios-red);--ios-chart-accent-2:var(--ios-blue)"><div class="ios-chart-card__header"><div class="ios-chart-card__copy"><h3 class="ios-chart-card__title">Recent Average</h3><div class="ios-chart-card__subtitle">${bpReadings.length} readings in this period</div></div><div class="ios-chart-card__metric">${avgSystolic}<small>/ ${avgDiastolic}</small></div></div>${bpChart(bpReadings)}<div class="ios-chart-legend"><span class="ios-chart-legend__item"><span class="ios-chart-legend__dot"></span>Systolic</span><span class="ios-chart-legend__item"><span class="ios-chart-legend__dot ios-chart-legend__dot--secondary"></span>Diastolic</span></div></article>` : `<div class="ios-content-unavailable health-empty"><div><div class="ios-content-unavailable__icon"><span data-ios-symbol="heartPulse"></span></div><div class="ios-content-unavailable__title">Add More Readings</div><div class="ios-content-unavailable__description">Two blood pressure readings are needed to draw a trend.</div><button class="ios-button ios-button--tinted" type="button" data-glasskit-link="/health/new">Add Reading</button></div></div>`}
      <div class="ios-section__footer">Trends are informational and are not a diagnosis. Discuss concerns or unusual readings with a qualified health professional.</div>
    </section>`;
  app.enhance(target);
}

function renderLog() {
  const target = root.querySelector('[data-log-content]');
  const filter = app.store.state.historyFilter;
  const groups = new Map();
  app.store.state.entries.forEach(entry => { const key = dateKey(entry.datetime); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(entry); });
  target.innerHTML = `
    <div class="health-page-heading"><div><p class="health-eyebrow">Everything in one place</p><h1 class="ios-large-title">Log</h1></div></div>
    ${sampleBanner()}
    <section class="ios-section"><label class="ios-search-field"><span data-ios-symbol="search"></span><input type="search" placeholder="Search entries" autocomplete="off" aria-label="Search entries" data-log-search><button class="ios-search-field__clear" type="button" data-ios-clear aria-label="Clear search"><span data-ios-symbol="xmark"></span></button></label></section>
    <section class="ios-section"><div class="ios-segmented health-log-filter" data-ios-segmented aria-label="Log filter"><button type="button" data-history-filter="all" aria-selected="${filter === 'all'}">All</button><button type="button" data-history-filter="nutrition" aria-selected="${filter === 'nutrition'}">Nutrition</button><button type="button" data-history-filter="health" aria-selected="${filter === 'health'}">Health</button></div></section>
    <div data-log-groups>${[...groups.entries()].map(([key, entries]) => `<section class="ios-section health-log-group" data-log-group><div class="ios-section__header">${key === dateKey(new Date()) ? 'Today' : formatDay(`${key}T12:00:00`)}</div><div class="ios-list">${entries.map(entryRow).join('')}</div></section>`).join('')}</div>
    <div class="ios-content-unavailable health-empty" data-log-empty ${app.store.state.entries.length ? 'hidden' : ''}><div><div class="ios-content-unavailable__icon"><span data-ios-symbol="clipboardList"></span></div><div class="ios-content-unavailable__title">No Entries</div><div class="ios-content-unavailable__description">Food and health data will appear here.</div><button class="ios-button ios-button--tinted" type="button" data-add>Add Entry</button></div></div>`;
  app.enhance(target);
  filterLogRows();
}

function filterLogRows() {
  const query = root.querySelector('[data-log-search]')?.value.trim().toLowerCase() || '';
  const filter = app.store.state.historyFilter;
  let visible = 0;
  root.querySelectorAll('[data-entry-row]').forEach(row => {
    const matchesFilter = filter === 'all' || row.dataset.entryCategory === filter;
    const matchesQuery = !query || row.dataset.entrySearch.includes(query);
    row.hidden = !(matchesFilter && matchesQuery);
    if (!row.hidden) visible += 1;
  });
  root.querySelectorAll('[data-log-group]').forEach(group => { group.hidden = !group.querySelector('[data-entry-row]:not([hidden])'); });
  const empty = root.querySelector('[data-log-empty]');
  if (empty) empty.hidden = visible > 0;
}

function renderSettings() {
  const target = root.querySelector('[data-settings-content]');
  const goals = app.store.state.goals;
  target.innerHTML = `
    <div class="health-page-heading"><div><p class="health-eyebrow">Make Health yours</p><h1 class="ios-large-title">Settings</h1></div></div>
    <section class="ios-section"><div class="ios-section__header">Goals</div><div class="ios-list"><button class="ios-row ios-row--disclosure" type="button" data-glasskit-link="/goals"><span class="ios-row__icon" style="background:var(--ios-green)"><span data-ios-symbol="target"></span></span><span class="ios-row__body"><span class="ios-row__title">Nutrition Goals</span><span class="ios-row__subtitle">Energy and daily nutrient targets</span></span><span class="ios-row__value">${goals.calories.toLocaleString('en-CA')} kcal</span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button></div></section>
    <section class="ios-section"><div class="ios-section__header">Understanding Your Data</div><div class="ios-list"><label class="ios-row"><span class="ios-row__icon" style="background:var(--ios-indigo)"><span data-ios-symbol="sparkles"></span></span><span class="ios-row__body"><span class="ios-row__title">Trend Insights</span><span class="ios-row__subtitle">Describe changes in your own log</span></span><span class="ios-switch"><input type="checkbox" data-insights-toggle ${app.store.state.preferences.descriptiveInsights ? 'checked' : ''} aria-label="Trend insights"><span class="ios-switch__track"></span></span></label></div><div class="ios-section__footer">Insights describe your entries and never diagnose a health condition.</div></section>
    <section class="ios-section"><div class="ios-section__header">Your Data</div><div class="ios-list"><button class="ios-row ios-row--disclosure" type="button" data-export-data><span class="ios-row__icon" style="background:var(--ios-blue)"><span data-ios-symbol="download"></span></span><span class="ios-row__body"><span class="ios-row__title">Export Data</span><span class="ios-row__subtitle">Download a JSON backup</span></span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button>${app.store.state.usingSampleData ? `<button class="ios-row ios-row--disclosure" type="button" data-clear-sample><span class="ios-row__icon" style="background:var(--ios-orange)"><span data-ios-symbol="refresh"></span></span><span class="ios-row__body"><span class="ios-row__title">Clear Sample Data</span></span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button>` : ''}<button class="ios-row ios-row--disclosure health-destructive-row" type="button" data-erase-data><span class="ios-row__icon"><span data-ios-symbol="trash"></span></span><span class="ios-row__body"><span class="ios-row__title">Erase All Data</span><span class="ios-row__subtitle">This cannot be undone</span></span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button></div></section>
    <section class="ios-section"><article class="ios-card health-privacy-card"><span class="health-privacy-card__icon"><span data-ios-symbol="lock"></span></span><div><h2>Your data stays on this device</h2><p>Health stores entries in this browser. Nothing is uploaded unless you choose to export it.</p></div></article></section>
    <section class="ios-section"><div class="ios-section__header">About</div><div class="ios-list"><div class="ios-row"><span class="ios-row__body"><span class="ios-row__title">Health</span></span><span class="ios-row__value">Version 1.0</span></div></div></section>`;
  app.enhance(target);
}

function renderAll() { renderToday(); renderTrends(); renderLog(); renderSettings(); }

function openAddSheet() {
  const sheet = app.sheet.open({ title: 'Add to Health', cancel: 'Cancel', className: 'health-add-sheet', content: `<div class="ios-list"><button class="ios-row ios-row--disclosure" type="button" data-sheet-route="/scan"><span class="ios-row__icon" style="background:var(--ios-blue)"><span data-ios-symbol="scanLine"></span></span><span class="ios-row__body"><span class="ios-row__title">Scan Nutrition Label</span><span class="ios-row__subtitle">Take a photo and review the values</span></span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button><button class="ios-row ios-row--disclosure" type="button" data-sheet-route="/food/new"><span class="ios-row__icon" style="background:var(--ios-orange)"><span data-ios-symbol="utensils"></span></span><span class="ios-row__body"><span class="ios-row__title">Enter Food Manually</span><span class="ios-row__subtitle">Log a meal, snack, or drink</span></span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button><button class="ios-row ios-row--disclosure" type="button" data-sheet-route="/health/new"><span class="ios-row__icon" style="background:var(--ios-red)"><span data-ios-symbol="heartPulse"></span></span><span class="ios-row__body"><span class="ios-row__title">Add Health Data</span><span class="ios-row__subtitle">Blood pressure, weight, or glucose</span></span><span class="ios-row__chevron"><span data-ios-symbol="chevronRight"></span></span></button></div>` });
  sheet.body.addEventListener('click', event => {
    const button = event.target.closest('[data-sheet-route]');
    if (!button) return;
    const path = button.dataset.sheetRoute;
    sheet.close('selection');
    setTimeout(() => { sheet.destroy(); app.navigate(path); }, 220);
  });
}

root.addEventListener('click', async event => {
  if (event.target.closest('[data-add]')) { event.preventDefault(); openAddSheet(); return; }
  const range = event.target.closest('[data-trend-days]');
  if (range) { app.store.set('trendDays', Number(range.dataset.trendDays)); renderTrends(); return; }
  const historyFilter = event.target.closest('[data-history-filter]');
  if (historyFilter) { app.store.set('historyFilter', historyFilter.dataset.historyFilter); renderLog(); return; }
  if (event.target.closest('[data-clear-sample]')) {
    const confirmed = await app.dialog.confirm('Remove the sample entries and start with an empty log?', { title: 'Clear Sample Data', okText: 'Clear', destructive: true });
    if (confirmed) app.store.dispatch('clearData');
    return;
  }
  if (event.target.closest('[data-export-data]')) {
    await app.loading.during(Promise.resolve().then(() => {
      const data = JSON.stringify({ exportedAt: new Date().toISOString(), entries: app.store.state.entries, goals: app.store.state.goals }, null, 2);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `health-export-${dateKey(new Date())}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }), 'Preparing export…');
    app.toast.show('Health data exported');
    return;
  }
  if (event.target.closest('[data-erase-data]')) {
    const confirmed = await app.dialog.confirm('All nutrition and health entries on this device will be permanently deleted.', { title: 'Erase All Data?', okText: 'Erase All', destructive: true });
    if (confirmed) { app.store.dispatch('clearData'); app.toast.show('All Health data erased'); }
  }
});

root.addEventListener('input', event => { if (event.target.matches('[data-log-search]')) filterLogRows(); });
root.addEventListener('change', event => {
  if (event.target.matches('[data-insights-toggle]')) app.store.dispatch('setPreferences', { descriptiveInsights: event.target.checked });
});

app.store.subscribe('entries', renderAll);
app.store.subscribe('goals', renderAll);
app.store.subscribe('preferences', renderAll);
app.store.subscribe('usingSampleData', renderAll);
app.store.subscribe('insightRules', renderTrends);

renderAll();
root.setAttribute('aria-busy', 'false');

app.request.get('./components/insight-rules.json', { cache: true, cacheTTL: 3600000 })
  .then(rules => app.store.set('insightRules', { ...app.store.state.insightRules, ...rules }))
  .catch(() => {});
