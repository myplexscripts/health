const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ICONS = {
  house: '<path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09a1.7 1.7 0 0 0-1.1-1.51 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.36.37.7.6 1 .3.3.7.45 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  ellipsis: '<circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  xmark: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  share: '<path d="M12 16V3M8 7l4-4 4 4"/><path d="M6 10H4v11h16V10h-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z"/><path d="M10 21h4"/>',
  heart: '<path d="M20.8 5.9c-1.8-2-5-2.1-6.9-.2L12 7.6l-1.9-1.9C8.2 3.8 5 3.9 3.2 5.9c-1.8 2-.9 5 .8 6.7L12 20l8-7.4c1.7-1.7 2.6-4.7.8-6.7Z"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 3.4-6 8-6s7.2 1.8 8 6"/>',
  folder: '<path d="M3 6h7l2 2h9v11H3Z"/>',
  document: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
  sliders: '<path d="M4 6h7M15 6h5M13 4v4M4 12h3M11 12h9M9 10v4M4 18h10M18 18h2M16 16v4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
  pencil: '<path d="m4 20 4.2-1 10.7-10.7a2 2 0 0 0-2.8-2.8L5.4 16.2Z"/><path d="m14.8 6.8 2.4 2.4"/>'
};

export function renderSymbols(root = document) {
  root.querySelectorAll('[data-ios-symbol]').forEach(node => {
    const name = node.dataset.iosSymbol;
    const body = ICONS[name];
    if (!body || node.dataset.iosSymbolRendered) return;
    node.dataset.iosSymbolRendered = 'true';
    node.innerHTML = `<svg class="ios-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  });
}

export class IOSApp {
  constructor(root) {
    this.root = typeof root === 'string' ? document.querySelector(root) : root;
    if (!this.root) throw new Error('IOSApp root not found');
    this.stack = [];
    this.activeTab = null;
    this.openOverlay = null;
    this.edgeGesture = null;
  }

  init() {
    renderSymbols(document);
    this.bindTabs();
    this.bindNavigation();
    this.bindBars();
    this.bindSegmented();
    this.bindSteppers();
    this.bindSearchFields();
    this.bindSwipeRows();
    this.bindMenus();
    this.bindContextMenus();
    this.bindOverlays();
    this.bindEdgeSwipe();
    this.activateInitialTab();
    return this;
  }

  activateInitialTab() {
    const selected = this.root.querySelector('[data-ios-tab][aria-selected="true"]') || this.root.querySelector('[data-ios-tab]');
    if (selected) this.selectTab(selected.dataset.iosTab, false);
  }

  bindTabs() {
    this.root.addEventListener('click', event => {
      const tab = event.target.closest('[data-ios-tab]');
      if (!tab || !this.root.contains(tab)) return;
      this.selectTab(tab.dataset.iosTab);
    });
  }

  selectTab(name, animate = true) {
    const panel = this.root.querySelector(`[data-ios-tab-panel="${CSS.escape(name)}"]`);
    if (!panel || name === this.activeTab) return;
    this.closeAllPushScreens();
    this.root.querySelectorAll('[data-ios-tab]').forEach(item => {
      const active = item.dataset.iosTab === name;
      item.setAttribute('aria-selected', String(active));
      item.toggleAttribute('aria-current', active);
    });
    this.root.querySelectorAll('[data-ios-tab-panel]').forEach(item => {
      const active = item === panel;
      item.hidden = !active;
      item.classList.toggle('is-active', active);
    });
    if (animate && !reducedMotion()) {
      panel.animate([{ opacity: .7 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    }
    this.activeTab = name;
    this.root.querySelector('.ios-tabbar')?.classList.remove('is-minimized');
  }

  bindNavigation() {
    this.root.addEventListener('click', event => {
      const push = event.target.closest('[data-ios-push]');
      if (push) {
        event.preventDefault();
        this.push(push.dataset.iosPush);
        return;
      }
      const back = event.target.closest('[data-ios-back]');
      if (back) {
        event.preventDefault();
        this.back();
      }
    });
  }

  currentSurface() {
    if (this.stack.length) return this.stack[this.stack.length - 1].screen;
    return this.root.querySelector('[data-ios-tab-panel]:not([hidden])');
  }

  async push(name) {
    const target = this.root.querySelector(`[data-ios-screen="${CSS.escape(name)}"]`);
    if (!target || this.stack.some(entry => entry.screen === target)) return;
    const previous = this.currentSurface();
    target.hidden = false;
    target.classList.add('is-active');
    const targetScroll = target.querySelector('.ios-scroll');
    if (targetScroll) targetScroll.scrollTop = 0;
    this.stack.push({ screen: target, previous });
    const duration = reducedMotion() ? 0 : 360;
    const animations = [];
    if (duration) {
      animations.push(target.animate([
        { transform: 'translate3d(100%,0,0)' },
        { transform: 'translate3d(0,0,0)' }
      ], { duration, easing: 'cubic-bezier(.22,.72,.18,1)', fill: 'both' }).finished);
      if (previous) animations.push(previous.animate([
        { transform: 'translate3d(0,0,0)', opacity: 1 },
        { transform: 'translate3d(-10%,0,0)', opacity: .96 }
      ], { duration, easing: 'cubic-bezier(.22,.72,.18,1)', fill: 'both' }).finished);
    }
    await Promise.allSettled(animations);
    target.getAnimations().forEach(a => a.cancel());
    previous?.getAnimations().forEach(a => a.cancel());
    previous?.classList.add('is-behind');
    target.focus({ preventScroll: true });
  }

  async back() {
    const entry = this.stack.pop();
    if (!entry) return false;
    const { screen, previous } = entry;
    previous?.classList.remove('is-behind');
    const duration = reducedMotion() ? 0 : 320;
    const animations = [];
    if (duration) {
      animations.push(screen.animate([
        { transform: screen.style.transform || 'translate3d(0,0,0)' },
        { transform: 'translate3d(100%,0,0)' }
      ], { duration, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'both' }).finished);
      if (previous) animations.push(previous.animate([
        { transform: 'translate3d(-10%,0,0)', opacity: .96 },
        { transform: 'translate3d(0,0,0)', opacity: 1 }
      ], { duration, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'both' }).finished);
    }
    await Promise.allSettled(animations);
    screen.getAnimations().forEach(a => a.cancel());
    previous?.getAnimations().forEach(a => a.cancel());
    screen.style.transform = '';
    screen.hidden = true;
    screen.classList.remove('is-active');
    previous?.focus({ preventScroll: true });
    return true;
  }

  closeAllPushScreens() {
    this.stack.forEach(({ screen, previous }) => {
      screen.hidden = true;
      screen.classList.remove('is-active');
      screen.style.transform = '';
      previous?.classList.remove('is-behind');
      previous?.getAnimations().forEach(a => a.cancel());
    });
    this.stack = [];
  }

  bindEdgeSwipe() {
    this.root.addEventListener('pointerdown', event => {
      if (!this.stack.length || event.clientX > 24 || event.pointerType === 'mouse' || this.openOverlay) return;
      const current = this.currentSurface();
      if (!current) return;
      this.edgeGesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, current, active: false };
      current.setPointerCapture?.(event.pointerId);
    });

    this.root.addEventListener('pointermove', event => {
      const state = this.edgeGesture;
      if (!state || state.id !== event.pointerId) return;
      const dx = Math.max(0, event.clientX - state.startX);
      const dy = Math.abs(event.clientY - state.startY);
      if (!state.active && dx > 8 && dx > dy * 1.25) state.active = true;
      if (!state.active) return;
      state.dx = dx;
      state.current.style.transition = 'none';
      state.current.style.transform = `translate3d(${dx}px,0,0)`;
    });

    const finish = async event => {
      const state = this.edgeGesture;
      if (!state || (event.pointerId != null && state.id !== event.pointerId)) return;
      this.edgeGesture = null;
      state.current.style.transition = '';
      if (state.active && state.dx > Math.min(110, innerWidth * .28)) {
        await this.back();
      } else if (state.active) {
        const from = state.current.style.transform || 'translate3d(0,0,0)';
        state.current.style.transform = '';
        if (!reducedMotion()) {
          await state.current.animate(
            [{ transform: from }, { transform: 'translate3d(0,0,0)' }],
            { duration: 180, easing: 'cubic-bezier(.22,.72,.18,1)' }
          ).finished.catch(() => {});
        }
      } else {
        state.current.style.transform = '';
      }
    };
    this.root.addEventListener('pointerup', finish);
    this.root.addEventListener('pointercancel', finish);
  }

  bindBars() {
    this.root.querySelectorAll('.ios-scroll').forEach(scroll => {
      let last = scroll.scrollTop;
      scroll.addEventListener('scroll', () => {
        const panel = scroll.closest('[data-ios-tab-panel], [data-ios-screen]');
        panel?.querySelector('.ios-navigation-bar')?.classList.toggle('is-scrolled', scroll.scrollTop > 28);
        if (!scroll.hasAttribute('data-ios-tabbar-minimize')) return;
        const bar = this.root.querySelector('.ios-tabbar');
        const delta = scroll.scrollTop - last;
        if (scroll.scrollTop < 20 || delta < -4) bar?.classList.remove('is-minimized');
        else if (delta > 4 && scroll.scrollTop > 60) bar?.classList.add('is-minimized');
        last = scroll.scrollTop;
      }, { passive: true });
    });
  }

  bindSegmented() {
    this.root.addEventListener('click', event => {
      const segment = event.target.closest('[data-ios-segment]');
      if (!segment) return;
      const group = segment.closest('[data-ios-segmented]');
      group?.querySelectorAll('[data-ios-segment]').forEach(item => item.setAttribute('aria-selected', String(item === segment)));
      group?.dispatchEvent(new CustomEvent('ios:change', { bubbles: true, detail: { value: segment.dataset.iosSegment } }));
    });
  }

  bindSteppers() {
    this.root.addEventListener('click', event => {
      const button = event.target.closest('[data-ios-step]');
      if (!button) return;
      const stepper = button.closest('[data-ios-stepper]');
      const output = stepper?.querySelector('[data-ios-stepper-value]');
      if (!stepper || !output) return;
      const min = Number(stepper.dataset.min ?? 0);
      const max = Number(stepper.dataset.max ?? 99);
      const step = Number(stepper.dataset.step ?? 1);
      const current = Number(output.textContent || 0);
      const next = clamp(current + (button.dataset.iosStep === 'up' ? step : -step), min, max);
      output.textContent = String(next);
      stepper.dispatchEvent(new CustomEvent('ios:change', { bubbles: true, detail: { value: next } }));
    });
  }

  bindSearchFields() {
    this.root.querySelectorAll('.ios-search-field').forEach(field => {
      const input = field.querySelector('input');
      const clear = field.querySelector('[data-ios-clear]');
      if (!input || !clear) return;
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

  bindSwipeRows() {
    this.root.querySelectorAll('[data-ios-swipe-row]').forEach(row => {
      const content = row.querySelector('.ios-swipe-content');
      const actions = row.querySelector('.ios-swipe-actions');
      if (!content || !actions) return;
      let startX = 0;
      let startY = 0;
      let base = 0;
      let dx = 0;
      let dragging = false;
      const width = () => actions.getBoundingClientRect().width;
      const close = () => {
        content.style.transition = '';
        content.style.transform = '';
        row.classList.remove('is-open');
      };
      content.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        startX = event.clientX;
        startY = event.clientY;
        base = row.classList.contains('is-open') ? -width() : 0;
        dx = base;
        dragging = true;
        content.setPointerCapture?.(event.pointerId);
      });
      content.addEventListener('pointermove', event => {
        if (!dragging) return;
        const x = event.clientX - startX;
        const y = Math.abs(event.clientY - startY);
        if (y > Math.abs(x) && y > 8) { dragging = false; return; }
        dx = clamp(base + x, -width(), 8);
        content.style.transition = 'none';
        content.style.transform = `translate3d(${dx}px,0,0)`;
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        content.style.transition = '';
        const open = Math.abs(dx) > width() * .42;
        row.classList.toggle('is-open', open);
        content.style.transform = open ? `translate3d(${-width()}px,0,0)` : '';
      };
      content.addEventListener('pointerup', end);
      content.addEventListener('pointercancel', end);
      row.querySelectorAll('[data-ios-swipe-close]').forEach(button => button.addEventListener('click', close));
    });
  }

  bindMenus() {
    this.root.addEventListener('click', event => {
      const trigger = event.target.closest('[data-ios-menu-trigger]');
      if (!trigger) return;
      event.stopPropagation();
      this.toggleMenu(trigger.dataset.iosMenuTrigger, trigger);
    });
    document.addEventListener('click', event => {
      if (event.target.closest('.ios-menu__item')) {
        this.closeMenus();
        return;
      }
      if (!event.target.closest('.ios-menu, [data-ios-menu-trigger]')) this.closeMenus();
    });
  }

  toggleMenu(name, trigger, point = null) {
    const menu = document.querySelector(`[data-ios-menu="${CSS.escape(name)}"]`);
    if (!menu) return;
    const wasOpen = menu.classList.contains('is-open');
    this.closeMenus();
    if (wasOpen) return;
    menu.hidden = false;
    menu.classList.add('is-open');
    const rect = trigger?.getBoundingClientRect();
    const x = point?.x ?? rect?.right ?? innerWidth - 16;
    const y = point?.y ?? rect?.bottom ?? 60;
    requestAnimationFrame(() => {
      const menuRect = menu.getBoundingClientRect();
      menu.style.left = `${clamp(x - menuRect.width, 12, innerWidth - menuRect.width - 12)}px`;
      menu.style.top = `${clamp(y + 8, 12, innerHeight - menuRect.height - 12)}px`;
    });
    this.openOverlay = menu;
  }

  closeMenus() {
    document.querySelectorAll('.ios-menu.is-open').forEach(menu => {
      menu.classList.remove('is-open');
      menu.hidden = true;
      menu.style.left = '';
      menu.style.top = '';
    });
    if (this.openOverlay?.classList?.contains('ios-menu')) this.openOverlay = null;
  }

  bindContextMenus() {
    this.root.querySelectorAll('[data-ios-context-menu]').forEach(target => {
      let timer = null;
      let start = null;
      let suppressClick = false;
      const open = (x, y, suppress = false) => {
        suppressClick = suppress;
        this.toggleMenu(target.dataset.iosContextMenu, null, { x, y });
      };
      target.addEventListener('contextmenu', event => {
        event.preventDefault();
        open(event.clientX, event.clientY);
      });
      target.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse') return;
        start = { x: event.clientX, y: event.clientY };
        timer = setTimeout(() => open(start.x, start.y, true), 460);
      });
      target.addEventListener('pointermove', event => {
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) clearTimeout(timer);
      });
      target.addEventListener('click', event => {
        if (!suppressClick) return;
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
      }, true);
      ['pointerup', 'pointercancel'].forEach(type => target.addEventListener(type, () => clearTimeout(timer)));
    });
  }

  bindOverlays() {
    this.root.addEventListener('click', event => {
      const trigger = event.target.closest('[data-ios-present]');
      if (trigger) {
        this.lastTrigger = trigger;
        this.present(trigger.dataset.iosPresent);
      }
      const dismiss = event.target.closest('[data-ios-dismiss]');
      if (dismiss) this.dismiss(dismiss.closest('[data-ios-overlay]'));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.openOverlay?.matches?.('[data-ios-overlay]')) this.dismiss(this.openOverlay);
    });
    document.querySelectorAll('[data-ios-overlay]').forEach(overlay => {
      overlay.addEventListener('click', event => {
        const dismiss = event.target.closest('[data-ios-dismiss]');
        if (dismiss) {
          this.dismiss(overlay);
          return;
        }
        if (event.target === overlay && overlay.dataset.dismissible !== 'false') this.dismiss(overlay);
      });
      const sheet = overlay.querySelector('.ios-sheet');
      const handle = sheet?.querySelector('[data-ios-sheet-handle]');
      if (sheet && handle) this.bindSheetDrag(overlay, sheet, handle);
    });
  }

  present(name) {
    this.closeMenus();
    const overlay = document.querySelector(`[data-ios-overlay="${CSS.escape(name)}"]`);
    if (!overlay || this.openOverlay) return;
    overlay.hidden = false;
    this.openOverlay = overlay;
    document.documentElement.classList.add('ios-modal-open');
    this.root.inert = true;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    setTimeout(() => overlay.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true }), reducedMotion() ? 0 : 180);
  }

  dismiss(overlay = this.openOverlay) {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    const delay = reducedMotion() ? 0 : 240;
    setTimeout(() => {
      overlay.hidden = true;
      overlay.querySelector('.ios-sheet')?.removeAttribute('style');
    }, delay);
    if (this.openOverlay === overlay) this.openOverlay = null;
    document.documentElement.classList.remove('ios-modal-open');
    this.root.inert = false;
    this.lastTrigger?.focus?.({ preventScroll: true });
    this.lastTrigger = null;
  }

  bindSheetDrag(overlay, sheet, handle) {
    let startY = 0;
    let dy = 0;
    let dragging = false;
    handle.addEventListener('pointerdown', event => {
      dragging = true;
      startY = event.clientY;
      dy = 0;
      sheet.style.transition = 'none';
      handle.setPointerCapture?.(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!dragging) return;
      dy = Math.max(0, event.clientY - startY);
      sheet.style.transform = `translate3d(0,${dy}px,0)`;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      if (dy > 110) this.dismiss(overlay);
      else sheet.style.transform = '';
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}

export function initIOS(root = document.querySelector('[data-ios-app]')) {
  return new IOSApp(root).init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ios-app]').forEach(root => {
      if (!root.__iosApp) root.__iosApp = new IOSApp(root).init();
    });
  }, { once: true });
} else {
  document.querySelectorAll('[data-ios-app]').forEach(root => {
    if (!root.__iosApp) root.__iosApp = new IOSApp(root).init();
  });
}
