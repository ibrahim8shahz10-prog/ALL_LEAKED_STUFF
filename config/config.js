export function getConfig(env) {
  return {
    BOT_TOKEN: env.BOT_TOKEN,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
    ADMIN_ID: env.ADMIN_ID
  };
}
