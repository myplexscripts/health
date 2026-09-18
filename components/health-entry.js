import { defineComponent } from '../framework/framework.js?v=1.3.0';
import {
  backHeader, field, formDataObject, localDateTimeValue, makeId, numberValue, selectField, textField, toISODate
} from './shared.js?v=1.3.0';

function readingFields(type) {
  if (type === 'weight') return field('Weight', 'weight', { unit: 'kg', required: true, max: 500, step: '0.1' });
  if (type === 'glucose') return `${field('Blood glucose', 'glucose', { unit: 'mmol/L', required: true, max: 50, step: '0.1' })}${selectField('Timing', 'timing', [['fasting', 'Fasting'], ['before-meal', 'Before meal'], ['after-meal', 'After meal'], ['other', 'Other']], 'fasting')}`;
  if (type === 'heart-rate') return `${field('Heart rate', 'heartRate', { unit: 'bpm', required: true, min: 20, max: 250, step: '1' })}${selectField('Context', 'context', [['resting', 'Resting'], ['walking', 'Walking'], ['exercise', 'Exercise'], ['recovery', 'Recovery'], ['other', 'Other']], 'resting')}`;
  return `<div class="health-form-grid health-form-grid--three">
    ${field('Systolic', 'systolic', { unit: 'mmHg', required: true, min: 40, max: 300, step: '1' })}
    ${field('Diastolic', 'diastolic', { unit: 'mmHg', required: true, min: 30, max: 200, step: '1' })}
    ${field('Pulse', 'pulse', { unit: 'bpm', min: 20, max: 250, step: '1' })}
  </div>${selectField('Position', 'position', [['seated', 'Seated'], ['standing', 'Standing'], ['lying', 'Lying down']], 'seated')}`;
}

export const HealthEntry = defineComponent({
  state: ({ query, store }) => {
    const type = ['blood-pressure', 'heart-rate', 'weight', 'glucose'].includes(query?.type) ? query.type : 'blood-pressure';
    return { type, saving: false, showGuide: ['blood-pressure', 'heart-rate'].includes(type) && !store.state.preferences.cardioGuideSeen };
  },

  render({ state }) {
    if (state.showGuide) return `
      ${backHeader('Measurement Tips', 'Summary')}
      <div class="ios-scroll"><div class="ios-content health-form-content health-guide-content">
        <div class="health-guide-mark"><span data-ios-symbol="heartPulse"></span></div>
        <h1 class="ios-large-title">Take a More Accurate Measurement</h1>
        <p class="health-onboarding-lead">A few consistent habits can make your blood pressure and resting heart rate logs more useful.</p>
        <ol class="health-guide-list">
          <li><span>1</span><div><h2>Avoid stimulants and exercise</h2><p>Avoid tobacco and caffeine for one hour, and exercise for 30 minutes, before measuring.</p></div></li>
          <li><span>2</span><div><h2>Rest first</h2><p>Sit quietly and relax for at least five minutes before taking a reading.</p></div></li>
          <li><span>3</span><div><h2>Position yourself well</h2><p>Keep your back supported, feet flat, and arm supported at heart level. Put a blood pressure cuff on bare skin and use the same arm each time.</p></div></li>
        </ol>
        <div class="ios-section__footer">These tips support more consistent logging. Follow the instructions supplied with your device and contact a health professional about concerning readings or symptoms.</div>
        <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="button" data-continue-to-reading>Continue</button></section>
      </div></div>`;
    return `
      ${backHeader('Add Health Data', 'Summary')}
      <div class="ios-scroll"><div class="ios-content health-form-content">
        <h1 class="ios-large-title">Add Health Data</h1>
        <form data-health-form>
          <section class="ios-section"><div class="ios-segmented health-reading-types" data-ios-segmented aria-label="Reading type">
            <button type="button" data-reading-type="blood-pressure" aria-selected="${state.type === 'blood-pressure'}">Blood Pressure</button>
            <button type="button" data-reading-type="heart-rate" aria-selected="${state.type === 'heart-rate'}">Heart Rate</button>
            <button type="button" data-reading-type="weight" aria-selected="${state.type === 'weight'}">Weight</button>
            <button type="button" data-reading-type="glucose" aria-selected="${state.type === 'glucose'}">Glucose</button>
          </div></section>
          <section class="ios-section"><div class="ios-section__header">Reading</div><div class="ios-card ios-form-group">
            <input type="hidden" name="readingType" value="${state.type}">${readingFields(state.type)}
            ${textField('Date and time', 'datetime', { type: 'datetime-local', value: localDateTimeValue(), required: true })}
            <label class="ios-field"><span class="ios-field__label">Notes</span><textarea class="ios-text-view" name="notes" placeholder="Optional context, such as before medication"></textarea></label>
          </div>${['blood-pressure', 'heart-rate'].includes(state.type) ? '<div class="ios-section__footer health-form-footer">Record measurements as shown on your device. Health only describes changes over time and does not diagnose a condition. <button class="ios-button ios-button--plain" type="button" data-show-measurement-guide>View measurement tips</button></div>' : ''}</section>
          <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"${state.saving ? ' disabled' : ''}><span data-ios-symbol="check"></span>${state.saving ? 'Saving…' : 'Save Reading'}</button></section>
        </form>
      </div></div>`;
  },

  events: {
    'click [data-continue-to-reading]': (event, { app, setState }) => { event.preventDefault(); app.store.dispatch('setPreferences', { cardioGuideSeen: true }); setState({ showGuide: false }); },
    'click [data-show-measurement-guide]': (event, { setState }) => { event.preventDefault(); setState({ showGuide: true }); },
    'click [data-reading-type]': (event, { target, setState }) => { event.preventDefault(); setState({ type: target.dataset.readingType }); },
    'submit [data-health-form]': async (event, { app, router, state, setState }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      const values = formDataObject(form);
      await setState({ saving: true });
      const entry = { id: makeId('health'), type: 'health', readingType: state.type, datetime: toISODate(values.datetime), notes: values.notes.trim() };
      if (state.type === 'blood-pressure') Object.assign(entry, { systolic: numberValue(values.systolic), diastolic: numberValue(values.diastolic), pulse: numberValue(values.pulse), position: values.position });
      if (state.type === 'heart-rate') Object.assign(entry, { heartRate: numberValue(values.heartRate), context: values.context });
      if (state.type === 'weight') entry.weight = numberValue(values.weight);
      if (state.type === 'glucose') Object.assign(entry, { glucose: numberValue(values.glucose), timing: values.timing });
      app.store.dispatch('addEntry', entry);
      if (state.type === 'blood-pressure' || state.type === 'heart-rate') app.store.dispatch('setPreferences', { cardioGuideSeen: true });
      app.toast.show('Health reading saved');
      router.back();
    }
  }
});
