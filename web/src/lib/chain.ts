import { studioDevnet } from "genlayer-js/chains";

/** Studio Next / Consensus v0.6 preview. Not the old StudioNet chain 61999. */
export const STUDIO_NEXT_CHAIN_ID = 61997;
export const PUBLIC_RPC =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ||
  "https://studio-dev.genlayer.com/api";
export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";
export const DEFAULT_CONTRACT_ADDRESS = "0x42C9dC27178470A2Bd853Ae15C49E5aa7Cb1ec68" as const;
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS
) as `0x${string}`;

export const STUDIO_NEXT_HEX = `0x${STUDIO_NEXT_CHAIN_ID.toString(16)}`;

export const STUDIO_NEXT_CHAIN = {
  ...studioDevnet,
  id: STUDIO_NEXT_CHAIN_ID,
  name: "GenLayer Studio Next",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: [PUBLIC_RPC] as readonly string[] },
  },
  blockExplorers: {
    default: { name: "Studio Next", url: EXPLORER_URL },
  },
};

/** Wallet add/switch must use the public RPC. Browser reads go through the proxy. */
export function browserRpc(): string {
  if (typeof window === "undefined") return PUBLIC_RPC;
  return `${window.location.origin}/api/genlayer`;
}

export function kitChain() {
  return {
    ...STUDIO_NEXT_CHAIN,
    rpcUrls: { default: { http: [browserRpc()] as readonly string[] } },
  };
}
