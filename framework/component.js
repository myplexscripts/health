function normaliseDefinition(definition) {
  if (definition?.__glasskitComponentDefinition) return definition;
  if (typeof definition === 'function') return { __glasskitComponentDefinition: true, render: definition };
  if (!definition || typeof definition !== 'object') throw new TypeError('GlassKit component must be a function or object');
  return { ...definition, __glasskitComponentDefinition: true };
}

function resolveInitialState(definition, context) {
  const source = typeof definition.state === 'function' ? definition.state(context) : definition.state;
  return source && typeof source === 'object' ? { ...source } : {};
}

function applyRenderedContent(host, rendered) {
  host.replaceChildren();
  if (rendered == null || rendered === false) return;
  if (typeof Node !== 'undefined' && rendered instanceof Node) {
    host.append(rendered);
    return;
  }
  if (Array.isArray(rendered)) {
    rendered.forEach(item => {
      if (typeof Node !== 'undefined' && item instanceof Node) host.append(item);
      else if (item != null && item !== false) host.insertAdjacentHTML('beforeend', String(item));
    });
    return;
  }
  host.innerHTML = String(rendered);
}

export class GlassKitComponentInstance {
  constructor(definition, host, context = {}) {
    this.definition = normaliseDefinition(definition);
    this.host = host;
    this.context = { ...context };
    this.state = resolveInitialState(this.definition, this.context);
    this.bindings = {};
    this.cleanup = [];
    this.mounted = false;
    this.destroyed = false;
    this.rendering = Promise.resolve();
  }

  api(extra = {}) {
    return {
      ...this.context,
      ...this.bindings,
      ...extra,
      state: this.state,
      host: this.host,
      component: this,
      setState: patch => this.setState(patch),
      update: next => this.update(next),
      query: selector => this.host.querySelector(selector),
      queryAll: selector => [...this.host.querySelectorAll(selector)]
    };
  }

  async mount() {
    if (this.mounted || this.destroyed) return this;
    const initial = this.api();
    const setupResult = await this.definition.setup?.(initial);
    if (typeof setupResult === 'function') this.cleanup.push(setupResult);
    else if (setupResult && typeof setupResult === 'object') this.bindings = setupResult;

    await this.definition.beforeMount?.(this.api());
    await this.render();
    this.bindEvents();
    this.mounted = true;
    await this.definition.mounted?.(this.api());
    return this;
  }

  async render() {
    if (this.destroyed) return this;
    this.rendering = this.rendering.then(async () => {
      const rendered = await this.definition.render?.(this.api());
      applyRenderedContent(this.host, rendered);
      this.context.app?.enhance?.(this.host);
    });
    await this.rendering;
    return this;
  }

  async setState(patch) {
    if (this.destroyed) return this;
    const values = typeof patch === 'function' ? await patch({ ...this.state }, this.api()) : patch;
    if (!values || typeof values !== 'object') return this;
    const previous = { ...this.state };
    Object.assign(this.state, values);
    await this.definition.beforeUpdate?.(this.api({ previousState: previous }));
    await this.render();
    await this.definition.updated?.(this.api({ previousState: previous }));
    return this;
  }

  async update(context = {}) {
    if (this.destroyed) return this;
    const previousContext = this.context;
    this.context = { ...this.context, ...context };
    await this.definition.beforeUpdate?.(this.api({ previousContext }));
    await this.render();
    await this.definition.updated?.(this.api({ previousContext }));
    return this;
  }

  bindEvents() {
    Object.entries(this.definition.events || {}).forEach(([descriptor, handler]) => {
      if (typeof handler !== 'function') return;
      const [type, ...selectorParts] = descriptor.trim().split(/\s+/);
      const selector = selectorParts.join(' ');
      if (!type) return;
      const listener = event => {
        const matched = selector ? event.target.closest(selector) : this.host;
        if (!matched || !this.host.contains(matched)) return;
        handler.call(this.bindings, event, this.api({ target: matched }));
      };
      this.host.addEventListener(type, listener);
      this.cleanup.push(() => this.host.removeEventListener(type, listener));
    });
  }

  async destroy() {
    if (this.destroyed) return;
    await this.definition.beforeUnmount?.(this.api());
    this.destroyed = true;
    while (this.cleanup.length) {
      try { await this.cleanup.pop()?.(); } catch (error) { console.error(error); }
    }
    this.host.replaceChildren();
    this.mounted = false;
    await this.definition.unmounted?.(this.api());
  }
}

export function defineComponent(definition) {
  return normaliseDefinition(definition);
}

export const component = defineComponent;

export async function mountComponent(definition, host, context = {}) {
  if (!host) throw new Error('GlassKit component host not found');
  const instance = new GlassKitComponentInstance(definition, host, context);
  await instance.mount();
  return instance;
}
