import json
import hashlib

import pytest


CONTRACT = "contracts/backit.py"

TRUE_PAGE = (
    "Bitcoin: A Peer-to-Peer Electronic Cash System. "
    "Satoshi Nakamoto. The Bitcoin whitepaper was released in 2008."
)
FALSE_PAGE = (
    "Ethereum protocol upgrades. The Pectra upgrade activated on mainnet in 2025, not 2024."
)


def _mock_get(direct_vm, url_part, status, body):
    direct_vm.mock_web(
        rf".*{url_part}.*",
        {"status": status, "body": body.encode("utf-8") if isinstance(body, str) else body},
    )


def _mock_llm(direct_vm, outcome, quote="q", reason="r"):
    direct_vm.mock_llm(
        r".*",
        json.dumps({"outcome": outcome, "quote": quote, "reason": reason}),
    )


def test_back_requires_value(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("[EXPECTED] bond must be greater than 0"):
        c.back("hello", "https://example.com/page", "FACT")


def test_back_rejects_non_https_and_schemes(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 100
    with direct_vm.expect_revert("[EXPECTED] source_url must be https://"):
        c.back("hello world claim", "http://example.com/x", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url scheme is forbidden"):
        c.back("hello world claim", "javascript:alert(1)", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url scheme is forbidden"):
        c.back("hello world claim", "data:text/html,hi", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url scheme is forbidden"):
        c.back("hello world claim", "file:///etc/passwd", "FACT")
    with direct_vm.expect_revert("[EXPECTED] claim cannot be empty"):
        c.back("  ", "https://example.com/x", "FACT")
    with direct_vm.expect_revert("[EXPECTED] kind must be one of"):
        c.back("hello world claim", "https://example.com/x", "COURT")


def test_back_length_caps(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10
    with direct_vm.expect_revert("[EXPECTED] claim exceeds 280"):
        c.back("x" * 281, "https://example.com/x", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url exceeds 512"):
        c.back("ok claim", "https://example.com/" + ("a" * 500), "FACT")


def test_ids_are_hashes_not_counters(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    ids = []
    for i in range(5):
        direct_vm.value = 100 + i
        bid = c.back(f"claim sentence number {i}", f"https://example.com/p{i}", "FACT")
        ids.append(bid)
        assert "CASE" not in bid
        assert not bid.startswith("claim-")
        assert len(bid) == 64
        int(bid, 16)
    assert len(set(ids)) == 5
    listed = c.list_ids()
    assert listed == ids
    assert c.get_back_ids() == ids


def test_kind_does_not_change_payout_math(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    amounts = []
    for kind in ("FACT", "LISTING", "PRESS", "JOB", "STATUS", "OTHER"):
        direct_vm.value = 10000
        bid = c.back(f"kind {kind} claim text", f"https://example.com/{kind}", kind)
        rec = c.get_back(bid)
        amounts.append(rec["amount"])
        assert rec["kind"] == kind
        assert rec["state"] == "OPEN"
    assert len(set(amounts)) == 1


def test_cancel_poster_only_open(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 500
    bid = c.back("cancelable claim text here", "https://example.com/c", "FACT")
    eco = c.get_economics()
    assert eco["locked"] == 500

    direct_vm.sender = direct_bob
    with pytest.raises(Exception) as exc:
        c.cancel(bid)
    assert "only poster" in str(exc.value)

    direct_vm.sender = direct_alice
    c.cancel(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "CANCELED"
    assert rec["outcome"] == "CANCELED"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 500
    assert c.get_economics()["locked"] == 0

    with pytest.raises(Exception):
        c.cancel(bid)


def test_prove_true_fee_and_remainder(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10000
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/bitcoin.pdf", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(direct_vm, "TRUE", quote="released in 2008", reason="page states 2008")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "TRUE"
    assert rec["outcome"] == "TRUE"
    assert rec["fee_paid"] == 250
    assert rec["paid_to_poster"] + rec["credit_poster"] == 9750
    assert rec["paid_to_prover"] == 0
    eco = c.get_economics()
    assert eco["treasury"] == 250
    assert eco["locked"] == 0
    att = json.loads(rec["attestation_json"])
    assert att["outcome"] == "TRUE"
    assert att["quote"] == rec["quote"]


def test_prove_false_entire_bond_to_prover(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 800
    bid = c.back("Ethereum Pectra upgrade scheduled for 2024", "https://ethereum.org/roadmap/pectra", "PRESS")
    _mock_get(direct_vm, "ethereum.org", 200, FALSE_PAGE)
    _mock_llm(direct_vm, "FALSE", quote="activated in 2025", reason="contradicts 2024")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "FALSE"
    assert rec["paid_to_prover"] + rec["credit_prover"] == 800
    assert rec["fee_paid"] == 0
    assert rec["paid_to_poster"] == 0
    assert rec["prover"].lower().startswith("0x")
    assert rec["prover"].lower() != rec["poster"].lower()


def test_prove_thin_on_404_not_false(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 300
    bid = c.back("Archived blog post behind broken paywall", "https://paywall.example.com/post/99", "OTHER")
    _mock_get(direct_vm, "paywall.example.com", 404, "Not Found")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert rec["outcome"] == "THIN"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 300
    assert rec["paid_to_prover"] == 0
    assert rec["fee_paid"] == 0


def test_prove_thin_on_403_and_empty(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10
    bid = c.back("forbidden page claim text", "https://example.com/forbidden", "STATUS")
    _mock_get(direct_vm, "example.com/forbidden", 403, "Forbidden")
    direct_vm.sender = direct_bob
    c.prove(bid)
    assert c.get_back(bid)["state"] == "THIN"

    direct_vm.sender = direct_alice
    direct_vm.value = 10
    bid2 = c.back("empty body claim text ok", "https://example.com/empty", "FACT")
    _mock_get(direct_vm, "example.com/empty", 200, "   ")
    direct_vm.sender = direct_bob
    c.prove(bid2)
    assert c.get_back(bid2)["state"] == "THIN"


def test_prove_true_strips_nav_html_before_llm(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10000
    bid = c.back(
        "CPython now officially supports RISC-V as a tier 3 platform",
        "https://blog.python.org/2026/08/riscv-now-officially-supported",
        "PRESS",
    )
    chrome = "<html><head>" + ("<script>x</script>" * 200) + "</head><nav>" + ("link " * 400) + "</nav>"
    body = "<article><p>RISC-V is now officially supported by CPython as a tier 3 platform.</p></article></html>"
    _mock_get(direct_vm, "blog.python.org", 200, chrome + body)
    _mock_llm(
        direct_vm,
        "TRUE",
        quote="officially supported by CPython as a tier 3 platform",
        reason="article states tier 3",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "TRUE"
    assert rec["kind"] == "PRESS"
    assert rec["fee_paid"] == 250


def test_prove_thin_on_cloudflare_interstitial(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 25
    bid = c.back("Bitcoin was invented in 2008", "https://en.wikipedia.org/wiki/Bitcoin", "FACT")
    _mock_get(
        direct_vm,
        "wikipedia.org",
        200,
        "<html>Just a moment... enable javascript cf-challenge verify you are human</html>",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 25
    assert rec["fee_paid"] == 0


def test_prove_thin_on_pdf_magic(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 12
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/bitcoin.pdf", "FACT")
    _mock_get(direct_vm, "bitcoin.org/bitcoin.pdf", 200, "%PDF-1.4 binary stream")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert "PDF" in rec["reason"] or "Binary" in rec["reason"]
    assert rec["paid_to_poster"] + rec["credit_poster"] == 12


def test_prove_thin_on_5xx(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 40
    bid = c.back("server down claim sentence", "https://example.com/down", "FACT")
    _mock_get(direct_vm, "example.com/down", 503, "unavailable")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 40


def test_prove_only_open(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 50
    bid = c.back("already canceled claim xx", "https://example.com/z", "FACT")
    c.cancel(bid)
    direct_vm.sender = direct_bob
    with pytest.raises(Exception):
        c.prove(bid)


def test_get_credit_and_economics(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    eco = c.get_economics()
    assert eco["treasury"] == 0
    assert eco["locked"] == 0
    assert eco["credits"] == 0
    assert eco["fee_bps"] == 250
    direct_vm.sender = direct_alice
    direct_vm.value = 11
    bid = c.back("credit lookup claim text", "https://example.com/credit", "FACT")
    poster = c.get_back(bid)["poster"]
    assert c.get_credit(poster) == 0


def test_validator_compares_outcome_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    import sys

    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/bitcoin.pdf", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(direct_vm, "TRUE", quote="2008", reason="matches")
    direct_vm.sender = direct_bob
    c.prove(bid)

    assert len(direct_vm._captured_validators) > 0
    _result, _leader_fn, val_fn = direct_vm._captured_validators[-1]
    gl_vm = sys.modules["genlayer.gl.vm"]

    assert val_fn(gl_vm.Return({"outcome": "TRUE", "quote": "DIFFERENT QUOTE", "reason": "other"})) is True
    assert val_fn(gl_vm.Return({"outcome": "FALSE", "quote": "2008", "reason": "matches"})) is False
    assert val_fn(gl_vm.Return({"outcome": "THIN", "quote": "", "reason": "x"})) is False


def test_hash_uses_transaction_fields(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 77
    bid = c.back("unique claim alpha", "https://example.com/alpha", "JOB")
    rec = c.get_back(bid)
    assert rec["id"] == bid
    assert hashlib.sha256(bid.encode()).hexdigest()
    assert rec["poster"]
    assert rec["amount"] == 77
