import { defineComponent } from '../framework/framework.js';
import { backHeader, field, formDataObject, numberValue } from './shared.js';

export const Goals = defineComponent({
  render({ store }) {
    const goals = store.state.goals;
    return `${backHeader('Nutrition Goals', 'Settings')}<div class="ios-scroll"><div class="ios-content health-form-content">
      <h1 class="ios-large-title">Nutrition Goals</h1>
      <form data-goals-form><section class="ios-section"><div class="ios-section__header">Daily targets</div><div class="ios-card ios-form-group"><div class="health-form-grid">
        ${field('Energy', 'calories', { value: goals.calories, unit: 'kcal', required: true, max: 10000, step: '1' })}
        ${field('Protein', 'protein', { value: goals.protein, unit: 'g', required: true, max: 1000, step: '1' })}
        ${field('Carbohydrates', 'carbs', { value: goals.carbs, unit: 'g', required: true, max: 1000, step: '1' })}
        ${field('Fat', 'fat', { value: goals.fat, unit: 'g', required: true, max: 1000, step: '1' })}
        ${field('Fibre', 'fibre', { value: goals.fibre, unit: 'g', required: true, max: 500, step: '1' })}
        ${field('Sodium', 'sodium', { value: goals.sodium, unit: 'mg', required: true, max: 50000, step: '10' })}
      </div></div><div class="ios-section__footer">Use targets that suit you. A registered dietitian can help set goals for your individual needs.</div></section>
      <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"><span data-ios-symbol="check"></span>Save Goals</button></section></form>
    </div></div>`;
  },
  events: {
    'submit [data-goals-form]': (event, { app, router }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      const values = formDataObject(form);
      app.store.dispatch('setGoals', Object.fromEntries(Object.entries(values).map(([key, value]) => [key, numberValue(value)])));
      app.toast.show('Nutrition goals updated');
      router.back();
    }
  }
});
