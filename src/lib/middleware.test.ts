import test from 'ava';
import sinon from 'sinon';

import { holochainMiddleware } from './middleware';
import {
  CellId,
  createZomeCallAsyncAction
  // createHolochainAdminAsyncAction
} from './actionCreator';

const urlConfig = {
  appUrl: 'ws://localhost:8888',
  adminUrl: 'ws://localhost:1234'
};

const create = () => {
  const store = {
    getState: sinon.spy(() => ({})),
    dispatch: sinon.spy()
  };
  const next = sinon.spy();
  const invoke = (action: any) =>
    holochainMiddleware(urlConfig)(store)(next)(action);

  return { store, next, invoke };
};

test('It passes non-holochain actions to the next reducer', async t => {
  let { next, invoke } = create();

  const nonHolochainAction = { type: 'not-holochain-action' };
  await invoke(nonHolochainAction);

  t.true(next.calledWith(nonHolochainAction));
});

test('It passes holochain actions and dispatches new action on success', async t => {
  let { next, invoke, store } = create();

  const profile = {
    first_name: 'c',
    last_name: 't',
    handle: 'ct',
    status: 'Online',
    avatar_url: 'test',
    address: '123123'
  };
  const actionCreator = createZomeCallAsyncAction(
    cell_id,
    'acorn_profiles',
    'create_whoami',
    cell_id[1]
  );
  const result = await invoke(actionCreator.create(profile));

  t.deepEqual(result.entry, profile);
  t.true(next.calledWith(actionCreator.create(profile)));
  t.true(store.dispatch.calledWith(actionCreator.success(result)));
});

test('It passes holochain actions and dispatches new error action on holochain error. Err is unwrapped ', async t => {
  let { next, invoke, store } = create();

  const actionCreator = createZomeCallAsyncAction(
    cell_id,
    'acorn_profiles',
    'create_whoami',
    cell_id[1]
  );

  try {
    await invoke(actionCreator.create(null));
  } catch (result) {
    const e = new Error(
      JSON.stringify({
        type: 'Error',
        data: {
          type: 'RibosomeError',
          data:
            'Wasm error while working with Ribosome: Zome("failed to deserialize args: FromBytes(\\"invalid type: unit value, expected struct Profile\\")")'
        }
      })
    );
    t.deepEqual(result, e);
    t.true(next.calledWith(actionCreator.create(null)));
    t.deepEqual(store.dispatch.lastCall.args[0], actionCreator.failure(e));
  }
});

const cell_id: CellId = [
  {
    hash: Buffer.from([
      0x54,
      0x6c,
      0x93,
      0x85,
      0x9e,
      0x32,
      0xa6,
      0xa3,
      0x1f,
      0xb4,
      0x0d,
      0x4c,
      0x75,
      0x8d,
      0x5e,
      0xcd,
      0x26,
      0xdf,
      0x72,
      0xd3,
      0xe2,
      0xd8,
      0x87,
      0xde,
      0x14,
      0xe9,
      0x79,
      0x78,
      0x49,
      0x20,
      0x95,
      0x36,
      0x64,
      0x3f,
      0x6b,
      0xc2
    ]),
    hash_type: Buffer.from([0x84, 0x2d, 0x24])
  },
  {
    hash: Buffer.from([
      0x7c,
      0xf2,
      0x9d,
      0xc1,
      0xf4,
      0xc6,
      0x05,
      0xe7,
      0x7b,
      0x88,
      0x20,
      0x8d,
      0xce,
      0x67,
      0xbe,
      0xd9,
      0x37,
      0x38,
      0x94,
      0x2c,
      0x30,
      0xe7,
      0x0e,
      0xcb,
      0x2d,
      0x60,
      0x52,
      0xea,
      0x3e,
      0x63,
      0x2a,
      0x5f,
      0xb8,
      0xbc,
      0x66,
      0xbd
    ]),
    hash_type: Buffer.from([0x84, 0x20, 0x24])
  }
];
