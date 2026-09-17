import Framework7 from 'framework7';
import Sheet from 'framework7/components/sheet';
import Toast from 'framework7/components/toast';
import Dialog from 'framework7/components/dialog';
import Actions from 'framework7/components/actions';
import Tabs from 'framework7/components/tabs';
import 'framework7/css';
import 'framework7/components/sheet/css';
import 'framework7/components/toast/css';
import 'framework7/components/dialog/css';
import 'framework7/components/actions/css';
import 'framework7/components/tabs/css';
import 'framework7/components/searchbar/css';
import 'framework7-icons/css/framework7-icons.css';
import './styles.css';

Framework7.use([Sheet, Toast, Dialog, Actions, Tabs]);

const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
const applyDarkMode = event => document.documentElement.classList.toggle('dark', event.matches);
applyDarkMode(darkMode);
darkMode.addEventListener?.('change', applyDarkMode);

const STORAGE_KEY = 'health-app-v1';
const todayKey = new Date().toISOString().slice(0, 10);

const foods = [
  { id: 'oats', name: 'Oatmeal with berries', detail: '1 bowl', meal: 'Breakfast', calories: 340, protein: 12, carbs: 58, fat: 8, fibre: 9, sodium: 120, sugar: 14 },
  { id: 'yogurt', name: 'Greek yogurt', detail: '¾ cup', meal: 'Breakfast', calories: 140, protein: 17, carbs: 8, fat: 4, fibre: 0, sodium: 65, sugar: 6 },
  { id: 'chicken', name: 'Chicken grain bowl', detail: '1 bowl', meal: 'Lunch', calories: 560, protein: 42, carbs: 63, fat: 17, fibre: 11, sodium: 610, sugar: 7 },
  { id: 'sandwich', name: 'Turkey avocado sandwich', detail: '1 sandwich', meal: 'Lunch', calories: 480, protein: 31, carbs: 46, fat: 19, fibre: 7, sodium: 780, sugar: 6 },
  { id: 'salmon', name: 'Salmon, rice and greens', detail: '1 plate', meal: 'Dinner', calories: 610, protein: 45, carbs: 59, fat: 21, fibre: 8, sodium: 430, sugar: 5 },
  { id: 'pasta', name: 'Tomato lentil pasta', detail: '2 cups', meal: 'Dinner', calories: 520, protein: 26, carbs: 82, fat: 11, fibre: 16, sodium: 540, sugar: 12 },
  { id: 'apple', name: 'Apple', detail: '1 medium', meal: 'Snack', calories: 95, protein: 1, carbs: 25, fat: 0, fibre: 4, sodium: 2, sugar: 19 },
  { id: 'almonds', name: 'Almonds', detail: '¼ cup', meal: 'Snack', calories: 170, protein: 6, carbs: 6, fat: 15, fibre: 4, sodium: 0, sugar: 1 }
];

const defaultState = {
  profile: { name: 'David', calorieGoal: 2200, proteinGoal: 120, carbsGoal: 250, fatGoal: 73, fibreGoal: 30, sodiumGoal: 2300, waterGoal: 2500 },
  selectedDate: todayKey,
  days: {
    [todayKey]: {
      entries: [
        { ...foods[0], entryId: 'demo-1', servings: 1 },
        { ...foods[2], entryId: 'demo-2', servings: 1 },
        { ...foods[6], entryId: 'demo-3', servings: 1 }
      ],
      water: 1250,
      steps: 6842,
      sleep: 7.4,
      vitals: { systolic: 124, diastolic: 82, heartRate: 72, weight: 188.4 }
    }
  },
  weightHistory: [190.2, 189.7, 189.4, 189.8, 188.9, 189.1, 188.4],
  calorieHistory: [2040, 1870, 2310, 2180, 1950, 2260, 995]
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.profile && saved?.days) return { ...defaultState, ...saved, selectedDate: todayKey };
  } catch (_) {}
  return structuredClone(defaultState);
}

