import { fmtDate } from './dateUtils';

export function normalizePhoneForWa(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

export function buildReminderMessage(academyName, student, statusInfo) {
  const dateStr = fmtDate(statusInfo.dueDate);
  if (statusInfo.status === 'overdue') {
    return `Hi! This is a reminder from ${academyName} that ${student.name}'s monthly payment for ${student.class} was due on ${dateStr} and is now overdue. Please arrange payment when you can. Thank you!`;
  }
  return `Hi! This is a friendly reminder from ${academyName} that ${student.name}'s monthly payment for ${student.class} is due on ${dateStr}. Thank you!`;
}

/** Opens WhatsApp (app or web) with the parent's number and a
 * pre-filled message. No API keys or backend needed - this is just
 * WhatsApp's public "click to chat" link. */
export function openWhatsApp(phone, message) {
  const num = normalizePhoneForWa(phone);
  if (!num) {
    alert("This student doesn't have a valid phone number saved.");
    return;
  }
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener,noreferrer');
}
