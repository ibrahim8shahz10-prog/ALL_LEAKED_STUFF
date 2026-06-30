import { query } from "../database/supabase.js";

export async function getChannels(env) {
  return await query(env, "required_channels");
}
