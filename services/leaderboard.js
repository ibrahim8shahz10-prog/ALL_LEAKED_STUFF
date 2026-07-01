import { query } from "../database/supabase.js";

export async function getLeaderboard(env) {
  return await query(
    env,
    "users",
    "GET",
    null,
    "?select=first_name,points&order=points.desc&limit=10"
  );
}
