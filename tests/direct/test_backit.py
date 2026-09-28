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
COINBASE_USDC_PAGE = (
    "USDC price page. USDC is available on Coinbase. "
    "Coinbase supports USD Coin trading on its centralized exchange."
)
GENLAYER_PROTOCOL_PAGE = (
    "GenLayer is an intelligent blockchain for applications that need consensus on outcomes "
    "derived from natural language, live web data, or other non-deterministic inputs."
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


def _set_time(direct_vm, value):
    direct_vm._datetime = str(value)
    direct_vm._refresh_gl_message()


def test_back_requires_value(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("[EXPECTED] bond must be greater than 0"):
        c.back("hello", "https://docs.genlayer.com/page", "FACT")


def test_back_rejects_non_https_and_schemes(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 100
    with direct_vm.expect_revert("[EXPECTED] source_url must be https://"):
        c.back("hello world claim", "http://docs.genlayer.com/x", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url scheme is forbidden"):
        c.back("hello world claim", "javascript:alert(1)", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url scheme is forbidden"):
        c.back("hello world claim", "data:text/html,hi", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url scheme is forbidden"):
        c.back("hello world claim", "file:///etc/passwd", "FACT")
    with direct_vm.expect_revert("[EXPECTED] claim cannot be empty"):
        c.back("  ", "https://docs.genlayer.com/x", "FACT")
    with direct_vm.expect_revert("[EXPECTED] kind must be one of"):
        c.back("hello world claim", "https://docs.genlayer.com/x", "COURT")


def test_back_rejects_unlisted_evidence_domain(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 100
    with direct_vm.expect_revert("[EXPECTED] source domain is not allowed"):
        c.back("hello world claim", "https://untrusted.invalid/x", "FACT")


def test_back_length_caps(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10
    with direct_vm.expect_revert("[EXPECTED] claim exceeds 280"):
        c.back("x" * 281, "https://docs.genlayer.com/x", "FACT")
    with direct_vm.expect_revert("[EXPECTED] source_url exceeds 512"):
        c.back("ok claim", "https://docs.genlayer.com/" + ("a" * 500), "FACT")


def test_ids_are_hashes_not_counters(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    ids = []
    for i in range(5):
        direct_vm.value = 100 + i
        bid = c.back(f"claim sentence number {i}", f"https://docs.genlayer.com/p{i}", "FACT")
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
    fees = []
    posters = []
    for kind in ("FACT", "LISTING", "PRESS", "JOB", "STATUS", "OTHER"):
        direct_vm.sender = direct_alice
        direct_vm.value = 10000
        bid = c.back("Bitcoin whitepaper was released in 2008", f"https://docs.genlayer.com/{kind}", kind)
        rec = c.get_back(bid)
        assert rec["amount"] == 10000
        assert rec["kind"] == kind
        _mock_get(direct_vm, f"docs.genlayer.com/{kind}", 200, TRUE_PAGE)
        _mock_llm(direct_vm, "TRUE", quote="released in 2008", reason="page matches the claim")
        direct_vm.sender = direct_bob
        c.prove(bid)
        rec = c.get_back(bid)
        assert rec["state"] == "TRUE"
        fees.append(rec["fee_paid"])
        posters.append(rec["paid_to_poster"] + rec["credit_poster"])
        assert rec["paid_to_prover"] + rec["credit_prover"] == 1000
    assert fees == [250] * 6
    assert posters == [8750] * 6


def test_cancel_poster_only_open(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    _set_time(direct_vm, 1000)
    direct_vm.sender = direct_alice
    direct_vm.value = 500
    bid = c.back("cancelable claim text here", "https://docs.genlayer.com/c", "FACT")
    eco = c.get_economics()
    assert eco["locked"] == 500

    direct_vm.sender = direct_bob
    with pytest.raises(Exception) as exc:
        c.cancel(bid)
    assert "only poster" in str(exc.value)

    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as early:
        c.cancel(bid)
    assert "cancel window" in str(early.value)

    _set_time(direct_vm, 1600)
    c.cancel(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "CANCELED"
    assert rec["outcome"] == "CANCELED"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 450
    assert rec["fee_paid"] == 50
    assert c.get_economics()["locked"] == 0
    assert c.get_economics()["treasury"] == 50

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
    assert rec["paid_to_poster"] + rec["credit_poster"] == 8750
    assert rec["paid_to_prover"] + rec["credit_prover"] == 1000
    assert rec["final_url"].startswith("https://")
    assert len(rec["content_hash"]) == 64
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
    _mock_llm(direct_vm, "FALSE", quote="activated on mainnet in 2025", reason="contradicts 2024")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "FALSE"
    assert rec["paid_to_prover"] + rec["credit_prover"] == 800
    assert rec["fee_paid"] == 0
    assert rec["paid_to_poster"] == 0
    assert rec["prover"].lower().startswith("0x")
    assert rec["prover"].lower() != rec["poster"].lower()


def test_negative_listing_claim_accepts_positive_listing_reason(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 2000
    bid = c.back(
        "USDC is not available on Coinbase's centralized exchange.",
        "https://www.coinbase.com/en-in/price/usdc",
        "LISTING",
    )
    _mock_get(direct_vm, "coinbase.com/en-in/price/usdc", 200, COINBASE_USDC_PAGE)
    _mock_llm(
        direct_vm,
        "FALSE",
        quote="USDC is available on Coinbase",
        reason="the Coinbase price page lists USDC as available for trading",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "FALSE"
    assert rec["paid_to_prover"] + rec["credit_prover"] == 2000
    assert rec["paid_to_poster"] == 0


def test_prove_thin_on_404_not_false(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 300
    bid = c.back("Archived blog post behind broken paywall", "https://docs.genlayer.com/post/99", "OTHER")
    _mock_get(direct_vm, "docs.genlayer.com", 404, "Not Found")
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
    bid = c.back("forbidden page claim text", "https://docs.genlayer.com/forbidden", "STATUS")
    _mock_get(direct_vm, "docs.genlayer.com/forbidden", 403, "Forbidden")
    direct_vm.sender = direct_bob
    c.prove(bid)
    assert c.get_back(bid)["state"] == "THIN"

    direct_vm.sender = direct_alice
    direct_vm.value = 10
    bid2 = c.back("empty body claim text ok", "https://docs.genlayer.com/empty", "FACT")
    _mock_get(direct_vm, "docs.genlayer.com/empty", 200, "   ")
    direct_vm.sender = direct_bob
    c.prove(bid2)
    assert c.get_back(bid2)["state"] == "THIN"


def test_prove_uses_render_when_get_returns_403(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10000
    bid = c.back(
        "OpenAI announced GPT-4o on May 13, 2024.",
        "https://openai.com/index/hello-gpt-4o/",
        "PRESS",
    )
    calls = {"count": 0}

    def _web(data):
        calls["count"] += 1
        if calls["count"] == 1:
            return {"ok": {"response": {"status": 403, "headers": {}, "body": b"Forbidden"}}}
        return {
            "ok": {
                "response": {
                    "status": 200,
                    "headers": {},
                    "body": (
                        "Hello GPT-4o. OpenAI announced GPT-4o on May 13, 2024, "
                        "introducing a new flagship model."
                    ).encode("utf-8"),
                }
            }
        }

    direct_vm._live_web_handler = _web
    _mock_llm(
        direct_vm,
        "TRUE",
        quote="OpenAI announced GPT-4o on May 13, 2024",
        reason="page states the announcement date",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "TRUE"
    assert rec["reason"] == "page states the announcement date"
    assert calls["count"] >= 2


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
    bid = c.back("Bitcoin was invented in 2008", "https://bitcoin.org/wiki/Bitcoin", "FACT")
    _mock_get(
        direct_vm,
        "bitcoin.org",
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
    bid = c.back("server down claim sentence", "https://docs.genlayer.com/down", "FACT")
    _mock_get(direct_vm, "docs.genlayer.com/down", 503, "unavailable")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 40


def test_prove_only_open(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    _set_time(direct_vm, 2000)
    direct_vm.sender = direct_alice
    direct_vm.value = 50
    bid = c.back("already canceled claim xx", "https://docs.genlayer.com/z", "FACT")
    _set_time(direct_vm, 2601)
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
    bid = c.back("credit lookup claim text", "https://docs.genlayer.com/credit", "FACT")
    poster = c.get_back(bid)["poster"]
    assert c.get_credit(poster) == 0


def test_validator_equivalence_requires_supported_quote_and_reason(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/html", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(direct_vm, "TRUE", quote="released in 2008", reason="page matches the claim")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "TRUE"

    assert direct_vm.run_validator() is True
    assert (
        direct_vm.run_validator(
            leader_result={
                "outcome": "TRUE",
                "quote": "this sentence is not on the page",
                "reason": "page matches the claim",
                "final_url": "https://docs.openai.com/snapshot",
                "content_hash": "different",
            }
        )
        is False
    )
    assert (
        direct_vm.run_validator(
            leader_result={
                "outcome": "FALSE",
                "quote": "released in 2008",
                "reason": "page matches the claim",
                "final_url": rec["final_url"],
                "content_hash": rec["content_hash"],
            }
        )
        is False
    )


def test_support_verifier_rejects_related_quote_that_does_not_justify_outcome(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back("Bitcoin whitepaper was released in 2009", "https://bitcoin.org/html", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(
        direct_vm,
        "FALSE",
        quote="Bitcoin: A Peer-to-Peer Electronic Cash System",
        reason="the page contradicts the claim",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert "unsupported quote/reason" in rec["reason"].lower()


def test_semantic_equivalence_blocks_pedantic_false_for_genlayer_protocol(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back(
        "GenLayer is an intelligent blockchain for applications that need consensus on live web data.",
        "https://docs.genlayer.com/understand-genlayer-protocol",
        "FACT",
    )
    quote = GENLAYER_PROTOCOL_PAGE
    _mock_get(direct_vm, "docs.genlayer.com/understand-genlayer-protocol", 200, GENLAYER_PROTOCOL_PAGE)
    _mock_llm(
        direct_vm,
        "FALSE",
        quote=quote,
        reason="The page says consensus on outcomes derived from live web data, not consensus on live web data itself.",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert "unsupported quote/reason" in rec["reason"].lower()


def test_semantic_equivalence_accepts_true_for_genlayer_protocol(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back(
        "GenLayer is an intelligent blockchain for applications that need consensus on live web data.",
        "https://docs.genlayer.com/understand-genlayer-protocol",
        "FACT",
    )
    quote = GENLAYER_PROTOCOL_PAGE
    _mock_get(direct_vm, "docs.genlayer.com/understand-genlayer-protocol", 200, GENLAYER_PROTOCOL_PAGE)
    _mock_llm(
        direct_vm,
        "TRUE",
        quote=quote,
        reason="The quoted page supports the claim with equivalent wording.",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "TRUE"


def test_negative_protocol_claim_accepts_positive_blockchain_quote(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back(
        "GenLayer is only a static documentation website and not a blockchain protocol.",
        "https://docs.genlayer.com/understand-genlayer-protocol",
        "OTHER",
    )
    _mock_get(direct_vm, "docs.genlayer.com/understand-genlayer-protocol", 200, GENLAYER_PROTOCOL_PAGE)
    _mock_llm(
        direct_vm,
        "FALSE",
        quote=GENLAYER_PROTOCOL_PAGE,
        reason="The quote describes GenLayer as an intelligent blockchain for applications.",
    )
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "FALSE"
    assert rec["paid_to_prover"] + rec["credit_prover"] == 1000


def test_validator_rejects_quote_reason_without_substantive_support(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/html", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(direct_vm, "TRUE", quote="released in 2008", reason="page matches the claim")
    direct_vm.sender = direct_bob
    c.prove(bid)

    direct_vm.clear_mocks()
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    assert (
        direct_vm.run_validator(
            leader_result={
                "outcome": "TRUE",
                "quote": "Bitcoin: A Peer-to-Peer Electronic Cash System",
                "reason": "page matches the claim",
                "final_url": "https://bitcoin.org/html",
                "content_hash": c.get_back(bid)["content_hash"],
            }
        )
        is False
    )


def test_hash_uses_transaction_fields(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 77
    bid = c.back("unique claim alpha", "https://docs.genlayer.com/alpha", "JOB")
    rec = c.get_back(bid)
    assert rec["id"] == bid
    assert hashlib.sha256(bid.encode()).hexdigest()
    assert rec["poster"]
    assert rec["amount"] == 77


def test_unknown_id_reverts_on_views_and_writes(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    fake = "ab" * 32
    with pytest.raises(Exception) as exc:
        c.get_back(fake)
    assert "not found" in str(exc.value).lower()

    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as prove_exc:
        c.prove(fake)
    assert "not found" in str(prove_exc.value).lower()
    with pytest.raises(Exception) as cancel_exc:
        c.cancel(fake)
    assert "not found" in str(cancel_exc.value).lower()
    assert c.list_ids() == []
    assert c.get_economics()["locked"] == 0


def test_prove_twice_and_cancel_after_prove_revert(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10000
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/html", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(direct_vm, "TRUE", quote="released in 2008", reason="page states 2008")
    direct_vm.sender = direct_bob
    c.prove(bid)
    rec = c.get_back(bid)
    assert rec["state"] == "TRUE"
    treasury = c.get_economics()["treasury"]

    with pytest.raises(Exception) as prove_exc:
        c.prove(bid)
    assert "OPEN" in str(prove_exc.value)

    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as cancel_exc:
        c.cancel(bid)
    assert "OPEN" in str(cancel_exc.value)

    rec2 = c.get_back(bid)
    assert rec2["state"] == "TRUE"
    assert rec2["fee_paid"] == rec["fee_paid"]
    eco = c.get_economics()
    assert eco["treasury"] == treasury
    assert eco["locked"] == 0


def test_invalid_llm_settles_thin_and_refunds(direct_vm, direct_deploy, direct_alice, direct_bob):
    """LLM garbage must not roll back the user write; settle THIN and refund."""
    c = direct_deploy(CONTRACT)
    _set_time(direct_vm, 3000)
    direct_vm.sender = direct_alice
    direct_vm.value = 400
    bid = c.back("Bitcoin whitepaper was released in 2008", "https://bitcoin.org/html", "FACT")
    _mock_get(direct_vm, "bitcoin.org", 200, TRUE_PAGE)
    _mock_llm(direct_vm, "MAYBE", quote="n/a", reason="not an enum")
    direct_vm.sender = direct_bob
    c.prove(bid)

    rec = c.get_back(bid)
    assert rec["state"] == "THIN"
    assert rec["paid_to_poster"] + rec["credit_poster"] == 400
    assert rec["paid_to_prover"] == 0
    assert rec["fee_paid"] == 0
    assert "unusable output" in rec["reason"].lower()
    assert c.get_economics()["locked"] == 0


def test_withdraw_without_credits_reverts(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as exc:
        c.withdraw()
    assert "no credits" in str(exc.value).lower()
