import type { EVENT_LISTENER_TYPE, WALLET_TYPE } from '../constants';

export type WalletType = typeof WALLET_TYPE[keyof typeof WALLET_TYPE];
export type EventListenerType = typeof EVENT_LISTENER_TYPE[keyof typeof EVENT_LISTENER_TYPE];

export type CosmostationAccount = {
  address: Uint8Array;
  algo: string;
  bech32Address: string;
  isNanoLedger: boolean;
  name: string;
  pubKey: Uint8Array;
};

export type Account = {
  address: string;
  pubkey: string;
  algo: string;
};

export type Msg<T = unknown> = {
  type: string;
  value: T;
};

export type Amount = {
  denom: string;
  amount: string;
};

export type Fee = { amount: Amount[]; gas: string };

export type SignAminoDoc = {
  chain_id: string;
  sequence: string;
  account_number: string;
  fee: Fee;
  memo: string;
  msgs: Msg[];
};

export type SignAminoResponse = {
  signature: string;
  signDoc: SignAminoDoc;
};

export type SignDirectDoc = { chainId: string; accountNumber: string; authInfoBytes: string; bodyBytes: string };

export type SignDirectResponse = {
  signature: string;
  signDoc: SignDirectDoc;
};

export type Cosmostation = {
  getAccounts: (chainId: string) => Promise<Account[]>;
  signAmino: (signer: string, doc: SignAminoDoc) => Promise<SignAminoResponse>;
  signDirect: (signer: string, doc: SignDirectDoc) => Promise<SignDirectResponse>;
  request: <T = unknown, P = unknown>({ method, params }: { method: string; params: P }) => Promise<T>;
  on: (event: EventListenerType, handler: (data?: unknown) => void) => void;
  off: (event: EventListenerType, handler: (data?: unknown) => void) => void;
};

export type CosAccountResponse = { publicKey: Uint8Array; address: string; name: string; isLedger: boolean; isEthermint: boolean };
