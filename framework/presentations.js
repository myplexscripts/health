const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function positionActionSheet(overlay, trigger) {
  const sheet = overlay.querySelector('.ios-action-sheet');
  if (!sheet || !trigger) return;

  const source = trigger.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(420, innerWidth - margin * 2);
  const sourceMid = source.left + source.width / 2;
  const left = clamp(sourceMid - width / 2, margin, innerWidth - width - margin);

  overlay.dataset.iosActionAnchored = 'true';
  overlay.style.setProperty('--ios-action-left', `${left}px`);
  overlay.style.setProperty('--ios-action-top', `${Math.min(source.bottom + 8, innerHeight - margin)}px`);
  overlay.style.setProperty('--ios-action-source-x', `${clamp(sourceMid - left, 18, width - 18)}px`);

  requestAnimationFrame(() => {
    const rect = sheet.getBoundingClientRect();
    let top = source.bottom + 8;
    if (top + rect.height > innerHeight - margin) top = Math.max(margin, source.top - rect.height - 8);
    overlay.style.setProperty('--ios-action-top', `${top}px`);
  });
}

function clearActionSheet(overlay) {
  if (!overlay) return;
  delete overlay.dataset.iosActionAnchored;
  overlay.style.removeProperty('--ios-action-left');
  overlay.style.removeProperty('--ios-action-top');
  overlay.style.removeProperty('--ios-action-source-x');
}

export function initPresentationAdaptation(root = document) {
  if (root.__iosPresentationAdaptation) return root.__iosPresentationAdaptation;

  root.addEventListener('click', event => {
    const trigger = event.target.closest('[data-ios-present]');
    if (!trigger || !root.contains(trigger)) return;
    const name = trigger.dataset.iosPresent;
    const overlay = document.querySelector(`[data-ios-overlay="${CSS.escape(name)}"]`);
    if (overlay?.querySelector('.ios-action-sheet')) positionActionSheet(overlay, trigger);
  }, true);

  document.addEventListener('click', event => {
    const dismiss = event.target.closest('[data-ios-dismiss]');
    if (!dismiss) return;
    clearActionSheet(dismiss.closest('[data-ios-overlay]'));
  });

  addEventListener('resize', () => {
    document.querySelectorAll('[data-ios-overlay][data-ios-action-anchored]').forEach(overlay => clearActionSheet(overlay));
  });

  root.__iosPresentationAdaptation = { clearActionSheet };
  return root.__iosPresentationAdaptation;
}

function autoInit() {
  document.querySelectorAll('[data-ios-app]').forEach(initPresentationAdaptation);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit, { once: true });
else autoInit();
