import { IntentsUserId } from "@defuse-protocol/defuse-sdk";
import { BlockchainEnum } from "../utils/intents/poaBridge/constants/blockchains";
import {
  getDepositAddress,
  getSupportedTokens,
} from "../utils/intents/poaBridge/poaBridgeHttpClient";
import { logger } from "../utils/intents/logger";

/**
 * Generate a deposit address for the specified blockchain and asset
 * through the POA bridge API call.
 *
 * @param userAddress - The user address from the wallet
 * @param chain - The blockchain for which to generate the address
 * @returns A Promise that resolves to the generated deposit address
 */
export async function generateDepositAddress(
  userAddress: IntentsUserId,
  chain: BlockchainEnum
): Promise<string> {
  try {
    const supportedTokens = await getSupportedTokens({
      chains: [chain],
    });

    if (supportedTokens.tokens.length === 0) {
      throw new Error("No supported tokens found");
    }

    const generatedDepositAddress = await getDepositAddress({
      account_id: userAddress,
      chain,
    });

    return generatedDepositAddress.address;
  } catch (error) {
    logger.error(
      new Error("Error generating deposit address", { cause: error })
    );
    throw error;
  }
}