let state = loadState();
let selectedFoodId = foods[0].id;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDay(key = state.selectedDate) {
  if (!state.days[key]) state.days[key] = { entries: [], water: 0, steps: 0, sleep: 0, vitals: {} };
  return state.days[key];
}

function sumNutrient(name) {
  return getDay().entries.reduce((sum, entry) => sum + (Number(entry[name]) || 0) * (entry.servings || 1), 0);
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const formatNumber = value => Math.round(value).toLocaleString('en-CA');
const dayLabel = key => {
  const date = new Date(`${key}T12:00:00`);
  if (key === todayKey) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

function icon(name, className = '') {
  return `<i class="icon f7-icons ${className}" aria-hidden="true">${name}</i>`;
}

function ring(value, goal, colour, label, unit = '', size = 'large') {
  const percent = clamp((value / goal) * 100);
  return `
    <div class="progress-ring progress-ring--${size}" style="--progress:${percent};--ring-color:${colour}" role="img" aria-label="${formatNumber(value)} ${unit} of ${formatNumber(goal)} ${unit}">
      <div class="progress-ring__inside">
        <strong>${formatNumber(value)}</strong>
        <span>${unit}</span>
      </div>
    </div>
    <div class="ring-label">${label}</div>`;
}

const appMarkup = `
  <div class="view view-main view-init safe-areas">
    <div class="page page-current app-page">
      <div class="tabs-animated-wrap">
        <div class="tabs">
          <section id="tab-summary" class="page-content tab tab-active app-tab" aria-label="Summary"></section>
          <section id="tab-diary" class="page-content tab app-tab" aria-label="Diary"></section>
          <section id="tab-insights" class="page-content tab app-tab" aria-label="Trends"></section>
        </div>
      </div>

      <nav class="toolbar toolbar-bottom tabbar floating-tabbar" aria-label="Primary navigation">
        <div class="toolbar-inner">
          <a href="#tab-summary" class="tab-link tab-link-active" aria-label="Summary">
            ${icon('heart_fill')}<span>Summary</span>
          </a>
          <a href="#tab-diary" class="tab-link" aria-label="Diary">
            ${icon('list_bullet')}<span>Diary</span>
          </a>
          <button type="button" class="tab-add-button js-open-food" aria-label="Log food">
            ${icon('plus')}
          </button>
          <a href="#tab-insights" class="tab-link" aria-label="Trends">
            ${icon('chart_bar_fill')}<span>Trends</span>
          </a>
          <button type="button" class="settings-link js-open-settings" aria-label="Settings">
            ${icon('gear_alt_fill')}<span>Settings</span>
          </button>
        </div>
      </nav>
    </div>
  </div>

  <div class="sheet-modal sheet-modal-top-radius" id="food-sheet" aria-label="Log food">
    <div class="toolbar sheet-handlebar"><div class="toolbar-inner"><div class="sheet-handle" aria-hidden="true"></div></div></div>
    <div class="sheet-modal-inner">
      <div class="page-content sheet-content">
        <div class="sheet-heading">
          <button class="sheet-action sheet-close" type="button">Cancel</button>
          <h2>Log Food</h2>
          <button class="sheet-action sheet-save js-save-food" type="button">Add</button>
        </div>
        <div class="searchbar searchbar-inline food-search">
          <div class="searchbar-input-wrap">
            <input type="search" id="food-search-input" placeholder="Search foods" aria-label="Search foods" />
            ${icon('search')}
            <span class="input-clear-button"></span>
          </div>
        </div>
        <div class="food-results" id="food-results"></div>
        <div class="sheet-form-row">
          <label for="meal-select">Meal</label>
          <select id="meal-select" aria-label="Meal">
            <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
          </select>
        </div>
        <div class="sheet-form-row">
          <label for="servings-input">Servings</label>
          <div class="native-stepper">
            <button class="js-serving-minus" type="button" aria-label="Decrease servings">−</button>
            <input id="servings-input" type="number" min="0.25" max="20" step="0.25" value="1" inputmode="decimal" aria-label="Number of servings" />
            <button class="js-serving-plus" type="button" aria-label="Increase servings">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="sheet-modal sheet-modal-top-radius" id="vitals-sheet" aria-label="Log vitals">
    <div class="toolbar sheet-handlebar"><div class="toolbar-inner"><div class="sheet-handle" aria-hidden="true"></div></div></div>
    <div class="sheet-modal-inner">
      <div class="page-content sheet-content">
        <div class="sheet-heading">
          <button class="sheet-action sheet-close" type="button">Cancel</button>
          <h2>Log Vitals</h2>
          <button class="sheet-action sheet-save js-save-vitals" type="button">Save</button>
        </div>
        <div class="ios-form">
          <label><span>Systolic</span><input id="systolic-input" type="number" inputmode="numeric" placeholder="120" /><small>mmHg</small></label>
          <label><span>Diastolic</span><input id="diastolic-input" type="number" inputmode="numeric" placeholder="80" /><small>mmHg</small></label>
          <label><span>Heart rate</span><input id="heart-rate-input" type="number" inputmode="numeric" placeholder="70" /><small>bpm</small></label>
          <label><span>Weight</span><input id="weight-input" type="number" inputmode="decimal" step="0.1" placeholder="185" /><small>lb</small></label>
        </div>
      </div>
    </div>
  </div>

  <div class="sheet-modal sheet-modal-top-radius" id="settings-sheet" aria-label="Goals and settings">
    <div class="toolbar sheet-handlebar"><div class="toolbar-inner"><div class="sheet-handle" aria-hidden="true"></div></div></div>
    <div class="sheet-modal-inner">
      <div class="page-content sheet-content">
        <div class="sheet-heading">
          <button class="sheet-action sheet-close" type="button">Cancel</button>
          <h2>Daily Goals</h2>
          <button class="sheet-action sheet-save js-save-settings" type="button">Save</button>
        </div>
        <p class="form-caption">Personalise the targets shown throughout Health.</p>
        <div class="ios-form">
          <label><span>Calories</span><input id="goal-calories" type="number" inputmode="numeric" /><small>kcal</small></label>
          <label><span>Protein</span><input id="goal-protein" type="number" inputmode="numeric" /><small>g</small></label>
          <label><span>Fibre</span><input id="goal-fibre" type="number" inputmode="numeric" /><small>g</small></label>
          <label><span>Sodium</span><input id="goal-sodium" type="number" inputmode="numeric" /><small>mg</small></label>
          <label><span>Water</span><input id="goal-water" type="number" inputmode="numeric" /><small>mL</small></label>
        </div>
        <button type="button" class="reset-data-button js-reset-data">Reset all health data</button>
        <p class="privacy-note">${icon('lock_fill')} Your information stays in this browser and is never uploaded.</p>
      </div>
    </div>
  </div>
`;

document.querySelector('#app').innerHTML = appMarkup;

const app = new Framework7({
  el: '#app',
  name: 'Health',
  id: 'com.myplexscripts.health',
  theme: 'ios',
  iosTranslucentBars: true,
  touch: { tapHold: false, disableContextMenu: false },
  view: { browserHistory: false, iosDynamicNavbar: true }
});

const foodSheet = app.sheet.create({ el: '#food-sheet', swipeToClose: true, backdrop: true });
const vitalsSheet = app.sheet.create({ el: '#vitals-sheet', swipeToClose: true, backdrop: true });
const settingsSheet = app.sheet.create({ el: '#settings-sheet', swipeToClose: true, backdrop: true });

function dateControl() {
  const current = new Date(`${state.selectedDate}T12:00:00`);
  const max = todayKey;
  return `
    <div class="date-control" aria-label="Selected date">
      <button class="date-arrow js-date-previous" type="button" aria-label="Previous day">${icon('chevron_left')}</button>
      <label class="date-label">
        <span>${dayLabel(state.selectedDate)}</span>
        <small>${current.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}</small>
        <input class="date-native-input js-date-input" type="date" value="${state.selectedDate}" max="${max}" aria-label="Choose date" />
      </label>
      <button class="date-arrow js-date-next" type="button" aria-label="Next day" ${state.selectedDate === todayKey ? 'disabled' : ''}>${icon('chevron_right')}</button>
    </div>`;
}

function pageHeader(title, subtitle, trailing = '') {
  return `
    <header class="large-header">
      <div>
        <span class="eyebrow">${subtitle}</span>
        <h1>${title}</h1>
      </div>
      ${trailing}
    </header>`;
}

function renderSummary() {
  const day = getDay();
  const calories = sumNutrient('calories');
  const protein = sumNutrient('protein');
  const fibre = sumNutrient('fibre');
  const sodium = sumNutrient('sodium');
  const remaining = Math.max(0, state.profile.calorieGoal - calories);
  const vitals = day.vitals || {};
  const sodiumStatus = sodium <= state.profile.sodiumGoal ? 'On track' : 'Over goal';

  document.querySelector('#tab-summary').innerHTML = `
    <div class="app-content summary-content">
      ${pageHeader('Health', new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }), `<button class="avatar-button js-open-settings" type="button" aria-label="Open settings">D</button>`)}
      ${dateControl()}

      <section class="hero-card" aria-labelledby="energy-heading">
        <div class="card-heading">
          <div><span class="card-kicker">Nutrition</span><h2 id="energy-heading">Daily energy</h2></div>
          <button class="icon-button js-open-food" type="button" aria-label="Log food">${icon('plus')}</button>
        </div>
        <div class="energy-layout">
          <div>${ring(calories, state.profile.calorieGoal, '#ff375f', 'Consumed', 'kcal')}</div>
          <div class="energy-copy"><strong>${formatNumber(remaining)}</strong><span>kcal remaining</span><div class="energy-bar"><i style="width:${clamp((calories / state.profile.calorieGoal) * 100)}%"></i></div><small>${formatNumber(state.profile.calorieGoal)} daily goal</small></div>
        </div>
      </section>

      <section aria-labelledby="today-heading">
        <div class="section-heading"><h2 id="today-heading">Today at a glance</h2></div>
        <div class="metric-grid">
          <button type="button" class="metric-card js-water-add" aria-label="Add 250 millilitres of water">
            <div class="metric-icon blue">${icon('drop_fill')}</div>
            <div class="metric-value">${(day.water / 1000).toFixed(2).replace(/0$/, '')}<span> L</span></div>
            <div class="metric-label">Water</div>
            <div class="mini-progress"><i style="width:${clamp((day.water / state.profile.waterGoal) * 100)}%"></i></div>
            <small>Tap to add 250 mL</small>
          </button>
          <article class="metric-card">
            <div class="metric-icon orange">${icon('flame_fill')}</div>
            <div class="metric-value">${formatNumber(day.steps)}</div>
            <div class="metric-label">Steps</div>
            <div class="mini-progress orange"><i style="width:${clamp((day.steps / 10000) * 100)}%"></i></div>
            <small>${Math.max(0, 10000 - day.steps).toLocaleString()} to goal</small>
          </article>
          <article class="metric-card">
            <div class="metric-icon indigo">${icon('moon_fill')}</div>
            <div class="metric-value">${day.sleep || '–'}<span> hr</span></div>
            <div class="metric-label">Sleep</div>
            <div class="mini-progress indigo"><i style="width:${clamp(((day.sleep || 0) / 8) * 100)}%"></i></div>
            <small>${day.sleep >= 7 ? 'Within your range' : 'Aim for 7–9 hours'}</small>
          </article>
          <button type="button" class="metric-card js-open-vitals" aria-label="Log blood pressure and vitals">
            <div class="metric-icon red">${icon('waveform_path_ecg')}</div>
            <div class="metric-value">${vitals.systolic || '–'}${vitals.diastolic ? `<span>/${vitals.diastolic}</span>` : ''}</div>
            <div class="metric-label">Blood pressure</div>
            <div class="vital-meta">${vitals.heartRate ? `${vitals.heartRate} bpm` : 'No reading'}</div>
            <small>Tap to log vitals</small>
          </button>
        </div>
      </section>

      <section aria-labelledby="nutrient-heading">
        <div class="section-heading"><h2 id="nutrient-heading">Key nutrients</h2><button class="text-button js-go-diary" type="button">See all</button></div>
        <div class="nutrient-card">
          <div class="nutrient-row"><div><span>Protein</span><small>${formatNumber(protein)} of ${state.profile.proteinGoal} g</small></div><div class="nutrient-track"><i class="purple" style="width:${clamp((protein / state.profile.proteinGoal) * 100)}%"></i></div></div>
          <div class="nutrient-row"><div><span>Fibre</span><small>${formatNumber(fibre)} of ${state.profile.fibreGoal} g</small></div><div class="nutrient-track"><i class="green" style="width:${clamp((fibre / state.profile.fibreGoal) * 100)}%"></i></div></div>
          <div class="nutrient-row"><div><span>Sodium</span><small>${formatNumber(sodium)} of ${state.profile.sodiumGoal} mg · ${sodiumStatus}</small></div><div class="nutrient-track"><i class="orange" style="width:${clamp((sodium / state.profile.sodiumGoal) * 100)}%"></i></div></div>
        </div>
      </section>

      <button class="primary-action js-open-food" type="button">${icon('plus_circle_fill')} Log food</button>
    </div>`;
}

function mealSection(meal) {
  const entries = getDay().entries.filter(entry => entry.meal === meal);
  const calories = entries.reduce((sum, entry) => sum + entry.calories * entry.servings, 0);
  return `
    <section class="meal-section" aria-labelledby="${meal.toLowerCase()}-heading">
      <div class="meal-heading"><h2 id="${meal.toLowerCase()}-heading">${meal}</h2><span>${formatNumber(calories)} kcal</span></div>
      <div class="meal-list">
        ${entries.length ? entries.map(entry => `
          <button class="food-row js-food-detail" type="button" data-entry-id="${entry.entryId}">
            <span class="food-glyph">${icon(meal === 'Breakfast' ? 'sun_max_fill' : meal === 'Lunch' ? 'leaf_arrow_circlepath' : meal === 'Dinner' ? 'moon_stars_fill' : 'sparkles')}</span>
            <span class="food-copy"><strong>${entry.name}</strong><small>${entry.servings === 1 ? entry.detail : `${entry.servings} servings`}</small></span>
            <span class="food-energy">${formatNumber(entry.calories * entry.servings)}<small>kcal</small></span>
            ${icon('chevron_right', 'chevron')}
          </button>`).join('') : `<button class="empty-meal js-open-food" data-meal="${meal}" type="button">${icon('plus_circle')} Add ${meal.toLowerCase()}</button>`}
      </div>
    </section>`;
}

function renderDiary() {
  const calories = sumNutrient('calories');
  const protein = sumNutrient('protein');
  const carbs = sumNutrient('carbs');
  const fat = sumNutrient('fat');
  const fibre = sumNutrient('fibre');
  const sodium = sumNutrient('sodium');
  const sugar = sumNutrient('sugar');

  document.querySelector('#tab-diary').innerHTML = `
    <div class="app-content diary-content">
      ${pageHeader('Diary', 'Nutrition log', `<button class="round-add js-open-food" type="button" aria-label="Log food">${icon('plus')}</button>`)}
      ${dateControl()}
      <section class="macro-summary" aria-label="Macronutrient summary">
        <div>${ring(calories, state.profile.calorieGoal, '#ff375f', 'Calories', 'kcal', 'small')}</div>
        <div>${ring(protein, state.profile.proteinGoal, '#af52de', 'Protein', 'g', 'small')}</div>
        <div>${ring(carbs, state.profile.carbsGoal, '#32ade6', 'Carbs', 'g', 'small')}</div>
        <div>${ring(fat, state.profile.fatGoal, '#ff9f0a', 'Fat', 'g', 'small')}</div>
      </section>
      ${['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(mealSection).join('')}
      <section class="details-section" aria-labelledby="details-heading">
        <div class="section-heading"><h2 id="details-heading">Nutrition details</h2></div>
        <div class="detail-list">
          <div><span>Fibre</span><span><strong>${formatNumber(fibre)}</strong> / ${state.profile.fibreGoal} g</span></div>
          <div><span>Sugar</span><span><strong>${formatNumber(sugar)}</strong> g</span></div>
          <div><span>Sodium</span><span><strong>${formatNumber(sodium)}</strong> / ${state.profile.sodiumGoal} mg</span></div>
        </div>
      </section>
    </div>`;
}

function chartPath(values, width = 560, height = 170, inset = 12) {
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = inset + index * ((width - inset * 2) / (values.length - 1));
    const y = inset + (max - value) * ((height - inset * 2) / range);
    return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function renderInsights() {
  const weight = state.weightHistory;
  const calories = [...state.calorieHistory];
  if (state.selectedDate === todayKey) calories[calories.length - 1] = sumNutrient('calories');
  const avgCalories = calories.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, calories.length - 1);
  const weightChange = weight[weight.length - 1] - weight[0];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString('en-CA', { weekday: 'narrow' });
  });
  document.querySelector('#tab-insights').innerHTML = `
    <div class="app-content insights-content">
      ${pageHeader('Trends', 'Last 7 days', `<button class="avatar-button js-open-settings" type="button" aria-label="Open settings">D</button>`)}
      <div class="period-control" role="group" aria-label="Trend period"><button class="active" type="button">Week</button><button type="button">Month</button><button type="button">6 Months</button></div>
      <section class="chart-card" aria-labelledby="weight-heading">
        <div class="chart-header"><div><span class="card-kicker">Body</span><h2 id="weight-heading">Weight</h2></div><div class="chart-stat"><strong>${weight.at(-1).toFixed(1)}</strong><span>lb</span></div></div>
        <div class="change-pill ${weightChange <= 0 ? 'positive' : ''}">${icon(weightChange <= 0 ? 'arrow_down_right' : 'arrow_up_right')} ${Math.abs(weightChange).toFixed(1)} lb this week</div>
        <svg class="line-chart" viewBox="0 0 560 170" role="img" aria-label="Weight trend from ${weight[0]} to ${weight.at(-1)} pounds">
          <defs><linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff375f" stop-opacity=".28"/><stop offset="1" stop-color="#ff375f" stop-opacity="0"/></linearGradient></defs>
          <path class="chart-area" d="${chartPath(weight)} L 548 170 L 12 170 Z" fill="url(#weightFill)"/>
          <path class="chart-line weight-line" d="${chartPath(weight)}"/>
          ${weight.map((value, i) => `<circle cx="${12 + i * (536 / 6)}" cy="${12 + (Math.max(...weight) * 1.02 - value) * (146 / ((Math.max(...weight) * 1.02) - (Math.min(...weight) * .98)))}" r="4"/>`).join('')}
        </svg>
        <div class="chart-labels">${weekDays.map(day => `<span>${day}</span>`).join('')}</div>
      </section>
      <section class="chart-card" aria-labelledby="calorie-heading">
        <div class="chart-header"><div><span class="card-kicker">Nutrition</span><h2 id="calorie-heading">Calories</h2></div><div class="chart-stat"><strong>${formatNumber(avgCalories)}</strong><span>daily avg</span></div></div>
        <div class="bar-chart" role="img" aria-label="Daily calorie intake over the last week">
          ${calories.map((value, i) => `<div class="bar-column"><i style="height:${clamp((value / 2600) * 100, 8, 100)}%" class="${i === calories.length - 1 ? 'today' : ''}"></i><span>${weekDays[i]}</span></div>`).join('')}
          <div class="goal-line" style="bottom:${clamp((state.profile.calorieGoal / 2600) * 100, 0, 100)}%"><span>Goal</span></div>
        </div>
      </section>
      <section aria-labelledby="consistency-heading">
        <div class="section-heading"><h2 id="consistency-heading">Consistency</h2></div>
        <div class="consistency-list">
          <div><span class="consistency-icon red">${icon('flame_fill')}</span><span><strong>6 day streak</strong><small>Nutrition logging</small></span><b>86%</b></div>
          <div><span class="consistency-icon blue">${icon('drop_fill')}</span><span><strong>5 of 7 days</strong><small>Water goal</small></span><b>71%</b></div>
          <div><span class="consistency-icon green">${icon('leaf_arrow_circlepath')}</span><span><strong>4 of 7 days</strong><small>Fibre goal</small></span><b>57%</b></div>
        </div>
      </section>
    </div>`;
}

