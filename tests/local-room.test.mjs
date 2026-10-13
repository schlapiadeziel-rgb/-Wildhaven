import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRoom } from '../game/online.js';

function installBridge(t) {
  const sent = [];
  const listeners = new Map();
  const previousWindow = globalThis.window;
  const previousBridge = globalThis.WildhavenLink;
  globalThis.window = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
  globalThis.WildhavenLink = { send: message => sent.push(JSON.parse(message)), stop() {} };
  t.after(() => {
    globalThis.window = previousWindow;
    globalThis.WildhavenLink = previousBridge;
  });
  return sent;
}

test('nearby host publishes its own position and keeps room membership within four players', t => {
  const sent = installBridge(t);
  let peers = [];
  const room = new LocalRoom({ host: true, playerId: 'host', name: '队长' }, {
    position: () => ({ x: 8, z: 12, angle: 1, moving: true }),
    snapshot: () => ({ game: {}, enemies: [], actors: {} }),
    peers: value => { peers = value; },
    world() {}, action() {}, status() {},
  });
  room.start();
  for (const id of ['guest-a', 'guest-b', 'guest-c', 'guest-overflow']) {
    room.receive(JSON.stringify({ kind: 'update', sender: id, name: id, position: { x: id.length, z: 4 }, actions: [] }));
  }
  room.sync();
  room.leave();
  const state = sent.at(-1);
  assert.equal(state.kind, 'state');
  assert.equal(state.players.length, 4);
  assert.deepEqual(state.players.find(peer => peer.id === 'host').position, { x: 8, z: 12, angle: 1, moving: true });
  assert.equal(state.players.some(peer => peer.id === 'guest-overflow'), false);
  assert.equal(peers.length, 4);
});
