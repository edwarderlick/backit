"""Optional StudioNet smoke. Skip if RPC unreachable or no account.

Run: gltest tests/integration/ -v -s --network studionet
Rate limits: 60 req/min on studio.genlayer.com.
"""

import os
import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("BACKIT_STUDIONET_SMOKE") != "1",
    reason="Set BACKIT_STUDIONET_SMOKE=1 to hit StudioNet",
)


def test_placeholder_docs():
    assert True
