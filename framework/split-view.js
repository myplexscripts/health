const regularWidth = () => matchMedia('(min-width: 760px) and (min-height: 600px)').matches;

function resetSplit(split) {
  split.classList.remove('is-detail-open');
  split.querySelectorAll('[data-ios-split-panel]').forEach(panel => panel.hidden = panel.dataset.iosSplitPanel !== 'default' && regularWidth());
}

function bindSplit(split) {
  if (split.dataset.iosSplitBound) return;
  split.dataset.iosSplitBound = 'true';

  const sidebar = split.querySelector('.ios-split-view__sidebar');
  const content = split.querySelector('.ios-split-view__content');
  if (!sidebar || !content) return;

  split.addEventListener('click', event => {
    const show = event.target.closest('[data-ios-split-show]');
    if (show && split.contains(show)) {
      split.querySelectorAll('[data-ios-split-show]').forEach(row => {
        row.setAttribute('aria-selected', String(row === show));
      });

      const target = show.dataset.iosSplitShow;
      split.querySelectorAll('[data-ios-split-panel]').forEach(panel => {
        panel.hidden = panel.dataset.iosSplitPanel !== target;
      });

      if (!regularWidth()) {
        split.classList.add('is-detail-open');
        content.animate?.([
          { transform: 'translate3d(18%,0,0)', opacity: .82 },
          { transform: 'translate3d(0,0,0)', opacity: 1 }
        ], { duration: 240, easing: 'cubic-bezier(.22,.72,.18,1)' });
      }
      return;
    }

    const back = event.target.closest('[data-ios-split-back]');
    if (back && split.contains(back)) {
      event.preventDefault();
      split.classList.remove('is-detail-open');
      sidebar.animate?.([
        { transform: 'translate3d(-8%,0,0)', opacity: .9 },
        { transform: 'translate3d(0,0,0)', opacity: 1 }
      ], { duration: 220, easing: 'cubic-bezier(.22,.72,.18,1)' });
    }
  });

  const media = matchMedia('(min-width: 760px) and (min-height: 600px)');
  media.addEventListener?.('change', () => {
    split.classList.remove('is-detail-open');
    const selected = split.querySelector('[data-ios-split-show][aria-selected="true"]') || split.querySelector('[data-ios-split-show]');
    const target = selected?.dataset.iosSplitShow;
    split.querySelectorAll('[data-ios-split-panel]').forEach(panel => {
      panel.hidden = !!target && panel.dataset.iosSplitPanel !== target;
    });
  });
}

export function initSplitViews(root = document) {
  root.querySelectorAll('[data-ios-split-view], .ios-split-view').forEach(bindSplit);
}

function autoInit() {
  initSplitViews(document);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('[data-ios-split-view], .ios-split-view') || node.querySelector?.('[data-ios-split-view], .ios-split-view')) initSplitViews(node.parentElement || node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit, { once: true });
else autoInit();
