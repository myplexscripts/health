function stableQuery(query = {}) {
  const params = new URLSearchParams();
  Object.keys(query || {}).sort().forEach(key => {
    const value = query[key];
    if (value == null) return;
    if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)));
    else params.set(key, String(value));
  });
  return params.toString();
}

function joinURL(baseURL, input) {
  const value = String(input || '');
  if (!baseURL || /^(?:[a-z]+:)?\/\//i.test(value)) return value;
  return `${String(baseURL).replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function mergeSignals(controller, externalSignal) {
  if (!externalSignal) return () => {};
  if (externalSignal.aborted) controller.abort(externalSignal.reason);
  const abort = () => controller.abort(externalSignal.reason);
  externalSignal.addEventListener('abort', abort, { once: true });
  return () => externalSignal.removeEventListener('abort', abort);
}

export class GlassKitRequestError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'GlassKitRequestError';
    this.status = options.status ?? 0;
    this.statusText = options.statusText || '';
    this.url = options.url || '';
    this.data = options.data;
    this.response = options.response;
    this.code = options.code || (this.status ? `HTTP_${this.status}` : 'REQUEST_FAILED');
  }
}

export class GlassKitRequest {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.headers = { ...(options.headers || {}) };
    this.timeout = Math.max(0, Number(options.timeout ?? 15000));
    this.credentials = options.credentials;
    this.defaultCacheTTL = Math.max(0, Number(options.cacheTTL ?? 0));
    this.cache = new Map();
    this.inflight = new Map();
  }

  buildURL(input, query) {
    const url = joinURL(this.baseURL, input);
    const queryString = stableQuery(query);
    if (!queryString) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }

  cacheKey(method, url, headers = {}) {
    const vary = Object.entries(headers)
      .filter(([key]) => ['accept', 'authorization'].includes(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key.toLowerCase()}:${value}`)
      .join('|');
    return `${method.toUpperCase()} ${url} ${vary}`;
  }

  clearCache(predicate) {
    if (!predicate) {
      this.cache.clear();
      return;
    }
    for (const [key, value] of this.cache) {
      if (predicate(value, key)) this.cache.delete(key);
    }
  }

  async parseResponse(response, responseType = 'auto') {
    if (response.status === 204 || response.status === 205) return null;
    const type = responseType === 'auto'
      ? (response.headers.get('content-type')?.includes('application/json') ? 'json' : 'text')
      : responseType;
    if (type === 'response') return response;
    if (type === 'json') return response.json();
    if (type === 'blob') return response.blob();
    if (type === 'arrayBuffer') return response.arrayBuffer();
    return response.text();
  }

  request(input, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const url = this.buildURL(input, options.query);
    const headers = { ...this.headers, ...(options.headers || {}) };
    const key = this.cacheKey(method, url, headers);
    const canCache = method === 'GET' && options.cache !== false;
    const cacheTTL = options.cache === true
      ? (this.defaultCacheTTL || 30000)
      : Number(options.cacheTTL ?? this.defaultCacheTTL);

    if (canCache && cacheTTL > 0) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
      if (cached) this.cache.delete(key);
    }

    const dedupe = options.dedupe !== false && method === 'GET';
    if (dedupe && this.inflight.has(key)) return this.inflight.get(key);

    const task = this.execute(url, { ...options, method, headers }).then(data => {
      if (canCache && cacheTTL > 0) this.cache.set(key, { data, expiresAt: Date.now() + cacheTTL, url });
      return data;
    }).finally(() => {
      if (this.inflight.get(key) === task) this.inflight.delete(key);
    });

    if (dedupe) this.inflight.set(key, task);
    return task;
  }

  async execute(url, options) {
    const controller = new AbortController();
    const removeAbortBridge = mergeSignals(controller, options.signal);
    const timeout = Math.max(0, Number(options.timeout ?? this.timeout));
    let timer = null;
    if (timeout > 0) timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeout);

    const init = {
      method: options.method,
      headers: { ...options.headers },
      signal: controller.signal
    };
    if (options.credentials ?? this.credentials) init.credentials = options.credentials ?? this.credentials;
    if (options.mode) init.mode = options.mode;
    if (options.cacheMode) init.cache = options.cacheMode;

    if (options.body != null) {
      const isBodyObject = typeof options.body === 'object' &&
        !(options.body instanceof FormData) &&
        !(options.body instanceof Blob) &&
        !(options.body instanceof ArrayBuffer) &&
        !(options.body instanceof URLSearchParams);
      if (options.json !== false && isBodyObject) {
        if (!Object.keys(init.headers).some(key => key.toLowerCase() === 'content-type')) init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      } else init.body = options.body;
    }

    try {
      const response = await fetch(url, init);
      let data;
      try {
        data = await this.parseResponse(response, options.responseType || 'auto');
      } catch (error) {
        throw new GlassKitRequestError('Unable to parse server response', {
          cause: error,
          status: response.status,
          statusText: response.statusText,
          url,
          response,
          code: 'PARSE_ERROR'
        });
      }

      if (!response.ok) {
        throw new GlassKitRequestError(`Request failed with ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          url,
          data,
          response
        });
      }
      return data;
    } catch (error) {
      if (error instanceof GlassKitRequestError) throw error;
      const aborted = controller.signal.aborted;
      throw new GlassKitRequestError(aborted ? 'Request was cancelled' : 'Network request failed', {
        cause: error,
        url,
        code: aborted ? (controller.signal.reason?.name === 'TimeoutError' ? 'TIMEOUT' : 'ABORTED') : 'NETWORK_ERROR'
      });
    } finally {
      if (timer) clearTimeout(timer);
      removeAbortBridge();
    }
  }

  get(url, options = {}) { return this.request(url, { ...options, method: 'GET' }); }
  post(url, body, options = {}) { return this.request(url, { ...options, method: 'POST', body }); }
  put(url, body, options = {}) { return this.request(url, { ...options, method: 'PUT', body }); }
  patch(url, body, options = {}) { return this.request(url, { ...options, method: 'PATCH', body }); }
  delete(url, options = {}) { return this.request(url, { ...options, method: 'DELETE' }); }
}

export function createRequest(options = {}) {
  return new GlassKitRequest(options);
}
