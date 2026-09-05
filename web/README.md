# BackIt web

Next.js App Router for BackIt. Vercel root is this folder.

Live: [https://backit-seven.vercel.app/](https://backit-seven.vercel.app/)

```bash
npm install
npm run dev
```

Env (`web/.env.local`):

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568
NEXT_PUBLIC_STUDIO_RPC_URL=https://studio.genlayer.com/api
```

Browser RPC goes through `POST /api/genlayer` (Studio CORS). Injected EIP-6963 wallets only. Chain 61999.
