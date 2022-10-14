import type { AccountData, AminoSignResponse } from '@cosmjs/amino';
import type { OfflineSigner } from '@cosmjs/proto-signing';
import { cosmos } from '@cosmostation/extension-client';
import type { SignAminoDoc } from '@cosmostation/extension-client/types/message';
import { CosmostationWCModal } from '@cosmostation/wc-modal';
import { isMobile } from '@walletconnect/browser-utils';
import WalletConnect from '@walletconnect/client';
import { payloadId } from '@walletconnect/utils';

import { ExtensionInstallError, GetAccountError, MobileConnectError, SignError, WalletConnectError } from './error';
import type { Account, CosAccountResponse, Cosmostation, CosmostationAccount, SignAminoResponse, SignDirectResponse, WalletType } from './types/cosmos';

export { ExtensionInstallError };

export const getExtensionOfflineSigner = async (chainId: string): Promise<OfflineSigner> => {
  try {
    const provider = await cosmos();

    const signer: OfflineSigner = {
      getAccounts: async () => {
        const response = await provider.getAccount(chainId);
        return [{ address: response.address, pubkey: response.publicKey, algo: 'secp256k1' }];
      },
      signAmino: async (_, signDoc) => {
        const response = await provider.signAmino(chainId, signDoc as unknown as SignAminoDoc);

        return { signed: response.signed_doc, signature: { pub_key: response.pub_key, signature: response.signature } };
      },
      signDirect: async (_, signDoc) => {
        const response = await provider.signDirect(chainId, {
          account_number: String(signDoc.accountNumber),
          auth_info_bytes: signDoc.authInfoBytes,
          body_bytes: signDoc.bodyBytes,
          chain_id: signDoc.chainId,
        });
        return {
          signed: {
            accountNumber: response.signed_doc.account_number as unknown as Long,
            chainId: response.signed_doc.chain_id,
            authInfoBytes: response.signed_doc.auth_info_bytes,
            bodyBytes: response.signed_doc.body_bytes,
          },
          signature: { pub_key: response.pub_key, signature: response.signature },
        };
      },
    };

    return signer;
  } catch {
    throw new ExtensionInstallError();
  }
};

export const connectWallet = async (): Promise<WalletConnect> => {
  const connector = new WalletConnect({
    bridge: 'https://bridge.walletconnect.org',
    signingMethods: ['cosmostation_wc_accounts_v1', 'cosmostation_wc_sign_tx_v1'],
    qrcodeModal: { open(uri, cb, opts) {}, close() {} },
  });

  return new Promise((resolve, reject) => {
    void connector.killSession();
    void connector.createSession();

    connector.on('connect', (error) => {
      if (error) {
        return reject(error);
      }
      return resolve(connector);
    });
  });
};

export const getMobileOfflineSignerWithConnect = async (chainId: string): Promise<OfflineSigner> => {
  const connector = await connectWallet();

  if (!connector) {
    throw new MobileConnectError();
  }

  const signer: OfflineSigner = {
    getAccounts: async () => {
      try {
        const params = {
          id: payloadId(),
          jsonrpc: '2.0',
          method: 'cosmostation_wc_accounts_v1',
          params: [chainId],
        };
        const keys = (await connector.sendCustomRequest(params)) as CosmostationAccount[];
        const accounts = keys.map(
          (key) =>
            ({
              address: key.bech32Address,
              algo: 'secp256k1',
              pubkey: key.pubKey,
            } as AccountData),
        );
        return accounts;
      } catch (err) {
        throw new GetAccountError();
      }
    },
    signAmino: async (signerAddress, signDoc) => {
      try {
        const signedTx = (await connector.sendCustomRequest({
          id: payloadId(),
          jsonrpc: '2.0',
          method: 'cosmostation_wc_sign_tx_v1',
          params: [chainId, signerAddress, signDoc],
        })) as AminoSignResponse[];
        return signedTx[0];
      } catch (err) {
        throw new SignError();
      }
    },
  };

  return signer;
};

