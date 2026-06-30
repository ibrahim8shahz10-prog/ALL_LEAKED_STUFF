export function escapeHTML(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isAdmin(env, telegramId) {
  return Number(env.ADMIN_ID) === Number(telegramId);
}
