import { defineComponent } from '../framework/framework.js';
import { backHeader } from './shared.js?v=1.2.0';

const choices = [
  ['bloodPressure', 'Blood Pressure'],
  ['heartRate', 'Heart Rate'],
  ['weight', 'Weight'],
  ['glucose', 'Blood Glucose']
];

export const Tracking = defineComponent({
  render({ store }) {
    return `${backHeader('Health Tracking', 'Settings')}<div class="ios-scroll"><div class="ios-content health-form-content">
      <h1 class="ios-large-title">Health Tracking</h1>
      <p class="health-form-intro">Choose the readings you want surfaced on Today. Every reading type remains available from Add Health Data.</p>
      <form data-tracking-form><section class="ios-section"><div class="ios-card health-goal-list health-tracking-list">
        ${choices.map(([key, label]) => `<label class="health-goal-row health-goal-row--compact"><input type="checkbox" name="${key}" ${store.state.tracking[key] ? 'checked' : ''}><span>${label}</span><span class="ios-switch"><span class="ios-switch__track"></span></span></label>`).join('')}
      </div></section>
      <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"><span data-ios-symbol="check"></span>Save Tracking</button></section></form>
    </div></div>`;
  },
  events: {
    'submit [data-tracking-form]': (event, { app, router }) => {
      event.preventDefault();
      const data = new FormData(event.target);
      app.store.dispatch('setTracking', Object.fromEntries(choices.map(([key]) => [key, data.has(key)])));
      app.toast.show('Health tracking updated');
      router.back();
    }
  }
});
