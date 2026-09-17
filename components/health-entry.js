import { defineComponent } from '../framework/framework.js';
import {
  backHeader, field, formDataObject, localDateTimeValue, makeId, numberValue, selectField, textField, toISODate
} from './shared.js?v=1.1.2';

function readingFields(type) {
  if (type === 'weight') return field('Weight', 'weight', { unit: 'kg', required: true, max: 500, step: '0.1' });
  if (type === 'glucose') return `${field('Blood glucose', 'glucose', { unit: 'mmol/L', required: true, max: 50, step: '0.1' })}${selectField('Timing', 'timing', [['fasting', 'Fasting'], ['before-meal', 'Before meal'], ['after-meal', 'After meal'], ['other', 'Other']], 'fasting')}`;
  return `<div class="health-form-grid health-form-grid--three">
    ${field('Systolic', 'systolic', { unit: 'mmHg', required: true, min: 40, max: 300, step: '1' })}
    ${field('Diastolic', 'diastolic', { unit: 'mmHg', required: true, min: 30, max: 200, step: '1' })}
    ${field('Pulse', 'pulse', { unit: 'bpm', min: 20, max: 250, step: '1' })}
  </div>${selectField('Position', 'position', [['seated', 'Seated'], ['standing', 'Standing'], ['lying', 'Lying down']], 'seated')}`;
}

export const HealthEntry = defineComponent({
  state: { type: 'blood-pressure', saving: false },

  render({ state }) {
    return `
      ${backHeader('Add Health Data', 'Today')}
      <div class="ios-scroll"><div class="ios-content health-form-content">
        <h1 class="ios-large-title">Add Health Data</h1>
        <form data-health-form>
          <section class="ios-section"><div class="ios-segmented health-reading-types" data-ios-segmented aria-label="Reading type">
            <button type="button" data-reading-type="blood-pressure" aria-selected="${state.type === 'blood-pressure'}">Blood Pressure</button>
            <button type="button" data-reading-type="weight" aria-selected="${state.type === 'weight'}">Weight</button>
            <button type="button" data-reading-type="glucose" aria-selected="${state.type === 'glucose'}">Glucose</button>
          </div></section>
          <section class="ios-section"><div class="ios-section__header">Reading</div><div class="ios-card ios-form-group">
            <input type="hidden" name="readingType" value="${state.type}">${readingFields(state.type)}
            ${textField('Date and time', 'datetime', { type: 'datetime-local', value: localDateTimeValue(), required: true })}
            <label class="ios-field"><span class="ios-field__label">Notes</span><textarea class="ios-text-view" name="notes" placeholder="Optional context, such as before medication"></textarea></label>
          </div>${state.type === 'blood-pressure' ? '<div class="ios-section__footer">Record measurements as shown on your monitor. Health only describes changes over time and does not diagnose a condition.</div>' : ''}</section>
          <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"${state.saving ? ' disabled' : ''}><span data-ios-symbol="check"></span>${state.saving ? 'Saving…' : 'Save Reading'}</button></section>
        </form>
      </div></div>`;
  },

  events: {
    'click [data-reading-type]': (event, { target, setState }) => { event.preventDefault(); setState({ type: target.dataset.readingType }); },
    'submit [data-health-form]': async (event, { app, router, state, setState }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      const values = formDataObject(form);
      await setState({ saving: true });
      const entry = { id: makeId('health'), type: 'health', readingType: state.type, datetime: toISODate(values.datetime), notes: values.notes.trim() };
      if (state.type === 'blood-pressure') Object.assign(entry, { systolic: numberValue(values.systolic), diastolic: numberValue(values.diastolic), pulse: numberValue(values.pulse), position: values.position });
      if (state.type === 'weight') entry.weight = numberValue(values.weight);
      if (state.type === 'glucose') Object.assign(entry, { glucose: numberValue(values.glucose), timing: values.timing });
      app.store.dispatch('addEntry', entry);
      app.toast.show('Health reading saved');
      router.back();
    }
  }
});
