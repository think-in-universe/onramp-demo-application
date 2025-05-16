/**
 * Utility functions for Coinbase Onramp and Offramp URL generation
 */
import { getOnrampBuyUrl } from "@coinbase/onchainkit/fund";

interface OnrampURLParams {
  asset: string;
  amount: string;
  network: string;
  paymentMethod: string;
  paymentCurrency?: string;
  address: string;
  partnerUserId: string;
  redirectUrl: string;
  sessionId?: string;
  enableGuestCheckout?: boolean;
}

interface OfframpURLParams {
  asset: string;
  amount: string;
  network: string;
  cashoutMethod: string;
  address: string;
  redirectUrl: string;
  sessionId?: string;
}

// Coinbase Developer Platform Project ID
const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID!;

/**
 * Generates a Coinbase Onramp URL with the provided parameters
 */
export function generateOnrampURL(params: OnrampURLParams): string {
  const {
    asset,
    amount,
    network,
    paymentMethod,
    paymentCurrency,
    address,
    partnerUserId,
    redirectUrl,
    sessionId,
    enableGuestCheckout,
  } = params;

  // Parse amount to a number for presetFiatAmount
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) {
    throw new Error("Invalid amount provided");
  }

  // Base URL for Coinbase Onramp
  const baseUrl = "https://pay.coinbase.com/buy/select-asset";

  // Build query parameters
  const queryParams = new URLSearchParams();

  // Required parameters
  queryParams.append("appId", CDP_PROJECT_ID);

  // Format addresses as a JSON string: {"address":["network"]}
  const addressesObj: Record<string, string[]> = {};
  addressesObj[address || "0x0000000000000000000000000000000000000000"] = [
    network,
  ];
  queryParams.append("addresses", JSON.stringify(addressesObj));

  // Optional parameters
  if (asset) {
    queryParams.append("assets", JSON.stringify([asset]));
    queryParams.append("defaultAsset", asset);
  }

  if (network) queryParams.append("defaultNetwork", network);

  // Format payment method properly
  if (paymentMethod) {
    // Convert to uppercase for consistency with API expectations
    const formattedPaymentMethod = paymentMethod.toUpperCase();
    queryParams.append("defaultPaymentMethod", formattedPaymentMethod);
  }

  // Add fiat amount and currency
  if (numericAmount > 0) {
    queryParams.append("presetFiatAmount", numericAmount.toString());
  }

  if (paymentCurrency) {
    queryParams.append("fiatCurrency", paymentCurrency);
  }

  // Add partner user ID (limited to 49 chars)
  queryParams.append("partnerUserId", partnerUserId.substring(0, 49));

  // Add redirect URL
  if (redirectUrl) {
    queryParams.append("redirectUrl", redirectUrl);
  } else {
    // Note: This is a demo app - actual payments require ownership of
    // assets and sufficient funds
    queryParams.append(
      "redirectUrl",
      "https://coinbase-on-off-ramp.vercel.app/onramp"
    );
  }

  // Add session token if provided
  if (sessionId) {
    queryParams.append("sessionToken", sessionId);
  }

  // Add guest checkout parameter if provided
  if (enableGuestCheckout !== undefined) {
    queryParams.append("enableGuestCheckout", enableGuestCheckout.toString());
  }

  // Return the complete URL
  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Generates a Coinbase Offramp URL with the provided parameters
 */
export function generateOfframpURL(params: OfframpURLParams): string {
  try {
    const { asset, amount, network, cashoutMethod, address, redirectUrl } =
      params;

    // Base URL
    const baseUrl = "https://pay.coinbase.com/v3/sell/input";

    // Create query parameters
    const queryParams = new URLSearchParams();

    // Add required parameters
    queryParams.append("appId", CDP_PROJECT_ID);

    // Add partner user ID (must be unique and less than 50 chars)
    const userId = address
      ? address.substring(0, 49)
      : "anonymous-" + Date.now();
    queryParams.append("partnerUserId", userId);

    // Add addresses parameter - this is the most critical part
    // Format: {"address":["network1","network2"]}
    const addressesObj: Record<string, string[]> = {};
    const validAddress =
      address || "0x4315d134aCd3221a02dD380ADE3aF39Ce219037c";
    addressesObj[validAddress] = [network || "ethereum"];
    queryParams.append("addresses", JSON.stringify(addressesObj));

    // Add assets parameter
    queryParams.append("assets", JSON.stringify([asset]));

    // Add optional parameters if provided
    if (asset) queryParams.append("defaultAsset", asset);
    if (network) queryParams.append("defaultNetwork", network);
    if (cashoutMethod)
      queryParams.append("defaultCashoutMethod", cashoutMethod);

    // Add amount parameter to pre-fill the amount field
    // For offramp, we should only pass the fiat amount (USD)
    // Let Coinbase handle the conversion to crypto
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      // Only pass the fiat amount, not the crypto amount
      queryParams.append("presetFiatAmount", numericAmount.toString());
    }

    // Add redirect URL
    // Note: This is a demo app - actual payments require ownership of assets and sufficient funds
    queryParams.append(
      "redirectUrl",
      redirectUrl || "https://coinbase-on-off-ramp.vercel.app/offramp"
    );

    // Return the complete URL
    return `${baseUrl}?${queryParams.toString()}`;
  } catch (error) {
    console.error("Error generating offramp URL:", error);
    // Return a simple fallback URL with the same redirect pattern as the main function
    // Note: This is a demo app - actual payments require ownership of assets and sufficient funds
    return `https://pay.coinbase.com/v3/sell/input?appId=${CDP_PROJECT_ID}&partnerUserId=anonymous&assets=["USDC"]&addresses={"0x4315d134aCd3221a02dD380ADE3aF39Ce219037c":["ethereum"]}&redirectUrl=${encodeURIComponent("https://coinbase-on-off-ramp.vercel.app/offramp")}`;
  }
}

/**
 * Generates a transaction status URL for checking the status of a transaction
 */
export function generateTransactionStatusURL(transactionId: string): string {
  return `https://pay.coinbase.com/api/v1/transactions/${transactionId}`;
}
