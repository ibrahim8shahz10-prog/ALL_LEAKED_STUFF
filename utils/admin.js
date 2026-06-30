export function isAdmin(env, userId) {
  return Number(env.ADMIN_ID) === Number(userId);
}
