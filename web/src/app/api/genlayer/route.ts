import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function isRetryable(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function retryDelay(attempt: number) {
  return Math.min(6000, 500 * 2 ** attempt);
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const url =
    process.env.GENLAYER_RPC_URL ||
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ||
    "https://studio-dev.genlayer.com/api";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Invalid JSON-RPC request body" },
      },
      { status: 400 },
    );
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (isRetryable(response.status) && attempt < 3) {
        lastError = new Error(`GenLayer node returned HTTP ${response.status}`);
        await delay(retryDelay(attempt));
        continue;
      }
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          jsonrpc: "2.0",
          id: (body as { id?: unknown })?.id ?? null,
          error: {
            code: -32000,
            message: `GenLayer node returned non-JSON HTTP ${response.status}`,
            data: text.slice(0, 1000),
          },
        };
      }
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delay(retryDelay(attempt));
        continue;
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  const cause = lastError instanceof Error ? String((lastError as { cause?: unknown }).cause ?? "") : "";
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: (body as { id?: unknown })?.id ?? null,
      error: {
        code: -32000,
        message: "Failed to connect to GenLayer node",
        data: { url, message, cause },
      },
    },
    { status: 502 },
  );
}
