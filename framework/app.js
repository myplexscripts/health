import { IOSApp } from './ios.js';
import { GlassKitRouter } from './router.js';
import { GlassKitStore } from './store.js';
import { GlassKitRequest } from './request.js';
import { GlassKitStorage } from './storage.js';
import { GlassKitPluginManager } from './plugins.js';
import { createControllers } from './controllers.js';
import { initIOSBehaviorRefinements, enhanceIOSBehavior } from './behavior.js';
import { renderLucide } from './lucide.js';

export const GLASSKIT_VERSION = '1.2.0';

export class GlassKitApp extends IOSApp {
  static globalPlugins = [];

  static use(plugin, options = {}) {
    this.globalPlugins.push({ plugin, options });
    return this;
  }

  constructor(options = {}) {
    if ((typeof Element !== 'undefined' && options instanceof Element) || typeof options === 'string') options = { root: options };
    const root = options.root || document.querySelector('[data-glasskit-app]') || document.querySelector('[data-ios-app]');
    super(root);

    this.options = options;
    this.name = options.name || 'GlassKit App';
    this.store = options.store instanceof GlassKitStore ? options.store : new GlassKitStore(options.store || {});
    this.request = options.request instanceof GlassKitRequest ? options.request : new GlassKitRequest(options.request || {});
    this.storage = options.storage instanceof GlassKitStorage
      ? options.storage
      : new GlassKitStorage({ namespace: options.storage?.namespace || this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...(options.storage || {}) });
    this.plugins = new GlassKitPluginManager(this);
    this.controllers = createControllers(this);
    this.sheet = this.controllers.sheet;
    this.dialog = this.controllers.dialog;
    this.toast = this.controllers.toast;
    this.loading = this.controllers.loading;
    this.router = new GlassKitRouter(this, {
      routes: options.routes || [],
      mode: options.router?.mode || options.routerMode || 'hash',
      defaultRoute: options.router?.defaultRoute || options.defaultRoute,
      componentCacheSize: options.router?.componentCacheSize
    });
    this.initialized = false;
    this.readyPromise = Promise.resolve(this);

    this.root.dataset.glasskitApp = this.root.dataset.glasskitApp || '';
    this.root.__glasskitApp = this;
    this.root.__iosApp = this;
  }

  init() {
    if (this.initialized) return this;
    super.init();
    initIOSBehaviorRefinements(this.root);
    this.router.init();
    this.initialized = true;

    const configuredPlugins = [
      ...this.constructor.globalPlugins,
      ...(this.options.plugins || []).map(entry => entry?.plugin ? entry : { plugin: entry, options: {} })
    ];

    this.readyPromise = (async () => {
      try {
        for (const entry of configuredPlugins) await this.plugins.use(entry.plugin, entry.options || {});
        await this.plugins.init();
        await this.router.whenReady();
        this.emit('ready', { app: this });
        return this;
      } catch (error) {
        this.handleError(error, { phase: 'init' });
        throw error;
      }
    })();

    return this;
  }

  whenReady() {
    return this.readyPromise;
  }

  emit(name, detail = {}) {
    const eventName = name.startsWith('glasskit:') ? name : `glasskit:${name}`;
    const event = new CustomEvent(eventName, { bubbles: true, detail });
    this.root.dispatchEvent(event);
    const hook = this.options.on?.[name.replace(/^glasskit:/, '')];
    if (typeof hook === 'function') hook(detail, this);
    return event;
  }

  on(name, listener, options) {
    const eventName = name.startsWith('glasskit:') ? name : `glasskit:${name}`;
    this.root.addEventListener(eventName, listener, options);
    return () => this.root.removeEventListener(eventName, listener, options);
  }

  handleError(error, context = {}) {
    const detail = { error, context, app: this };
    this.emit('error', detail);
    if (!this.options.on?.error && typeof console !== 'undefined') console.error('[GlassKit]', error, context);
    return detail;
  }

  use(plugin, options = {}) {
    return this.plugins.use(plugin, options).then(async api => {
      await this.plugins.init();
      return api;
    }).catch(error => {
      this.handleError(error, { phase: 'plugin' });
      throw error;
    });
  }

  enhance(scope = this.root) {
    enhanceIOSBehavior(this.root, scope);
    renderLucide(scope);
    this.enhanceSearchFields(scope);
    return scope;
  }

  enhanceSearchFields(scope) {
    const fields = [];
    if (scope.matches?.('.ios-search-field')) fields.push(scope);
    scope.querySelectorAll?.('.ios-search-field').forEach(field => fields.push(field));
    fields.forEach(field => {
      if (field.dataset.glasskitSearchBound === 'true') return;
      const input = field.querySelector('input');
      const clear = field.querySelector('[data-ios-clear]');
      if (!input || !clear) return;
      field.dataset.glasskitSearchBound = 'true';
      const sync = () => clear.toggleAttribute('hidden', input.value.length === 0);
      input.addEventListener('input', sync);
      clear.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
      sync();
    });
  }

  selectTab(name, animate = true) {
    if (this.router?.ready && !this.router.applying) {
      const route = this.router.findByTab(name);
      if (route) {
        this.router.navigate(route.path).catch(error => this.handleError(error, { phase: 'route', target: route.path }));
        return;
      }
    }
    return super.selectTab(name, animate);
  }

  push(name) {
    if (this.router?.ready && !this.router.applying) {
      const route = this.router.findByScreen(name);
      if (route) return Promise.resolve(this.router.navigate(route.path));
    }
    return super.push(name);
  }

  back() {
    if (this.router?.ready && !this.router.applying) {
      this.router.back();
      return Promise.resolve(true);
    }
    return super.back();
  }

  transitionToTab(name, animate = true) {
    return super.selectTab(name, animate);
  }

  transitionPush(name) {
    return super.push(name);
  }

  transitionBack() {
    return super.back();
  }

  navigate(target, options = {}) {
    return this.router.navigate(target, options).catch(error => {
      this.handleError(error, { phase: 'route', target });
      throw error;
    });
  }

  replace(target, options = {}) {
    return this.router.replace(target, options).catch(error => {
      this.handleError(error, { phase: 'route', target });
      throw error;
    });
  }

  async destroy() {
    await this.router.destroy();
    await this.plugins.destroy();
    this.controllers.toast.destroy();
    this.controllers.loading.destroy();
    this.root.__glasskitApp = null;
    if (this.root.__iosApp === this) this.root.__iosApp = null;
    this.initialized = false;
    this.emit('destroy', { app: this });
  }
}

export function createGlassKitApp(options = {}) {
  return new GlassKitApp(options).init();
}
