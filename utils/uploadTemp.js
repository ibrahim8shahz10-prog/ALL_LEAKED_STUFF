import { query } from "../database/supabase.js";

export async function createUpload(env, telegramId, categoryId, fileId) {
  await query(
    env,
    "upload_temp",
    "DELETE",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  await query(env, "upload_temp", "POST", {
    telegram_id: telegramId,
    category_id: categoryId,
    file_id: fileId
  });
}

export async function getUpload(env, telegramId) {
  const res = await query(
    env,
    "upload_temp",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  return res[0] || null;
}

export async function updateUpload(env, telegramId, body) {
  await query(
    env,
    "upload_temp",
    "PATCH",
    body,
    `?telegram_id=eq.${telegramId}`
  );
}

export async function deleteUpload(env, telegramId) {
  await query(
    env,
    "upload_temp",
    "DELETE",
    null,
    `?telegram_id=eq.${telegramId}`
  );
}
