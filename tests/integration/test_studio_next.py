"""Studio Next coverage. The chain-id check hits the live preview RPC.

A deployed-contract read runs when BACKIT_CONTRACT is set.
"""

import json
import os
import subprocess
import urllib.request

import pytest

RPC = os.environ.get("BACKIT_RPC", "https://studio-dev.genlayer.com/api")
CHAIN_ID = 61997


def _rpc(method: str, params: list):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        RPC,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "backit-studio-next/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        payload = json.loads(res.read().decode())
    if "error" in payload:
        raise AssertionError(payload["error"])
    return payload["result"]


def test_studio_next_chain_id():
    raw = _rpc("eth_chainId", [])
    assert int(raw, 16) == CHAIN_ID


def test_studio_next_is_not_studionet():
    # Stable StudioNet is 61999. This preview must not be that deployment.
    assert int(_rpc("eth_chainId", []), 16) != 61999


@pytest.mark.skipif(not os.environ.get("BACKIT_CONTRACT"), reason="Set BACKIT_CONTRACT after deploy")
def test_deployed_contract_economics_read():
    addr = os.environ["BACKIT_CONTRACT"]
    script = f"""
import {{ createClient }} from './web/node_modules/genlayer-js/dist/index.js';
import {{ studioDevnet }} from './web/node_modules/genlayer-js/dist/chains/index.js';
const client = createClient({{ chain: studioDevnet, endpoint: {json.dumps(RPC)} }});
const eco = await client.readContract({{ address: {json.dumps(addr)}, functionName: 'get_economics', args: [] }});
console.log(JSON.stringify(eco));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=os.getcwd(),
        check=True,
        capture_output=True,
        text=True,
        timeout=45,
    )
    eco = json.loads(result.stdout)
    assert int(eco["fee_bps"]) == 250
    assert int(eco["prover_bps"]) == 1000
    assert int(eco["cancel_bps"]) == 1000
    assert int(eco["feed_max"]) == 20
