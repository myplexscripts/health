import { defineComponent } from '../framework/framework.js?v=1.3.1';
import { escapeHTML, goalRows, goalsFromForm } from './shared.js?v=1.3.1';

export const Onboarding = defineComponent({
  state: ({ store }) => ({ step: 1, name: store.state.profile?.name || '' }),

  render({ state, store }) {
    if (state.step === 1) {
      return `<div class="ios-scroll health-onboarding-scroll"><div class="ios-content health-onboarding-content">
        <div class="health-onboarding-mark" aria-hidden="true"><span data-ios-symbol="heartPulse"></span></div>
        <p class="health-onboarding-step">Step 1 of 2</p>
        <h1 class="ios-large-title">Welcome to Health</h1>
        <p class="health-onboarding-lead">Understand your nutrition and health patterns, one useful entry at a time.</p>
        <form data-onboarding-name>
          <label class="ios-field"><span class="ios-field__label">What should we call you?</span><span class="ios-text-field"><input type="text" name="name" value="${escapeHTML(state.name)}" placeholder="Your name" autocomplete="given-name" maxlength="40" required autofocus></span></label>
          <button class="ios-button ios-button--prominent ios-button--block health-onboarding-action" type="submit">Continue<span data-ios-symbol="arrowRight"></span></button>
        </form>
        <p class="health-onboarding-privacy"><span data-ios-symbol="lock"></span>Your profile and health log stay in this browser.</p>
      </div></div>`;
    }
    return `<div class="ios-scroll health-onboarding-scroll"><div class="ios-content health-onboarding-content health-onboarding-content--goals">
      <button class="ios-button ios-button--plain health-onboarding-back" type="button" data-onboarding-back><span data-ios-symbol="chevronLeft"></span>Back</button>
      <p class="health-onboarding-step">Step 2 of 2</p>
      <h1 class="ios-large-title">What matters to you?</h1>
      <p class="health-onboarding-lead">Choose what you want Health to keep in view. Every nutrition category is available, and you can change this later in Settings.</p>
      <form data-onboarding-goals>
        <section class="ios-section"><div class="ios-section__header">Heart</div><div class="ios-card health-goal-list health-tracking-list">
          <label class="health-goal-row health-goal-row--compact"><input type="checkbox" name="track_bloodPressure" ${store.state.tracking.bloodPressure ? 'checked' : ''}><span>Blood Pressure</span><span class="ios-switch"><span class="ios-switch__track"></span></span></label>
          <label class="health-goal-row health-goal-row--compact"><input type="checkbox" name="track_heartRate" ${store.state.tracking.heartRate ? 'checked' : ''}><span>Heart Rate</span><span class="ios-switch"><span class="ios-switch__track"></span></span></label>
        </div></section>
        <section class="ios-section"><div class="ios-section__header">Nutrition</div><label class="ios-search-field health-goal-search"><span data-ios-symbol="search"></span><input type="search" placeholder="Find a nutrient" autocomplete="off" aria-label="Find a nutrient" data-goal-search><button class="ios-search-field__clear" type="button" data-ios-clear aria-label="Clear search"><span data-ios-symbol="xmark"></span></button></label><div class="ios-card health-goal-list">${goalRows(store.state.goals, store.state.goalConfig, { compact: true })}</div></section>
        <div class="ios-section__footer">General starter targets are only a starting point, not medical advice. You can personalize goals and limits in Settings.</div>
        <button class="ios-button ios-button--prominent ios-button--block health-onboarding-action" type="submit"><span data-ios-symbol="check"></span>Start Tracking</button>
      </form>
    </div></div>`;
  },

  events: {
    'submit [data-onboarding-name]': (event, { setState }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      setState({ step: 2, name: new FormData(form).get('name').trim() });
    },
    'click [data-onboarding-back]': (event, { setState }) => {
      event.preventDefault();
      setState({ step: 1 });
    },
    'input [data-goal-search]': (event, { host }) => {
      const query = event.target.value.trim().toLowerCase();
      host.querySelectorAll('[data-goal-label]').forEach(row => { row.hidden = Boolean(query) && !row.dataset.goalLabel.includes(query); });
    },
    'submit [data-onboarding-goals]': (event, { app, router, state, store }) => {
      event.preventDefault();
      const values = goalsFromForm(event.target);
      const data = new FormData(event.target);
      const tracking = { bloodPressure: data.has('track_bloodPressure'), heartRate: data.has('track_heartRate'), weight: store.state.tracking.weight, glucose: store.state.tracking.glucose };
      if (!Object.values(values.goalConfig).some(goal => goal.enabled) && !tracking.bloodPressure && !tracking.heartRate) {
        app.toast.show('Choose at least one thing to track');
        return;
      }
      app.store.dispatch('completeOnboarding', { name: state.name, tracking, ...values });
      app.toast.show(`Welcome, ${state.name}`);
      router.navigate('/today', { direction: 'back', replace: true });
    }
  }
});
