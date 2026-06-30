export function generateCode(id) {
  return `${id}${Math.random().toString(36).substring(2, 8)}`;
}
