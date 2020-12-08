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

const appUrlConfig = 'ws://localhost:8888';
const HOLOCHAIN_RUN_DEV_APP_ID = 'test-app'

const create = () => {
  const store = {
    getState: sinon.spy(() => ({})),
    dispatch: sinon.spy()
  };
  const next = sinon.spy();
  const invoke = (action: any) =>
    holochainMiddleware(appUrlConfig)(store)(next)(action);

  return { store, next, invoke };
};

(async () => {
  const client = await AppWebsocket.connect(appUrlConfig);
  const app_info = await client.appInfo({ installed_app_id: HOLOCHAIN_RUN_DEV_APP_ID });
  const cell_id = app_info.cell_data[0][0];

  const agent_address = await client.callZome({
    cap: null,
    cell_id,
    zome_name: 'acorn_profiles',
    fn_name: 'fetch_agent_address',
    payload: null,
    provenance: cell_id[1]
  });

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
      address: agent_address
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

    const meta = {
      cellIdString: cellIdToString(cell_id),
    };

    t.deepEqual(result.entry, profile);
    t.true(next.calledWith(actionCreator.create(param)));
    t.true(
      store.dispatch.calledWith({
        ...actionCreator.success(result),
        meta
      })
    );
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

    const meta = {
      cellIdString: cellIdToString(cell_id),
    };

    try {
      await invoke(actionCreator.create(param));
    } catch (result) {
      const e = new Error(
        JSON.stringify({
          type: 'error',
          data: {
            type: 'ribosome_error',
            data:
              'Wasm error while working with Ribosome: Zome("failed to deserialize args: FromBytes(\\"invalid type: unit value, expected struct Profile\\")")'
          }
        })
      );
      t.deepEqual(result, e);
      t.true(next.calledWith(actionCreator.create(param)));
      t.deepEqual(store.dispatch.lastCall.args[0], {
        ...actionCreator.failure(e),
        meta // supposed to be this way, key = value
      });
    }
  });
})();
