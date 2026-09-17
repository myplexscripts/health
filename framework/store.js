function isStoreDefinition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.prototype.hasOwnProperty.call(value, 'state') ||
    Object.prototype.hasOwnProperty.call(value, 'getters') ||
    Object.prototype.hasOwnProperty.call(value, 'actions');
}

function resolveState(source) {
  const value = typeof source === 'function' ? source() : source;
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

export class GlassKitStore {
  constructor(definition = {}) {
    const config = isStoreDefinition(definition)
      ? definition
      : { state: definition };

    this.listeners = new Map();
    this.getterDefinitions = { ...(config.getters || {}) };
    this.actions = { ...(config.actions || {}) };
    this.actionDepth = 0;
    this.state = new Proxy(resolveState(config.state), {
      set: (target, key, value) => {
        const previous = target[key];
        if (Object.is(previous, value)) return true;
        target[key] = value;
        this.notify(String(key), value, previous);
        return true;
      },
      deleteProperty: (target, key) => {
        if (!(key in target)) return true;
        const previous = target[key];
        delete target[key];
        this.notify(String(key), undefined, previous);
        return true;
      }
    });

    this.getters = new Proxy({}, {
      get: (_, key) => {
        if (typeof key === 'symbol') return undefined;
        return this.getter(String(key));
      },
      has: (_, key) => Object.prototype.hasOwnProperty.call(this.getterDefinitions, key),
      ownKeys: () => Reflect.ownKeys(this.getterDefinitions),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
    });
  }

  get(key) {
    return this.state[key];
  }

  getter(name) {
    const getter = this.getterDefinitions[name];
    if (typeof getter !== 'function') return undefined;
    return getter(this.state, this.getters, this);
  }

  set(key, value) {
    this.state[key] = value;
    return value;
  }

  update(key, updater) {
    if (typeof updater !== 'function') throw new TypeError('GlassKitStore updater must be a function');
    const value = updater(this.state[key], this.state);
    this.state[key] = value;
    return value;
  }

  patch(values = {}) {
    Object.entries(values).forEach(([key, value]) => {
      this.state[key] = value;
    });
    return this.state;
  }

  replace(values = {}) {
    Object.keys(this.state).forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) delete this.state[key];
    });
    this.patch(values);
    return this.state;
  }

  dispatch(name, payload) {
    const action = this.actions[name];
    if (typeof action !== 'function') throw new Error(`Unknown GlassKit store action: ${name}`);

    this.actionDepth += 1;
    const context = {
      state: this.state,
      getters: this.getters,
      store: this,
      get: key => this.get(key),
      set: (key, value) => this.set(key, value),
      update: (key, updater) => this.update(key, updater),
      patch: values => this.patch(values),
      dispatch: (actionName, actionPayload) => this.dispatch(actionName, actionPayload)
    };

    try {
      const result = action(context, payload);
      if (result && typeof result.then === 'function') {
        return result.finally(() => { this.actionDepth = Math.max(0, this.actionDepth - 1); });
      }
      this.actionDepth = Math.max(0, this.actionDepth - 1);
      return result;
    } catch (error) {
      this.actionDepth = Math.max(0, this.actionDepth - 1);
      throw error;
    }
  }

  subscribe(key, listener, { immediate = false } = {}) {
    if (typeof listener !== 'function') throw new TypeError('GlassKitStore subscriber must be a function');
    const name = key || '*';
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(listener);
    if (immediate) listener(name === '*' ? this.state : this.state[name], undefined, name, this.state);
    return () => {
      const group = this.listeners.get(name);
      group?.delete(listener);
      if (group?.size === 0) this.listeners.delete(name);
    };
  }

  watch(getter, listener, { immediate = false, equals = Object.is } = {}) {
    if (typeof getter !== 'function' || typeof listener !== 'function') {
      throw new TypeError('GlassKitStore.watch expects getter and listener functions');
    }
    let previous = getter(this.state, this.getters, this);
    if (immediate) listener(previous, undefined, this.state);
    return this.subscribe('*', () => {
      const next = getter(this.state, this.getters, this);
      if (equals(previous, next)) return;
      const old = previous;
      previous = next;
      listener(next, old, this.state);
    });
  }

  notify(key, value, previous) {
    const invoke = listener => listener(value, previous, key, this.state);
    this.listeners.get(key)?.forEach(invoke);
    this.listeners.get('*')?.forEach(listener => listener(this.state, this.state, key, this.state));
  }
}

export function createStore(definition = {}) {
  return new GlassKitStore(definition);
}
