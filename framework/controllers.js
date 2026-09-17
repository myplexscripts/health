let presentationId = 0;

function nextId(prefix) {
  presentationId += 1;
  return `glasskit-${prefix}-${presentationId}`;
}

function appendContent(target, content) {
  if (content == null) return;
  if (typeof Node !== 'undefined' && content instanceof Node) target.append(content);
  else target.innerHTML = String(content);
}

function removeAfterDismiss(app, overlay, delay = 280) {
  app.dismiss(overlay);
  setTimeout(() => overlay.remove(), delay);
}

class GlassKitSheetInstance {
  constructor(app, options = {}) {
    this.app = app;
    this.options = options;
    this.id = options.id || nextId('sheet');
    this.overlay = document.createElement('div');
    this.overlay.className = 'ios-overlay';
    this.overlay.dataset.iosOverlay = this.id;
    this.overlay.hidden = true;

    const sheet = document.createElement('section');
    sheet.className = `ios-sheet${options.className ? ` ${options.className}` : ''}`;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');

    if (options.drag !== false) {
      const grabber = document.createElement('div');
      grabber.className = 'ios-sheet__grabber';
      grabber.dataset.iosSheetHandle = '';
      sheet.append(grabber);
      this.handle = grabber;
    }

    if (options.title || options.cancel || options.done) {
      const header = document.createElement('header');
      header.className = 'ios-sheet__header';
      const leading = document.createElement('div');
      leading.className = 'ios-sheet__leading';
      const trailing = document.createElement('div');
      trailing.className = 'ios-sheet__trailing';
      const title = document.createElement('div');
      title.className = 'ios-sheet__title';
      title.textContent = options.title || '';
      if (options.cancel !== false) {
        const button = document.createElement('button');
        button.className = 'ios-bar-button';
        button.type = 'button';
        button.textContent = typeof options.cancel === 'string' ? options.cancel : 'Cancel';
        button.addEventListener('click', () => this.close('cancel'));
        leading.append(button);
      }
      if (options.done) {
        const button = document.createElement('button');
        button.className = 'ios-bar-button ios-bar-button--accent';
        button.type = 'button';
        button.textContent = typeof options.done === 'string' ? options.done : 'Done';
        button.addEventListener('click', () => this.close('done'));
        trailing.append(button);
      }
      header.append(leading, title, trailing);
      sheet.append(header);
    }

    const body = document.createElement('div');
    body.className = 'ios-sheet__body';
    appendContent(body, options.content);
    sheet.append(body);
    this.body = body;
    this.sheet = sheet;
    this.overlay.append(sheet);
    document.body.append(this.overlay);

    this.overlay.addEventListener('click', event => {
      if (event.target === this.overlay && options.dismissible !== false) this.close('backdrop');
    });
    if (this.handle) this.app.bindSheetDrag?.(this.overlay, this.sheet, this.handle);
    this.app.enhance?.(this.overlay);
  }

  open() {
    this.app.lastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.app.present(this.id);
    this.options.onOpen?.(this);
    return this;
  }

  close(reason = 'programmatic') {
    if (!this.overlay.isConnected) return;
    this.app.dismiss(this.overlay);
    this.options.onClose?.(reason, this);
  }

  destroy() {
    if (this.app.openOverlay === this.overlay) this.app.dismiss(this.overlay);
    this.overlay.remove();
  }
}

export class GlassKitSheetController {
  constructor(app) { this.app = app; }
  create(options = {}) { return new GlassKitSheetInstance(this.app, options); }
  open(options = {}) { return this.create(options).open(); }
}

export class GlassKitDialogController {
  constructor(app) {
    this.app = app;
    this.queue = Promise.resolve();
  }

