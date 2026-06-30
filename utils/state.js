const state = new Map();

export function setState(userId, data) {
  state.set(userId, data);
}

export function getState(userId) {
  return state.get(userId);
}

export function clearState(userId) {
  state.delete(userId);
}
