import { defineComponent } from '../framework/framework.js';
import { backHeader, goalRows, goalsFromForm } from './shared.js';

export const Goals = defineComponent({
  render({ store }) {
    const goals = store.state.goals;
    return `${backHeader('Nutrition Goals', 'Settings')}<div class="ios-scroll"><div class="ios-content health-form-content">
      <h1 class="ios-large-title">Nutrition Goals</h1>
      <form data-goals-form><section class="ios-section"><div class="ios-section__header">Daily goals and limits</div><div class="ios-card health-goal-list">${goalRows(goals, store.state.goalConfig)}</div><div class="ios-section__footer">Choose what matters to you. A registered dietitian can help set goals for your individual needs.</div></section>
      <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"><span data-ios-symbol="check"></span>Save Goals</button></section></form>
    </div></div>`;
  },
  events: {
    'submit [data-goals-form]': (event, { app, router }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      const values = goalsFromForm(form);
      if (!Object.values(values.goalConfig).some(goal => goal.enabled)) {
        app.toast.show('Choose at least one goal or limit');
        return;
      }
      app.store.dispatch('setGoals', values);
      app.toast.show('Nutrition goals updated');
      router.back();
    }
  }
});