  show(options = {}) {
    const run = () => new Promise(resolve => {
      const id = options.id || nextId('dialog');
      const overlay = document.createElement('div');
      overlay.className = 'ios-overlay ios-overlay--center';
      overlay.dataset.iosOverlay = id;
      overlay.hidden = true;

      const alert = document.createElement('section');
      alert.className = 'ios-alert';
      alert.setAttribute('role', options.role || 'alertdialog');
      alert.setAttribute('aria-modal', 'true');

      const content = document.createElement('div');
      content.className = 'ios-alert__content';
      const title = document.createElement('div');
      title.className = 'ios-alert__title';
      title.textContent = options.title || '';
      const message = document.createElement('div');
      message.className = 'ios-alert__message';
      message.textContent = options.message || '';
      if (options.title) content.append(title);
      if (options.message) content.append(message);

      let input = null;
      if (options.input) {
        const field = document.createElement('label');
        field.className = 'ios-text-field glasskit-dialog__field';
        input = document.createElement('input');
        input.type = options.input.type || 'text';
        input.value = options.input.value || '';
        input.placeholder = options.input.placeholder || '';
        input.autocomplete = options.input.autocomplete || 'off';
        field.append(input);
        content.append(field);
      }

      const actions = document.createElement('div');
      actions.className = `ios-alert__actions${(options.actions || []).length <= 2 ? ' ios-alert__actions--horizontal' : ''}`;
      const definitions = options.actions?.length ? options.actions : [{ text: 'OK', value: true, preferred: true }];

      const finish = (value, action) => {
        if (!overlay.isConnected) return;
        this.app.dismiss(overlay);
        setTimeout(() => overlay.remove(), 260);
        resolve({ value, action, input: input?.value });
      };

      definitions.forEach(definition => {
        const button = document.createElement('button');
        button.className = 'ios-alert__action';
        if (definition.destructive) button.classList.add('ios-alert__action--destructive');
        if (definition.preferred) button.classList.add('ios-alert__action--preferred');
        button.type = 'button';
        button.textContent = definition.text;
        button.addEventListener('click', () => finish(definition.value, definition));
        actions.append(button);
      });

      alert.append(content, actions);
      overlay.append(alert);
      document.body.append(overlay);
      this.app.lastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.app.present(id);
      if (input) setTimeout(() => input.focus({ preventScroll: true }), 180);
    });

    const result = this.queue.then(run, run);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async alert(message, options = {}) {
    const result = await this.show({ ...options, message, actions: options.actions || [{ text: options.okText || 'OK', value: true, preferred: true }] });
    return result.value;
  }

  async confirm(message, options = {}) {
    const result = await this.show({
      ...options,
      message,
      actions: options.actions || [
        { text: options.cancelText || 'Cancel', value: false },
        { text: options.okText || 'OK', value: true, preferred: true, destructive: Boolean(options.destructive) }
      ]
    });
    return Boolean(result.value);
  }

  async prompt(message, options = {}) {
    const result = await this.show({
      ...options,
      message,
      input: options.input || { value: options.value || '', placeholder: options.placeholder || '' },
      actions: options.actions || [
        { text: options.cancelText || 'Cancel', value: false },
        { text: options.okText || 'OK', value: true, preferred: true }
      ]
    });
    return result.value ? result.input : null;
  }
}

class GlassKitToastInstance {
  constructor(controller, message, options = {}) {
    this.controller = controller;
    this.options = options;
    this.element = document.createElement('div');
    this.element.className = `glasskit-toast${options.className ? ` ${options.className}` : ''}`;
    this.element.setAttribute('role', options.role || 'status');
    this.element.setAttribute('aria-live', options.assertive ? 'assertive' : 'polite');
    const text = document.createElement('span');
    text.className = 'glasskit-toast__message';
    text.textContent = message;
    this.element.append(text);

    if (options.action?.text) {
      const action = document.createElement('button');
      action.className = 'glasskit-toast__action';
      action.type = 'button';
      action.textContent = options.action.text;
      action.addEventListener('click', () => {
        options.action.onClick?.();
        this.dismiss('action');
      });
      this.element.append(action);
    }

    this.timer = null;
  }

  show() {
    this.controller.container.append(this.element);
    requestAnimationFrame(() => this.element.classList.add('is-visible'));
    const duration = Number(this.options.duration ?? 3000);
    if (duration > 0) this.timer = setTimeout(() => this.dismiss('timeout'), duration);
    return this;
  }

  dismiss(reason = 'programmatic') {
    if (this.timer) clearTimeout(this.timer);
    this.element.classList.remove('is-visible');
    setTimeout(() => this.element.remove(), 180);
    this.options.onDismiss?.(reason, this);
  }
}

export class GlassKitToastController {
  constructor(app) {
    this.app = app;
    this.container = document.createElement('div');
    this.container.className = 'glasskit-toast-stack';
    this.container.setAttribute('aria-label', 'Notifications');
    document.body.append(this.container);
  }

  show(message, options = {}) {
    return new GlassKitToastInstance(this, message, options).show();
  }

  destroy() { this.container.remove(); }
}

export class GlassKitLoadingController {
  constructor(app) {
    this.app = app;
    this.overlay = null;
    this.depth = 0;
  }

  show(message = 'Loading…') {
    this.depth += 1;
    if (this.overlay) {
      const output = this.overlay.querySelector('[data-glasskit-loading-message]');
      if (output) output.textContent = message;
      return this;
    }

    const overlay = document.createElement('div');
    overlay.className = 'glasskit-loading-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `<div class="glasskit-loading-card"><div class="ios-spinner" aria-hidden="true"></div><div class="glasskit-loading-message" data-glasskit-loading-message></div></div>`;
    overlay.querySelector('[data-glasskit-loading-message]').textContent = message;
    document.body.append(overlay);
    this.overlay = overlay;
    return this;
  }

  hide({ force = false } = {}) {
    this.depth = force ? 0 : Math.max(0, this.depth - 1);
    if (this.depth > 0 || !this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
  }

  async during(task, message = 'Loading…') {
    this.show(message);
    try { return await (typeof task === 'function' ? task() : task); }
    finally { this.hide(); }
  }

  destroy() { this.hide({ force: true }); }
}

export function createControllers(app) {
  return {
    sheet: new GlassKitSheetController(app),
    dialog: new GlassKitDialogController(app),
    toast: new GlassKitToastController(app),
    loading: new GlassKitLoadingController(app)
  };
}
