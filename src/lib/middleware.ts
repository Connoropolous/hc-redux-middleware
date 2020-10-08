import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux';
import {
  AppWebsocket,
} from '@holochain/conductor-api';

export async function zomeCall(
  connectPromise: Promise<AppWebsocket>,
  store: MiddlewareAPI<Dispatch<AnyAction>, any>,
  action: AnyAction
) {
  const app = await connectPromise;
  const { cell_id, zome_name, fn_name, provenance, cellIdString } = action.meta;
  const { payload } = action;
  try {
    const response = await app.callZome({
      cap: null,
      cell_id,
      zome_name,
      fn_name,
      provenance,
      payload
    });
    store.dispatch({
      type: action.type + '_SUCCESS',
      meta: {
        cellIdString
      },
      payload: response
    });
    return response;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(JSON.stringify(e));
    store.dispatch({
      type: action.type + '_FAILURE',
      meta: {
        cellIdString
      },
      payload: error
    });
    throw error;
  }
}

export const holochainMiddleware = (appUrl: string): Middleware => store => {
  // stuff here has the same life as the store!
  // this is how we persist a websocket connection
  const connectPromise = AppWebsocket.connect(appUrl);
  return next => async (action: AnyAction) => {
    if (action.meta && action.meta.hcZomeCallAction) {
      // zome call action
      next(action); // resend the original action so the UI can change based on requests
      return zomeCall(connectPromise, store, action);
    } else {
      next(action);
    }
  };
};
