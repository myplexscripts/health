import { defineComponent } from '../framework/framework.js';
import { escapeHTML, goalRows, goalsFromForm } from './shared.js';

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
      <p class="health-onboarding-lead">Choose any goals or limits. You can change all of these later in Settings.</p>
      <form data-onboarding-goals>
        <div class="ios-card health-goal-list">${goalRows(store.state.goals, store.state.goalConfig)}</div>
        <div class="ios-section__footer">Goals help describe your log and are not medical advice.</div>
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
    'submit [data-onboarding-goals]': (event, { app, router, state }) => {
      event.preventDefault();
      const values = goalsFromForm(event.target);
      if (!Object.values(values.goalConfig).some(goal => goal.enabled)) {
        app.toast.show('Choose at least one goal or limit');
        return;
      }
      app.store.dispatch('completeOnboarding', { name: state.name, ...values });
      app.toast.show(`Welcome, ${state.name}`);
      router.navigate('/today', { direction: 'back', replace: true });
    }
  }
});
