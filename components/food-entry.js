import { defineComponent } from '../framework/framework.js';
import {
  backHeader, field, formDataObject, localDateTimeValue, makeId, numberValue, selectField, textField, toISODate
} from './shared.js?v=1.1.2';

function nutritionFields(values = {}) {
  return `<div class="health-form-grid">
    ${field('Calories', 'calories', { value: values.calories ?? '', unit: 'kcal', required: true, max: 10000 })}
    ${field('Protein', 'protein', { value: values.protein ?? '', unit: 'g', max: 1000 })}
    ${field('Carbohydrates', 'carbs', { value: values.carbs ?? '', unit: 'g', max: 1000 })}
    ${field('Fat', 'fat', { value: values.fat ?? '', unit: 'g', max: 1000 })}
    ${field('Fibre', 'fibre', { value: values.fibre ?? '', unit: 'g', max: 500 })}
    ${field('Sugars', 'sugars', { value: values.sugars ?? '', unit: 'g', max: 1000 })}
    ${field('Sodium', 'sodium', { value: values.sodium ?? '', unit: 'mg', max: 50000 })}
    ${field('Vitamin D', 'vitaminD', { value: values.vitaminD ?? '', unit: 'mcg', max: 1000 })}
  </div>`;
}

export const FoodEntry = defineComponent({
  state: ({ query, route }) => ({
    initial: query?.source === 'scan' ? route?.state?.scannedNutrition || {} : {},
    saving: false
  }),

  render({ state }) {
    const values = state.initial;
    return `
      ${backHeader(values.source === 'scan' ? 'Review Nutrition' : 'Add Food', 'Today')}
      <div class="ios-scroll"><div class="ios-content health-form-content">
        <h1 class="ios-large-title">${values.source === 'scan' ? 'Review Label' : 'Add Food'}</h1>
        ${values.source === 'scan' ? `<div class="ios-inline-message health-inline-message" role="status">
          <span class="health-inline-icon" style="background:var(--ios-blue)"><span data-ios-symbol="scanLine"></span></span>
          <div class="ios-inline-message__body"><div class="ios-inline-message__title">Check the scanned values</div><div class="ios-inline-message__text">Label recognition can make mistakes. Compare each value with the package before saving.</div></div>
        </div>` : ''}
        <form data-food-form>
          <section class="ios-section"><div class="ios-section__header">Food</div><div class="ios-card ios-form-group">
            ${textField('Name', 'name', { value: values.name || '', placeholder: 'Food or drink', required: true })}
            ${textField('Serving', 'serving', { value: values.serving || '', placeholder: 'e.g. 1 cup or 45 g', required: true })}
            ${selectField('Meal', 'meal', [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack']], values.meal || 'snack')}
            ${textField('Date and time', 'datetime', { type: 'datetime-local', value: values.datetime || localDateTimeValue(), required: true })}
          </div></section>
          <section class="ios-section"><div class="ios-section__header">Nutrition per serving</div><div class="ios-card ios-form-group">${nutritionFields(values)}</div>
            <div class="ios-section__footer">Enter the amount for the serving you ate. You can change your daily goals in Settings.</div>
          </section>
          <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"${state.saving ? ' disabled' : ''}><span data-ios-symbol="check"></span>${state.saving ? 'Saving…' : 'Add to Log'}</button></section>
        </form>
      </div></div>`;
  },

  events: {
    'submit [data-food-form]': async (event, { app, router, setState }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      const values = formDataObject(form);
      await setState({ saving: true });
      const entry = {
        id: makeId('food'), type: 'food', name: values.name.trim(), serving: values.serving.trim(), meal: values.meal,
        datetime: toISODate(values.datetime), calories: numberValue(values.calories), protein: numberValue(values.protein),
        carbs: numberValue(values.carbs), fat: numberValue(values.fat), fibre: numberValue(values.fibre),
        sugars: numberValue(values.sugars), sodium: numberValue(values.sodium), vitaminD: numberValue(values.vitaminD)
      };
      app.store.dispatch('addEntry', entry);
      app.toast.show(`${entry.name} added to your log`);
      router.back();
    }
  }
});
