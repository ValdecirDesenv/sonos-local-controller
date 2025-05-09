const stateMap = new Map();

function createState(ws) {
  const state = Math.random().toString(36).substring(2, 15);
  stateMap.set(state, ws);
  return state;
}

function getWsByState(state) {
  const ws = stateMap.get(state);
  stateMap.delete(state);
  return ws;
}

module.exports = { createState, getWsByState };
