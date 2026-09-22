import { fmtDate } from './dateUtils.js';
import { translate } from '../i18n-strings.js';

export function normalizePhoneForWa(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

// Always Arabic, regardless of which language the staff member currently has
// the app set to - this is what the parent reads, not the staff. Uses Latin
// digits (ar-u-nu-latn) so the date matches the phone number and amounts.
export function buildReminderMessage(academyName, student, statusInfo) {
  const params = {
    academy: academyName,
    name: student.name,
    klass: student.class,
    date: fmtDate(statusInfo.dueDate, 'ar-u-nu-latn'),
  };
  return translate('ar', statusInfo.status === 'overdue' ? 'wa_overdue' : 'wa_soon', params);
}

/** Opens WhatsApp (app or web) with the parent's number and a
 * pre-filled message. No API keys or backend needed - this is just
 * WhatsApp's public "click to chat" link. */
export function openWhatsApp(phone, message, t) {
  const num = normalizePhoneForWa(phone);
  if (!num) {
    alert(t('wa_no_phone'));
    return;
  }
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener,noreferrer');
}
