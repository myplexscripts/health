import { defineComponent } from '../framework/framework.js?v=1.3.1';
import { backHeader, goalRows, goalsFromForm } from './shared.js?v=1.3.1';

export const Goals = defineComponent({
  render({ store }) {
    const goals = store.state.goals;
    return `${backHeader('Nutrition Goals', 'Settings')}<div class="ios-scroll"><div class="ios-content health-form-content">
      <h1 class="ios-large-title">Nutrition Goals</h1>
      <p class="health-form-intro">Choose any nutrition category, then set a goal, limit, or track-only view.</p>
      <form data-goals-form><section class="ios-section"><div class="ios-section__header">All Nutrition Categories</div><label class="ios-search-field health-goal-search"><span data-ios-symbol="search"></span><input type="search" placeholder="Find a nutrient" autocomplete="off" aria-label="Find a nutrient" data-goal-search><button class="ios-search-field__clear" type="button" data-ios-clear aria-label="Clear search"><span data-ios-symbol="xmark"></span></button></label><div class="ios-card health-goal-list">${goalRows(goals, store.state.goalConfig)}</div><div class="ios-section__footer">General starter targets are only a starting point, not medical advice. A registered dietitian can help personalize them.</div></section>
      <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"><span data-ios-symbol="check"></span>Save Goals</button></section></form>
    </div></div>`;
  },
  events: {
    'input [data-goal-search]': (event, { host }) => {
      const query = event.target.value.trim().toLowerCase();
      host.querySelectorAll('[data-goal-label]').forEach(row => { row.hidden = Boolean(query) && !row.dataset.goalLabel.includes(query); });
    },
    'submit [data-goals-form]': (event, { app, router }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      const values = goalsFromForm(form);
      app.store.dispatch('setGoals', values);
      app.toast.show('Nutrition goals updated');
      router.back();
    }
  }
});