function renderAll() {
  renderSummary();
  renderDiary();
  renderInsights();
  bindRenderedEvents();
}

function changeDate(offset) {
  const date = new Date(`${state.selectedDate}T12:00:00`);
  date.setDate(date.getDate() + offset);
  const key = date.toISOString().slice(0, 10);
  if (key <= todayKey) { state.selectedDate = key; saveState(); renderAll(); }
}

function openFood(meal) {
  selectedFoodId = foods[0].id;
  document.querySelector('#food-search-input').value = '';
  document.querySelector('#servings-input').value = '1';
  document.querySelector('#meal-select').value = meal || foods[0].meal;
  renderFoodResults();
  foodSheet.open();
}

function renderFoodResults(query = '') {
  const filtered = foods.filter(food => food.name.toLowerCase().includes(query.trim().toLowerCase()));
  document.querySelector('#food-results').innerHTML = filtered.length ? filtered.map(food => `
    <button type="button" class="food-result ${selectedFoodId === food.id ? 'selected' : ''}" data-food-id="${food.id}">
      <span>${icon(selectedFoodId === food.id ? 'checkmark_circle_fill' : 'circle')}</span>
      <span><strong>${food.name}</strong><small>${food.detail} · ${food.calories} kcal</small></span>
    </button>`).join('') : `<div class="empty-search">No foods found</div>`;
  document.querySelectorAll('.food-result').forEach(button => button.addEventListener('click', () => {
    selectedFoodId = button.dataset.foodId;
    const selected = foods.find(food => food.id === selectedFoodId);
    document.querySelector('#meal-select').value = selected.meal;
    renderFoodResults(document.querySelector('#food-search-input').value);
  }));
}

