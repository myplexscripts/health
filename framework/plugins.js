function normalisePlugin(plugin) {
  if (typeof plugin === 'function') return { name: plugin.name || 'anonymous-plugin', install: plugin };
  if (!plugin || typeof plugin !== 'object') throw new TypeError('GlassKit plugin must be a function or object');
  return plugin;
}

export class GlassKitPluginManager {
  constructor(app) {
    this.app = app;
    this.records = new Map();
  }

  has(name) {
    return this.records.has(name);
  }

  async use(plugin, options = {}) {
    const definition = normalisePlugin(plugin);
    const name = definition.name || `plugin-${this.records.size + 1}`;
    if (this.records.has(name)) return this.records.get(name).api;

    const record = { name, definition, options, cleanup: null, api: null, initialized: false };
    this.records.set(name, record);

    try {
      const installed = await definition.install?.(this.app, options);
      if (typeof installed === 'function') record.cleanup = installed;
      else if (installed && typeof installed === 'object') record.api = installed;
      if (!record.api && definition.api) record.api = typeof definition.api === 'function' ? definition.api(this.app, options) : definition.api;
      return record.api;
    } catch (error) {
      this.records.delete(name);
      throw error;
    }
  }

  async init() {
    for (const record of this.records.values()) {
      if (record.initialized) continue;
      await record.definition.init?.(this.app, record.options, record.api);
      record.initialized = true;
    }
  }

  async destroy() {
    const records = [...this.records.values()].reverse();
    for (const record of records) {
      try { await record.definition.destroy?.(this.app, record.options, record.api); } catch (error) { console.error(error); }
      try { await record.cleanup?.(); } catch (error) { console.error(error); }
    }
    this.records.clear();
  }
}

export function definePlugin(plugin) {
  return normalisePlugin(plugin);
}