export const getOfflineSigner = async (chainId: string) => {
  if (isMobile()) {
    return getMobileOfflineSignerWithConnect(chainId);
  }
  return getExtensionOfflineSigner(chainId);
};

const walletConnectForInApp = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org',
});

const walletConnectForPC = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org',
});

export function hasExtension(): Promise<void> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (window.cosmostation) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      reject(new ExtensionInstallError());
    }, 500);
  });
}

export const cosmostation = async (walletType: WalletType): Promise<Cosmostation> => {
  if (isMobile()) {
    // not webview
    const dappOrigin = window.location.origin;
    window.location.href = `cosmostation://internaldapp?${dappOrigin}`;

    // webview
    try {
      if (!walletConnectForInApp.connected) {
        await walletConnectForInApp.createSession();

        walletConnectForInApp.on('connect', (error) => {
          if (error) {
            throw new WalletConnectError();
          }
        });
      }

      return {
        request: async ({ method, params }) => {
          const message = {
            id: payloadId(),
            jsonrpc: '2.0',
            method,
            params: params as unknown[],
          };

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await walletConnectForInApp.sendCustomRequest(message);
        },
        getAccounts: async (chainId) => {
          try {
            const params = {
              id: payloadId(),
              jsonrpc: '2.0',
              method: 'cosmostation_wc_accounts_v1',
              params: [chainId],
            };
            const keys = (await walletConnectForInApp.sendCustomRequest(params)) as CosmostationAccount[];
            const accounts = keys.map(
              (key) =>
                ({
                  address: key.bech32Address,
                  algo: 'secp256k1',
                  pubkey: Buffer.from(key.pubKey).toString('hex'),
                } as Account),
            );
            return accounts;
          } catch (err) {
            throw new GetAccountError();
          }
        },
        signAmino: async (signer, doc) => {
          try {
            const signedTxs = (await walletConnectForInApp.sendCustomRequest({
              id: payloadId(),
              jsonrpc: '2.0',
              method: 'cosmostation_wc_sign_tx_v1',
              params: [doc.chain_id, signer, doc],
            })) as AminoSignResponse[];

            const signedTx = signedTxs[0];

            const returnData: SignAminoResponse = {
              signature: signedTx.signature.signature,
              signDoc: signedTx.signed as SignAminoDoc,
            };
            return returnData;
          } catch (err) {
            throw new SignError();
          }
        },
        signDirect: () => {
          throw new SignError();
        },
        on: () => {
          return;
        },
        off: () => {
          return;
        },
      };
    } catch (e) {
      await walletConnectForInApp.killSession();
      throw e;
    }
  } else {
    if (walletType === 'extension') {
      try {
        await hasExtension();

        return {
          on: window.cosmostation.cosmos.on,
          off: window.cosmostation.cosmos.off,
          request: async ({ method, params }) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await window.cosmostation.cosmos.request({ method, params });
          },
          getAccounts: async (chainId) => {
            const response = (await window.cosmostation.cosmos.request({ method: 'cos_requestAccount', params: { chainName: chainId } })) as CosAccountResponse;
            return [
              { address: response.address, algo: response.isEthermint ? 'ethsecp256k1' : 'secp256k1', pubkey: Buffer.from(response.publicKey).toString('hex') },
            ];
          },
          signAmino: async (_, doc) => {
            return (await window.cosmostation.cosmos.request({ method: 'cosmos_signAmino', params: { signDoc: doc } })) as SignAminoResponse;
          },
          signDirect: async (_, doc) => {
            return (await window.cosmostation.cosmos.request({ method: 'cosmos_signDirect', params: { signDoc: doc } })) as SignDirectResponse;
          },
        };
      } catch (e) {
        throw e;
      }
    } else {
      throw new Error();
    }
  }
};

export { isMobile };
