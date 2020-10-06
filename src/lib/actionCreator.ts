import { AgentPubKey } from '@holochain/conductor-api';
import { createAsyncAction } from 'typesafe-actions';

export type DnaHash = {
  hash: Buffer,
  hash_type: Buffer,
}
export type CellId = [DnaHash, AgentPubKey]

/**
 *
 * Function that creates action creators for holochain zome function calls
 *
 */
export const createZomeCallAsyncAction = <ParamType, ReturnType>(
  cell_id: CellId,
  zome_name: string,
  fn_name: string,
  provenance: AgentPubKey
) => {
  const callString = [cell_id, zome_name, fn_name].join('/');

  const action = createAsyncAction(
    callString,
    callString + '_SUCCESS',
    callString + '_FAILURE'
  )<ParamType, ReturnType, Error>();

  const newAction = action as typeof action & {
    create: (param: ParamType) => any;
    sig: (param: ParamType) => Promise<ReturnType>;
  };

  // the action creators that are produced
  newAction.create = (payload: ParamType) => {
    return {
      type: callString,
      meta: {
        hcZomeCallAction: true,
        cell_id,
        zome_name,
        fn_name,
        provenance
      },
      payload
    };
  };

  return newAction;
};

/**
 *
 * Function that creates action creators for holochain conductor admin calls
 *
 */
export const createAdminAsyncAction = <ParamType, ReturnType>(
  command: string
) => {
  const callString = command;

  const action = createAsyncAction(
    callString,
    callString + '_SUCCESS',
    callString + '_FAILURE'
  )<ParamType, ReturnType, Error>();

  const newAction = action as typeof action & {
    create: (param: ParamType) => any;
    sig: (param: ParamType) => Promise<ReturnType>;
  };

  // the action creators that are produced
  newAction.create = (params: ParamType) => {
    return {
      type: callString,
      meta: {
        hcAdminAction: true,
        callString
      },
      payload: params
    };
  };

  return newAction;
};
