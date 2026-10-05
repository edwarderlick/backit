# BackIt web

Next.js App Router for BackIt. Vercel root is this folder.

Live: [https://backit-seven.vercel.app/](https://backit-seven.vercel.app/)

```bash
npm install
npm run dev
```

Env (`web/.env.local`):

```text
NEXT_PUBLIC_CONTRACT_ADDRESS=0x993FC4E6B1a678f8793296d61812C63cB88fb06c
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-dev.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
```

Browser RPC goes through `POST /api/genlayer` (Studio CORS). Injected EIP-6963 wallets only. Studio Next chain 61997.
