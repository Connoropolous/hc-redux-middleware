import test from 'ava';
import sinon from 'sinon';

import { holochainMiddleware } from './middleware';
import {
  // CellId,
  createZomeCallAsyncAction,
  cellIdToString,
  HcPayload
  // createHolochainAdminAsyncAction
} from './actionCreator';
import { AppWebsocket } from '@holochain/conductor-api';

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

(async () => {
  const client = await AppWebsocket.connect('ws://localhost:8888');
  const app_info = await client.appInfo({ app_id: 'test-app' });
  const cell_id = app_info.cell_data[0][0];

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
      'acorn_profiles',
      'create_whoami'
    );
    const param: HcPayload = {
      cellIdString: cellIdToString(cell_id),
      payload: profile
    };
    const result = await invoke(actionCreator.create(param));

    t.deepEqual(result.entry, profile);
    t.true(next.calledWith(actionCreator.create(param)));
    t.true(store.dispatch.calledWith(actionCreator.success(result)));
  });

  test('It passes holochain actions and dispatches new error action on holochain error. Err is unwrapped ', async t => {
    let { next, invoke, store } = create();

    const actionCreator = createZomeCallAsyncAction(
      'acorn_profiles',
      'create_whoami'
    );
    const param: HcPayload = {
      cellIdString: cellIdToString(cell_id),
      payload: null
    };

    try {
      await invoke(actionCreator.create(param));
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
      t.true(next.calledWith(actionCreator.create(param)));
      t.deepEqual(store.dispatch.lastCall.args[0], actionCreator.failure(e));
    }
  });
})();
