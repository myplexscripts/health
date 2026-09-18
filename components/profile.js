import { defineComponent } from '../framework/framework.js?v=1.3.1';
import { backHeader, escapeHTML } from './shared.js?v=1.3.1';

export const Profile = defineComponent({
  render({ store }) {
    return `${backHeader('Profile', 'Settings')}<div class="ios-scroll"><div class="ios-content health-form-content">
      <h1 class="ios-large-title">Your Profile</h1>
      <form data-profile-form>
        <section class="ios-section"><div class="ios-section__header">Name</div><div class="ios-card ios-form-group">
          <label class="ios-field"><span class="ios-field__label">What should we call you?</span><span class="ios-text-field"><input type="text" name="name" value="${escapeHTML(store.state.profile?.name || '')}" placeholder="Your name" autocomplete="given-name" maxlength="40" required></span></label>
        </div><div class="ios-section__footer">Your name is used only to personalize Health on this device.</div></section>
        <section class="ios-section health-sticky-action"><button class="ios-button ios-button--prominent ios-button--block" type="submit"><span data-ios-symbol="check"></span>Save Profile</button></section>
      </form>
    </div></div>`;
  },
  events: {
    'submit [data-profile-form]': (event, { app, router }) => {
      event.preventDefault();
      const form = event.target;
      if (!form.reportValidity()) return;
      app.store.dispatch('setProfile', { name: new FormData(form).get('name').trim() });
      app.toast.show('Profile updated');
      router.back();
    }
  }
});
