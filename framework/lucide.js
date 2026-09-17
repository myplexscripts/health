const LUCIDE_VERSION = '1.46.0';
const LUCIDE_CDN = `https://unpkg.com/lucide@${LUCIDE_VERSION}/dist/umd/lucide.min.js`;

const ICON_MAP = {
  house: 'house',
  grid: 'layout-grid',
  gear: 'settings',
  search: 'search',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  ellipsis: 'ellipsis',
  plus: 'plus',
  minus: 'minus',
  xmark: 'x',
  check: 'check',
  trash: 'trash-2',
  share: 'share',
  info: 'info',
  bell: 'bell',
  heart: 'heart',
  person: 'user',
  folder: 'folder',
  document: 'file-text',
  sliders: 'sliders-horizontal',
  star: 'star',
  pencil: 'pencil',
  calendar: 'calendar-days',
  clock: 'clock-3',
  image: 'image',
  play: 'play',
  bookmark: 'bookmark',
  download: 'download',
  upload: 'upload',
  refresh: 'refresh-cw',
  filter: 'list-filter',
  sort: 'arrow-up-down',
  moreHorizontal: 'ellipsis',
  mail: 'mail',
  phone: 'phone',
  link: 'link',
  externalLink: 'external-link',
  lock: 'lock',
  eye: 'eye',
  eyeOff: 'eye-off',
  circleCheck: 'circle-check',
  circleAlert: 'circle-alert',
  triangleAlert: 'triangle-alert',
  grip: 'grip-vertical',
  arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right',
  panelLeft: 'panel-left',
  panelRight: 'panel-right',
  columns: 'columns-3',
  list: 'list',
  rows: 'rows-3',
  cards: 'panels-top-left'
};

let loaderPromise = null;
let observer = null;

function loadLucide() {
  if (window.lucide?.createIcons) return Promise.resolve(window.lucide);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ios-lucide]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.lucide), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = LUCIDE_CDN;
    script.async = true;
    script.dataset.iosLucide = LUCIDE_VERSION;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => resolve(window.lucide), { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.append(script);
  });

  return loaderPromise;
}

function prepareIcons(root = document) {
  const nodes = [];
  if (root.matches?.('[data-ios-symbol]')) nodes.push(root);
  root.querySelectorAll?.('[data-ios-symbol]').forEach(node => nodes.push(node));

  nodes.forEach(node => {
    const requested = node.dataset.iosSymbol;
    const lucideName = ICON_MAP[requested] || requested.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
    node.removeAttribute('data-ios-symbol');
    node.removeAttribute('data-ios-symbol-rendered');
    node.innerHTML = '';
    node.setAttribute('data-lucide', lucideName);
  });
}

export async function renderLucide(root = document) {
  prepareIcons(root);
  try {
    const lucide = await loadLucide();
    if (!lucide?.createIcons) return false;
    lucide.createIcons({
      attrs: {
        class: 'lucide ios-symbol',
        'aria-hidden': 'true',
        'focusable': 'false'
      }
    });
    return true;
  } catch {
    /* ios.js provides a small built-in fallback if the CDN is unavailable. */
    return false;
  }
}

export function initLucide(root = document) {
  renderLucide(root);
  if (observer) return observer;

  observer = new MutationObserver(records => {
    let changed = false;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('[data-ios-symbol]') || node.querySelector('[data-ios-symbol]')) {
          prepareIcons(node);
          changed = true;
        }
      }
    }
    if (changed && window.lucide?.createIcons) {
      window.lucide.createIcons({
        attrs: {
          class: 'lucide ios-symbol',
          'aria-hidden': 'true',
          'focusable': 'false'
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return observer;
}

function autoInit() {
  initLucide(document);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit, { once: true });
else autoInit();
