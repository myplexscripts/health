function renderInto(target, rendered) {
  target.replaceChildren();
  if (rendered == null || rendered === false) return;
  if (typeof Node !== 'undefined' && rendered instanceof Node) target.append(rendered);
  else target.innerHTML = String(rendered);
}

export class GlassKitVirtualList {
  constructor(options = {}) {
    this.container = typeof options.container === 'string' ? document.querySelector(options.container) : options.container;
    if (!this.container) throw new Error('GlassKitVirtualList container not found');
    if (typeof options.renderItem !== 'function') throw new TypeError('GlassKitVirtualList requires renderItem(item, index)');

    this.items = Array.isArray(options.items) ? options.items : [];
    this.renderItem = options.renderItem;
    this.rowHeight = Math.max(1, Number(options.rowHeight ?? 56));
    this.overscan = Math.max(1, Math.floor(Number(options.overscan ?? 6)));
    this.key = typeof options.key === 'function' ? options.key : (_, index) => index;
    this.range = { start: -1, end: -1 };
    this.raf = 0;
    this.destroyed = false;

    this.container.classList.add('glasskit-virtual-list');
    this.container.setAttribute('role', options.role || 'list');
    this.spacer = document.createElement('div');
    this.spacer.className = 'glasskit-virtual-list__spacer';
    this.viewport = document.createElement('div');
    this.viewport.className = 'glasskit-virtual-list__viewport';
    this.spacer.append(this.viewport);
    this.container.replaceChildren(this.spacer);

    this.onScroll = () => this.scheduleRender();
    this.container.addEventListener('scroll', this.onScroll, { passive: true });
    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.scheduleRender(true)) : null;
    this.resizeObserver?.observe(this.container);
    this.refresh(true);
  }

  setItems(items = [], { preserveScroll = true } = {}) {
    const scrollTop = this.container.scrollTop;
    this.items = Array.isArray(items) ? items : [];
    this.range = { start: -1, end: -1 };
    this.refresh(true);
    if (preserveScroll) this.container.scrollTop = Math.min(scrollTop, Math.max(0, this.totalHeight() - this.container.clientHeight));
    return this;
  }

  append(items = []) {
    this.items.push(...items);
    this.refresh(true);
    return this;
  }

  totalHeight() {
    return this.items.length * this.rowHeight;
  }

  visibleRange() {
    const viewportHeight = Math.max(this.container.clientHeight, this.rowHeight);
    const first = Math.floor(this.container.scrollTop / this.rowHeight);
    const count = Math.ceil(viewportHeight / this.rowHeight);
    const start = Math.max(0, first - this.overscan);
    const end = Math.min(this.items.length, first + count + this.overscan);
    return { start, end };
  }

  scheduleRender(force = false) {
    if (this.destroyed) return;
    if (force) this.range = { start: -1, end: -1 };
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }

  refresh(force = false) {
    this.spacer.style.height = `${this.totalHeight()}px`;
    if (force) this.range = { start: -1, end: -1 };
    this.render();
    return this;
  }

  render() {
    if (this.destroyed) return;
    this.spacer.style.height = `${this.totalHeight()}px`;
    const next = this.visibleRange();
    if (next.start === this.range.start && next.end === this.range.end) return;
    this.range = next;
    this.viewport.style.transform = `translate3d(0, ${next.start * this.rowHeight}px, 0)`;

    const fragment = document.createDocumentFragment();
    for (let index = next.start; index < next.end; index += 1) {
      const row = document.createElement('div');
      row.className = 'glasskit-virtual-list__item';
      row.style.height = `${this.rowHeight}px`;
      row.dataset.index = String(index);
      row.dataset.key = String(this.key(this.items[index], index));
      row.setAttribute('role', 'listitem');
      renderInto(row, this.renderItem(this.items[index], index));
      fragment.append(row);
    }
    this.viewport.replaceChildren(fragment);
  }

  scrollToIndex(index, options = {}) {
    const bounded = Math.max(0, Math.min(this.items.length - 1, Number(index) || 0));
    const top = bounded * this.rowHeight;
    const align = options.align || 'start';
    const viewport = this.container.clientHeight;
    let target = top;
    if (align === 'center') target = top - (viewport - this.rowHeight) / 2;
    if (align === 'end') target = top - viewport + this.rowHeight;
    this.container.scrollTo({ top: Math.max(0, target), behavior: options.behavior || 'auto' });
  }

  destroy({ clear = true } = {}) {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.container.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
    this.container.classList.remove('glasskit-virtual-list');
    if (clear) this.container.replaceChildren();
  }
}

export function createVirtualList(options = {}) {
  return new GlassKitVirtualList(options);
}
