import { focusableSelector } from '../shared/config.js';

let activeRoot = null;
let lastFocusedElement = null;

export function rememberFocus() {
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

export function restoreFocus() {
  if (lastFocusedElement && lastFocusedElement.isConnected && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

export function activateFocusTrap(root) {
  activeRoot = root;
}

export function deactivateFocusTrap(root) {
  if (activeRoot === root) {
    activeRoot = null;
  }
}

function getFocusable(root) {
  return Array.from(root.querySelectorAll(focusableSelector)).filter((element) => {
    return !element.hasAttribute('disabled') && (element.offsetParent !== null || element === document.activeElement);
  });
}

export function handleFocusTrap(event) {
  if (event.key !== 'Tab' || !activeRoot) return;
  const focusable = getFocusable(activeRoot);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !activeRoot.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last || !activeRoot.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}