function openVitals() {
  const vitals = getDay().vitals || {};
  document.querySelector('#systolic-input').value = vitals.systolic || '';
  document.querySelector('#diastolic-input').value = vitals.diastolic || '';
  document.querySelector('#heart-rate-input').value = vitals.heartRate || '';
  document.querySelector('#weight-input').value = vitals.weight || '';
  vitalsSheet.open();
}

function openSettings() {
  document.querySelector('#goal-calories').value = state.profile.calorieGoal;
  document.querySelector('#goal-protein').value = state.profile.proteinGoal;
  document.querySelector('#goal-fibre').value = state.profile.fibreGoal;
  document.querySelector('#goal-sodium').value = state.profile.sodiumGoal;
  document.querySelector('#goal-water').value = state.profile.waterGoal;
  settingsSheet.open();
}

function bindRenderedEvents() {
  document.querySelectorAll('.app-tab .js-open-food').forEach(button => button.addEventListener('click', () => openFood(button.dataset.meal)));
  document.querySelectorAll('.app-tab .js-open-vitals').forEach(button => button.addEventListener('click', openVitals));
  document.querySelectorAll('.app-tab .js-open-settings').forEach(button => button.addEventListener('click', openSettings));
  document.querySelectorAll('.js-date-previous').forEach(button => button.addEventListener('click', () => changeDate(-1)));
  document.querySelectorAll('.js-date-next').forEach(button => button.addEventListener('click', () => changeDate(1)));
  document.querySelectorAll('.js-date-input').forEach(input => input.addEventListener('change', event => { state.selectedDate = event.target.value; saveState(); renderAll(); }));
  document.querySelectorAll('.js-water-add').forEach(button => button.addEventListener('click', () => {
    getDay().water = Math.min(10000, getDay().water + 250); saveState(); renderAll();
    app.toast.create({ text: '250 mL of water added', closeTimeout: 1800, position: 'center' }).open();
  }));
  document.querySelectorAll('.js-go-diary').forEach(button => button.addEventListener('click', () => document.querySelector('a[href="#tab-diary"]').click()));
  document.querySelectorAll('.js-food-detail').forEach(button => button.addEventListener('click', () => {
    const entry = getDay().entries.find(item => item.entryId === button.dataset.entryId);
    app.actions.create({
      buttons: [
        [{ text: entry.name, label: true }, { text: `${entry.servings} serving · ${formatNumber(entry.calories * entry.servings)} kcal`, label: true }],
        [{ text: 'Remove from diary', color: 'red', onClick: () => { getDay().entries = getDay().entries.filter(item => item.entryId !== entry.entryId); saveState(); renderAll(); } }],
        [{ text: 'Cancel', bold: true }]
      ]
    }).open();
  }));
  document.querySelectorAll('.period-control button').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.period-control button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
  }));
}

