import { TELEGRAM_URL } from '../shared/config.js';

export function openTelegram() {
  window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer');
}
