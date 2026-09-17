import { defineComponent } from '../framework/framework.js';
import { backHeader, escapeHTML, formatDateTime } from './shared.js?v=1.1.2';

function metric(label, value, unit = '') {
  return `<div class="health-detail-metric"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}${unit ? `<small>${escapeHTML(unit)}</small>` : ''}</strong></div>`;
}

function titleFor(entry) {
  if (entry.type === 'food') return entry.name;
  if (entry.readingType === 'blood-pressure') return 'Blood Pressure';
  if (entry.readingType === 'weight') return 'Weight';
  return 'Blood Glucose';
}

export const EntryDetail = defineComponent({
  render({ params, store }) {
    const entry = store.state.entries.find(item => item.id === params.id);
    if (!entry) return `${backHeader('Entry', 'Log')}<div class="ios-scroll"><div class="ios-content"><div class="ios-content-unavailable"><div><div class="ios-content-unavailable__icon"><span data-ios-symbol="circleAlert"></span></div><div class="ios-content-unavailable__title">Entry Not Found</div><div class="ios-content-unavailable__description">It may have already been deleted.</div></div></div></div></div>`;
    const title = titleFor(entry);
    return `
      ${backHeader(title, 'Log')}
      <div class="ios-scroll"><div class="ios-content health-form-content">
        <h1 class="ios-large-title">${escapeHTML(title)}</h1>
        <p class="health-detail-date">${escapeHTML(formatDateTime(entry.datetime))}</p>
        ${entry.type === 'food' ? `
          <section class="ios-section"><article class="ios-card health-entry-hero"><div class="health-entry-hero__icon health-icon--food"><span data-ios-symbol="utensils"></span></div><div><div class="ios-headline">${escapeHTML(entry.serving)}</div><div class="ios-subheadline ios-secondary">${escapeHTML(entry.meal[0].toUpperCase() + entry.meal.slice(1))}</div></div><strong>${Math.round(entry.calories)}<small>kcal</small></strong></article></section>
          <section class="ios-section"><div class="ios-section__header">Nutrition</div><article class="ios-card health-detail-grid">${metric('Protein', entry.protein, 'g')}${metric('Carbohydrates', entry.carbs, 'g')}${metric('Fat', entry.fat, 'g')}${metric('Fibre', entry.fibre, 'g')}${metric('Sugars', entry.sugars, 'g')}${metric('Sodium', entry.sodium, 'mg')}${metric('Vitamin D', entry.vitaminD || 0, 'mcg')}</article></section>` : `
          <section class="ios-section"><article class="ios-card health-detail-grid health-detail-grid--health">
            ${entry.readingType === 'blood-pressure' ? `${metric('Systolic', entry.systolic, 'mmHg')}${metric('Diastolic', entry.diastolic, 'mmHg')}${metric('Pulse', entry.pulse || 'Not recorded', entry.pulse ? 'bpm' : '')}${metric('Position', entry.position || 'Not recorded')}` : ''}
            ${entry.readingType === 'weight' ? metric('Weight', entry.weight, 'kg') : ''}
            ${entry.readingType === 'glucose' ? `${metric('Blood glucose', entry.glucose, 'mmol/L')}${metric('Timing', (entry.timing || 'other').replace('-', ' '))}` : ''}
          </article>${entry.notes ? `<article class="ios-card health-notes"><div class="ios-headline">Notes</div><p>${escapeHTML(entry.notes)}</p></article>` : ''}</section>`}
        <section class="ios-section"><button class="ios-button ios-button--destructive ios-button--block" type="button" data-delete-entry><span data-ios-symbol="trash"></span>Delete Entry</button></section>
      </div></div>`;
  },

  events: {
    'click [data-delete-entry]': async (event, { app, params, router }) => {
      event.preventDefault();
      const confirmed = await app.dialog.confirm('This entry will be permanently removed from your log.', { title: 'Delete Entry?', okText: 'Delete', destructive: true });
      if (!confirmed) return;
      app.store.dispatch('deleteEntry', params.id);
      app.toast.show('Entry deleted');
      router.back();
    }
  }
});
