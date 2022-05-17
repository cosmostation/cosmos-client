import type { OfflineSigner } from '@cosmjs/proto-signing';
import { tendermint } from '@cosmostation/extension-client';
import type { SignAminoDoc, SignDirectDoc } from '@cosmostation/extension-client/types/message';

export const getExtensionOfflineSigner = async (chainId: string): Promise<OfflineSigner | null> => {
  try {
    const provider = await tendermint();

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
        const response = await provider.signDirect(chainId, signDoc as unknown as SignDirectDoc);
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
    return null;
  }
};

export const getOfflineSigner = async (chainId: string) => (await getExtensionOfflineSigner(chainId)) || null;
