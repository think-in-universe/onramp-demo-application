import { nearFailoverRpcProvider } from "./failover";

/**
 * NEAR RPC providers list from official docs:
 * https://docs.near.org/api/rpc/providers
 */
const reserveRpcUrls = [
  "https://near.lava.build",
  "https://free.rpc.fastnear.com",
  "https://rpc.mainnet.near.org",
];

export const nearClient = nearFailoverRpcProvider({
  urls: reserveRpcUrls,
});
