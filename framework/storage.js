function availableStorage(storage) {
  if (!storage) return null;
  try {
    const key = '__glasskit_test__';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return storage;
  } catch {
    return null;
  }
}

export class GlassKitStorage {
  constructor(options = {}) {
    this.namespace = options.namespace || 'glasskit';
    let selected = options.storage;
    if (selected == null) {
      try { selected = globalThis.localStorage; } catch { selected = null; }
    }
    this.storage = availableStorage(selected);
    this.memory = new Map();
  }

  key(name) { return `${this.namespace}:${name}`; }

  get(name, fallback = null) {
    const key = this.key(name);
    const raw = this.storage ? this.storage.getItem(key) : this.memory.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  set(name, value) {
    const key = this.key(name);
    const raw = JSON.stringify(value);
    if (this.storage) this.storage.setItem(key, raw);
    else this.memory.set(key, raw);
    return value;
  }

  remove(name) {
    const key = this.key(name);
    if (this.storage) this.storage.removeItem(key);
    else this.memory.delete(key);
  }

  has(name) {
    const key = this.key(name);
    return this.storage ? this.storage.getItem(key) != null : this.memory.has(key);
  }

  clear() {
    const prefix = `${this.namespace}:`;
    if (this.storage) {
      const keys = [];
      for (let index = 0; index < this.storage.length; index += 1) {
        const key = this.storage.key(index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      keys.forEach(key => this.storage.removeItem(key));
    } else {
      [...this.memory.keys()].filter(key => key.startsWith(prefix)).forEach(key => this.memory.delete(key));
    }
  }
}

export function createStorage(options = {}) { return new GlassKitStorage(options); }
