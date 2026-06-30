import { query } from "../database/supabase.js";

export async function getLeaderboard(env) {
  return await query(
    env,
    "users",
    "GET",
    null,
    "?select=first_name,credits&order=credits.desc&limit=10"
  );
}