document.querySelector('.tab-add-button').addEventListener('click', () => openFood());
document.querySelector('.floating-tabbar .js-open-settings').addEventListener('click', openSettings);
document.querySelector('#food-search-input').addEventListener('input', event => renderFoodResults(event.target.value));
document.querySelector('.js-serving-minus').addEventListener('click', () => {
  const input = document.querySelector('#servings-input'); input.value = Math.max(.25, Number(input.value || 1) - .25);
});
document.querySelector('.js-serving-plus').addEventListener('click', () => {
  const input = document.querySelector('#servings-input'); input.value = Math.min(20, Number(input.value || 1) + .25);
});
document.querySelector('.js-save-food').addEventListener('click', () => {
  const food = foods.find(item => item.id === selectedFoodId);
  const servings = clamp(Number(document.querySelector('#servings-input').value) || 1, .25, 20);
  const meal = document.querySelector('#meal-select').value;
  getDay().entries.push({ ...food, meal, servings, entryId: `${Date.now()}-${Math.random().toString(16).slice(2)}` });
  saveState(); foodSheet.close(); renderAll();
  app.toast.create({ text: `${food.name} added`, closeTimeout: 1800, position: 'center' }).open();
});
document.querySelector('.js-save-vitals').addEventListener('click', () => {
  const current = getDay().vitals || {};
  const value = id => Number(document.querySelector(id).value) || undefined;
  getDay().vitals = { ...current, systolic: value('#systolic-input'), diastolic: value('#diastolic-input'), heartRate: value('#heart-rate-input'), weight: value('#weight-input') };
  if (getDay().vitals.weight && state.selectedDate === todayKey) state.weightHistory[state.weightHistory.length - 1] = getDay().vitals.weight;
  saveState(); vitalsSheet.close(); renderAll();
});
document.querySelector('.js-save-settings').addEventListener('click', () => {
  const positive = (id, fallback) => Math.max(1, Number(document.querySelector(id).value) || fallback);
  state.profile.calorieGoal = positive('#goal-calories', state.profile.calorieGoal);
  state.profile.proteinGoal = positive('#goal-protein', state.profile.proteinGoal);
  state.profile.fibreGoal = positive('#goal-fibre', state.profile.fibreGoal);
  state.profile.sodiumGoal = positive('#goal-sodium', state.profile.sodiumGoal);
  state.profile.waterGoal = positive('#goal-water', state.profile.waterGoal);
  saveState(); settingsSheet.close(); renderAll();
});
document.querySelector('.js-reset-data').addEventListener('click', () => {
  app.dialog.confirm('This removes every logged entry and restores the sample dashboard.', 'Reset Health?', () => {
    state = structuredClone(defaultState); saveState(); settingsSheet.close(); renderAll();
  });
});
renderAll();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
