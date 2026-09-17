import { mountComponent } from './component.js';

function normalisePath(input = '/') {
  let path = String(input || '/').trim();
  if (path.startsWith('#')) path = path.slice(1);
  if (!path.startsWith('/')) path = `/${path}`;
  const [pathname, search = ''] = path.split('?');
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  return search ? `${clean}?${search}` : clean;
}

function splitPath(path) {
  const normalised = normalisePath(path);
  const [pathname, search = ''] = normalised.split('?');
  return { pathname, search, query: Object.fromEntries(new URLSearchParams(search)) };
}

function appendQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)));
    else params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${normalisePath(path).split('?')[0]}?${search}` : normalisePath(path).split('?')[0];
}

function compileRoute(path) {
  if (path === '*') return { regex: /^.*$/, keys: [] };
  const keys = [];
  const segments = normalisePath(path).split('?')[0].split('/').filter(Boolean);
  const pattern = segments.map(segment => {
    if (segment.startsWith(':')) {
      keys.push(segment.slice(1));
      return '([^/]+)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return { regex: new RegExp(`^/${pattern}/?$`), keys };
}

function buildPath(pattern, params = {}, query = {}) {
  if (!pattern || pattern === '*') return '/';
  const path = normalisePath(pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    if (params[key] == null) throw new Error(`Missing route parameter: ${key}`);
    return encodeURIComponent(String(params[key]));
  }));
  return appendQuery(path, query);
}

function hashPath(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function componentFromModule(value) {
  return value?.default || value?.component || value;
}

export class GlassKitRouter {
  constructor(app, options = {}) {
    this.app = app;
    this.routes = (options.routes || []).map((route, index) => ({
      ...route,
      _index: index,
      _compiled: compileRoute(route.path)
    }));
    this.namedRoutes = new Map(this.routes.filter(route => route.name).map(route => [route.name, route]));
    this.mode = options.mode || 'hash';
    this.defaultRoute = options.defaultRoute || this.routes.find(route => route.path !== '*')?.path || '/';
    this.maxComponentCache = Math.max(1, Number(options.componentCacheSize ?? 12));
    this.current = null;
    this.ready = false;
    this.applying = false;
    this.historyIndex = Number.isInteger(history.state?.glasskitIndex) ? history.state.glasskitIndex : 0;
    this.scrollPositions = new Map();
    this.componentEntries = new Map();
    this.loadedComponents = new Map();
    this.dataCache = new Map();
    this.readyPromise = Promise.resolve(this);
    this.boundPopState = event => this.handlePopState(event);
    this.boundClick = event => this.handleLinkClick(event);
  }

  init() {
    if (this.ready) return this;
    this.ready = true;
    this.app.root.addEventListener('click', this.boundClick);
    window.addEventListener('popstate', this.boundPopState);

    const requested = this.pathFromLocation();
    const matched = this.match(requested);
    const initial = matched && !matched.route.redirect ? requested : (matched?.route?.redirect || this.defaultRoute);
    this.writeHistory(initial, { replace: true, index: this.historyIndex });
    this.readyPromise = this.apply(initial, { direction: 'replace', state: history.state }).then(() => this);
    return this;
  }

  async destroy() {
    this.app.root.removeEventListener('click', this.boundClick);
    window.removeEventListener('popstate', this.boundPopState);
    for (const entry of this.componentEntries.values()) await entry.instance?.destroy?.();
    this.componentEntries.clear();
    this.loadedComponents.clear();
    this.ready = false;
  }

  whenReady() {
    return this.readyPromise;
  }

  pathFromLocation() {
    if (this.mode === 'history') return normalisePath(`${location.pathname}${location.search}`);
    const hash = location.hash.replace(/^#/, '');
    return normalisePath(hash || this.defaultRoute);
  }

  routeByName(name) {
    return this.namedRoutes.get(name) || null;
  }

  resolve(target, params = {}, query = {}) {
    if (target && typeof target === 'object') {
      const options = target;
      if (options.name) {
        const route = this.routeByName(options.name);
        if (!route) throw new Error(`Unknown GlassKit route: ${options.name}`);
        return buildPath(route.path, options.params || params, options.query || query);
      }
      if (options.path) return appendQuery(options.path, options.query || query);
    }
    return appendQuery(String(target || '/'), query);
  }

  href(target, params = {}, query = {}) {
    const built = this.resolve(target, params, query);
    return this.mode === 'history' ? built : `#${built}`;
  }

  match(path) {
    const { pathname, query } = splitPath(path);
    for (const route of this.routes) {
      if (route.path === '*') continue;
      const match = pathname.match(route._compiled.regex);
      if (!match) continue;
      const params = {};
      route._compiled.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      return { route, params, query, path: normalisePath(path) };
    }
    const fallback = this.routes.find(route => route.path === '*');
    return fallback ? { route: fallback, params: {}, query, path: normalisePath(path) } : null;
  }

  findByTab(tab) {
    return this.routes.find(route => route.tab === tab && !route.screen && !route.component && !route.loadComponent);
  }

  findByScreen(screen) {
    return this.routes.find(route => route.screen === screen && !route.path.includes(':'));
  }

  targetFor(context) {
    if (!context) return null;
    if (context.target?.isConnected) return context.target;
    if (context.screenName) return this.app.root.querySelector(`[data-ios-screen="${CSS.escape(context.screenName)}"]`);
    if (context.route.screen) return this.app.root.querySelector(`[data-ios-screen="${CSS.escape(context.route.screen)}"]`);
    if (context.route.tab) return this.app.root.querySelector(`[data-ios-tab-panel="${CSS.escape(context.route.tab)}"]`);
    return null;
  }

  screenNameFor(context) {
    if (context.screenName) return context.screenName;
    if (context.route.screen) return context.route.screen;
    return null;
  }

  async navigate(target, options = {}) {
    const path = this.resolve(target, options.params, options.query);
    const matched = this.match(path);
    if (!matched) return false;

    if (matched.route.redirect) {
      const redirect = typeof matched.route.redirect === 'function'
        ? await matched.route.redirect({ ...matched, app: this.app, router: this, store: this.app.store })
        : matched.route.redirect;
      return this.navigate(redirect, { ...options, replace: true });
    }

    if (this.current?.path === path && !options.force) return true;
    const direction = options.direction || (options.replace ? 'replace' : 'forward');
    const applied = await this.apply(path, { direction, state: options.state });
    if (!applied) return false;
    this.writeHistory(path, { replace: Boolean(options.replace), state: options.state });
    return true;
  }

  replace(target, options = {}) {
    return this.navigate(target, { ...options, replace: true });
  }

  to(name, params = {}, options = {}) {
    return this.navigate({ name, params, query: options.query }, options);
  }

  back() {
    if (history.length > 1) history.back();
    else this.replace(this.defaultRoute);
  }

  forward() {
    history.forward();
  }

  writeHistory(path, { replace = false, state = null, index = null } = {}) {
    const nextIndex = Number.isInteger(index) ? index : replace ? this.historyIndex : this.historyIndex + 1;
    const url = this.mode === 'history' ? path : `${location.pathname}${location.search}#${path}`;
    const payload = { ...(state || {}), glasskit: true, path, glasskitIndex: nextIndex };
    if (replace) history.replaceState(payload, '', url);
    else history.pushState(payload, '', url);
    this.historyIndex = nextIndex;
  }

  async handlePopState(event) {
    const targetIndex = Number.isInteger(event.state?.glasskitIndex) ? event.state.glasskitIndex : this.historyIndex - 1;
    const direction = targetIndex > this.historyIndex ? 'forward' : 'back';
    const previousIndex = this.historyIndex;
    const applied = await this.syncFromLocation({ direction, state: event.state });
    if (applied) this.historyIndex = targetIndex;
    else if (this.current?.path) this.writeHistory(this.current.path, { replace: true, state: history.state, index: previousIndex });
  }

  async syncFromLocation({ direction = 'back', state = null } = {}) {
    const path = this.pathFromLocation();
    const matched = this.match(path);
    if (!matched) return this.apply(this.defaultRoute, { direction: 'replace', state });
    if (matched.route.redirect) {
      const redirect = typeof matched.route.redirect === 'function'
        ? await matched.route.redirect({ ...matched, app: this.app, router: this, store: this.app.store })
        : matched.route.redirect;
      this.writeHistory(redirect, { replace: true, state, index: this.historyIndex });
      return this.apply(redirect, { direction: 'replace', state });
    }
    return this.apply(path, { direction, state });
  }

  createContext(matched, { direction = 'forward', state = null } = {}) {
    return {
      ...matched,
      state,
      direction,
      data: undefined,
      app: this.app,
      router: this,
      store: this.app.store,
      target: null,
      screenName: null,
      componentInstance: null
    };
  }

  async resolveData(context) {
    const route = context.route;
    if (typeof route.resolve !== 'function') return;
    if (route.cacheData && this.dataCache.has(context.path)) {
      context.data = this.dataCache.get(context.path);
      return;
    }
    this.app.emit('routeloadstart', { route: context, kind: 'data' });
    try {
      context.data = await route.resolve(context);
      if (route.cacheData) this.dataCache.set(context.path, context.data);
    } finally {
      this.app.emit('routeloadend', { route: context, kind: 'data' });
    }
  }

  async loadComponentDefinition(context) {
    const route = context.route;
    const key = route.name || `${route.path}:${route._index}`;
    if (this.loadedComponents.has(key)) return this.loadedComponents.get(key);

    let definition = route.component;
    if (typeof route.loadComponent === 'function') {
      this.app.emit('routeloadstart', { route: context, kind: 'component' });
      try {
        definition = componentFromModule(await route.loadComponent(context));
      } finally {
        this.app.emit('routeloadend', { route: context, kind: 'component' });
      }
    }
    if (!definition) return null;
    if (route.cacheComponent !== false) this.loadedComponents.set(key, definition);
    return definition;
  }

  componentHostName(context) {
    const base = context.route.name || `route-${context.route._index}`;
    return `glasskit-${base.replace(/[^A-Za-z0-9_-]+/g, '-')}-${hashPath(context.path)}`;
  }

  async ensureTarget(context) {
    const route = context.route;
    if (!route.component && !route.loadComponent) {
      context.screenName = route.screen || null;
      context.target = this.targetFor(context);
      return context.target;
    }

    const cached = this.componentEntries.get(context.path);
    if (cached?.host?.isConnected) {
      context.target = cached.host;
      context.screenName = cached.screenName;
      context.componentInstance = cached.instance;
      await cached.instance.update(this.componentContext(context));
      cached.usedAt = Date.now();
      return cached.host;
    }

    const definition = await this.loadComponentDefinition(context);
    if (!definition) throw new Error(`GlassKit route ${route.path} did not provide a component`);

    const host = document.createElement('section');
    const screenName = this.componentHostName(context);
    host.className = 'ios-push-screen glasskit-route-screen';
    host.dataset.iosScreen = screenName;
    host.dataset.glasskitComponentRoute = context.path;
    host.tabIndex = -1;
    host.hidden = true;

    const tabbar = this.app.root.querySelector(':scope > .ios-tabbar-wrap');
    this.app.root.insertBefore(host, tabbar || null);

    context.target = host;
    context.screenName = screenName;
    const instance = await mountComponent(definition, host, this.componentContext(context));
    context.componentInstance = instance;
    this.componentEntries.set(context.path, { host, screenName, instance, route, usedAt: Date.now() });
    this.app.enhance?.(host);
    this.app.emit('componentmounted', { route: context, component: instance, host });
    await this.pruneComponentCache(context.path);
    return host;
  }

  componentContext(context) {
    return {
      app: this.app,
      router: this,
      store: this.app.store,
      route: context,
      params: context.params,
      query: context.query,
      data: context.data
    };
  }

  captureScroll(context) {
    const target = this.targetFor(context);
    const scroll = target?.querySelector('.ios-scroll');
    if (scroll) this.scrollPositions.set(context.path, { top: scroll.scrollTop, left: scroll.scrollLeft });
  }

  restoreScroll(context) {
    const target = this.targetFor(context);
    const scroll = target?.querySelector('.ios-scroll');
    if (!scroll) return;
    const saved = this.scrollPositions.get(context.path);
    if (saved) {
      scroll.scrollTop = saved.top;
      scroll.scrollLeft = saved.left;
    } else if (context.direction !== 'back') {
      scroll.scrollTop = 0;
      scroll.scrollLeft = 0;
    }
  }

  async apply(path, { direction = 'forward', state = null } = {}) {
    const matched = this.match(path);
    if (!matched || matched.route.redirect) return false;

    const next = this.createContext(matched, { direction, state });
    const previous = this.current;

    if (previous?.route?.beforeLeave && await previous.route.beforeLeave(previous, next) === false) return false;
    if (matched.route.beforeEnter && await matched.route.beforeEnter(next, previous) === false) return false;

    await this.resolveData(next);
    await this.ensureTarget(next);

    const previousTarget = this.targetFor(previous);
    const nextTarget = this.targetFor(next);
    if (!nextTarget && (next.route.screen || next.route.tab || next.route.component || next.route.loadComponent)) {
      throw new Error(`GlassKit route target not found for ${next.path}`);
    }

    this.captureScroll(previous);
    previousTarget?.dispatchEvent(new CustomEvent('glasskit:pagebeforeleave', { bubbles: true, detail: { from: previous, to: next } }));
    nextTarget?.dispatchEvent(new CustomEvent('glasskit:pagebeforeenter', { bubbles: true, detail: { from: previous, to: next } }));
    this.app.emit('routebeforechange', { from: previous, to: next });

    const previousIsScreen = previousTarget?.matches?.('[data-ios-screen]');
    const nextScreenName = this.screenNameFor(next);

    this.applying = true;
    try {
      if (direction === 'back' && previousIsScreen) {
        await this.app.transitionBack();
        if (next.route.tab && this.app.activeTab !== next.route.tab) this.app.transitionToTab(next.route.tab, false);
      } else if (direction === 'replace' && previousIsScreen && nextScreenName && previousTarget !== nextTarget) {
        await this.app.transitionBack();
        if (next.route.tab && this.app.activeTab !== next.route.tab) this.app.transitionToTab(next.route.tab, false);
        await this.app.transitionPush(nextScreenName);
      } else if (!nextScreenName && next.route.tab) {
        if (this.app.activeTab !== next.route.tab || previousIsScreen) this.app.transitionToTab(next.route.tab, direction !== 'replace');
      } else {
        if (next.route.tab && this.app.activeTab !== next.route.tab) this.app.transitionToTab(next.route.tab, direction !== 'replace');
        if (nextScreenName && previousTarget !== nextTarget) await this.app.transitionPush(nextScreenName);
      }
    } finally {
      this.applying = false;
    }

    if (previousTarget && previousTarget !== nextTarget) {
      previousTarget.dispatchEvent(new CustomEvent('glasskit:pageleave', { bubbles: true, detail: { from: previous, to: next } }));
    }
    if (nextTarget) {
      nextTarget.glasskitRoute = next;
      nextTarget.dataset.glasskitRoutePath = matched.path;
      nextTarget.dispatchEvent(new CustomEvent('glasskit:pageenter', { bubbles: true, detail: next }));
    }

    this.current = next;
    this.restoreScroll(next);
    await previous?.route?.leave?.(previous, next);
    await matched.route.enter?.(next, previous);
    this.app.emit('routechange', { from: previous, to: next });

    if ((direction === 'back' || direction === 'replace') && previous?.route?.cache === false) {
      await this.releaseComponent(previous.path);
    }
    return true;
  }

  async preload(target, options = {}) {
    const path = this.resolve(target, options.params, options.query);
    const matched = this.match(path);
    if (!matched || matched.route.redirect) return false;
    const context = this.createContext(matched, { direction: 'preload' });
    await this.resolveData(context);
    await this.loadComponentDefinition(context);
    return true;
  }

  async releaseComponent(path) {
    const entry = this.componentEntries.get(path);
    if (!entry) return false;
    const protectedTargets = new Set(this.app.stack?.map(item => item.screen) || []);
    if (protectedTargets.has(entry.host) || this.targetFor(this.current) === entry.host) return false;
    await entry.instance?.destroy?.();
    entry.host.remove();
    this.componentEntries.delete(path);
    this.app.emit('componentunmounted', { path, component: entry.instance });
    return true;
  }

  async pruneComponentCache(currentPath = null) {
    if (this.componentEntries.size <= this.maxComponentCache) return;
    const protectedTargets = new Set(this.app.stack?.map(item => item.screen) || []);
    const entries = [...this.componentEntries.entries()].sort((a, b) => a[1].usedAt - b[1].usedAt);
    for (const [path, entry] of entries) {
      if (this.componentEntries.size <= this.maxComponentCache) break;
      if (path === currentPath || protectedTargets.has(entry.host) || !entry.host.hidden) continue;
      await entry.instance?.destroy?.();
      entry.host.remove();
      this.componentEntries.delete(path);
    }
  }

  handleLinkClick(event) {
    const link = event.target.closest('[data-glasskit-link]');
    if (!link || !this.app.root.contains(link)) return;
    const raw = link.getAttribute('data-glasskit-link') || link.getAttribute('href');
    if (!raw) return;
    event.preventDefault();

    const params = link.dataset.glasskitParams ? JSON.parse(link.dataset.glasskitParams) : undefined;
    const query = link.dataset.glasskitQuery ? JSON.parse(link.dataset.glasskitQuery) : undefined;
    const target = link.dataset.glasskitRoute ? { name: link.dataset.glasskitRoute, params, query } : raw;
    this.navigate(target);
  }

  build(path, params = {}, query = {}) {
    return buildPath(path, params, query);
  }
}

export { buildPath as buildGlassKitPath, normalisePath as normaliseGlassKitPath };
