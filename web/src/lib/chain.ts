export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_RPC =
  process.env.NEXT_PUBLIC_STUDIO_RPC_URL || "https://studio.genlayer.com/api";
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "") as `0x${string}`;

export const STUDIONET_HEX = `0x${STUDIONET_CHAIN_ID.toString(16)}`;
