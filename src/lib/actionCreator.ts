import { AgentPubKey } from '@holochain/conductor-api';
import { createAsyncAction } from 'typesafe-actions';

export type Hash = {
  hash: Buffer;
  hash_type: Buffer;
};
export type CellId = [Hash, AgentPubKey];

const HASH_DIVIDER = '[:hash_divider:]';
export function hashToString(hash: Hash) {
  // nodejs
  if (typeof window === 'undefined') {
    return (
      hash.hash_type.toString('hex') + HASH_DIVIDER + hash.hash.toString('hex')
    );
  }
  // browser
  else {
    return hash.hash_type.toString() + HASH_DIVIDER + hash.hash.toString();
  }
}

export function hashFromString(str: string) {
  const [hashtypestring, hashstring] = str.split(HASH_DIVIDER);
  // nodejs
  if (typeof window === 'undefined') {
    return {
      hash: Buffer.from(hashstring, 'hex'),
      hash_type: Buffer.from(hashtypestring, 'hex')
    };
  }
  // browser
  else {
    return {
      hash: Buffer.from(hashstring.split(',')),
      hash_type: Buffer.from(hashtypestring.split(','))
    };
  }
}

const CELL_ID_DIVIDER = '[:cell_id_divider:]';
export function cellIdToString(cellId: CellId) {
  // [DnaHash, AgentPubKey]
  return hashToString(cellId[0]) + CELL_ID_DIVIDER + hashToString(cellId[1]);
}

export function cellIdFromString(str: string) {
  // [DnaHash, AgentPubKey]
  const [dnahashstring, agentpubkeyhashstring] = str.split(CELL_ID_DIVIDER);
  return [hashFromString(dnahashstring), hashFromString(agentpubkeyhashstring)];
}

export interface HcPayload {
  payload: any;
  cellIdString: string;
}

/**
 *
 * Function that creates action creators for holochain zome function calls
 *
 */
export const createZomeCallAsyncAction = (
  zome_name: string,
  fn_name: string
) => {
  const callString = [zome_name, fn_name].join('/');

  const asyncActionCreator = createAsyncAction(
    callString,
    callString + '_SUCCESS',
    callString + '_FAILURE'
  );
  const action = asyncActionCreator();

  const newAction = action as typeof action & {
    create: (param: HcPayload) => any;
    sig: (param: HcPayload) => Promise<any>;
  };

  // the action creators that are produced
  newAction.create = (param: HcPayload) => {
    const cell_id = cellIdFromString(param.cellIdString);
    return {
      type: callString,
      meta: {
        hcZomeCallAction: true,
        cellIdString: param.cellIdString,
        cell_id,
        zome_name,
        fn_name,
        provenance: cell_id[1] // AgentPubKey
      },
      payload: param.payload
    };
  };

  return newAction;
};
