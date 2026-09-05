# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import html as html_lib
import json
import re
from dataclasses import dataclass
from genlayer import *

ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

PROTOCOL_FEE_BPS: u256 = u256(250)  # 2.5% on TRUE only
CLAIM_MAX = 280
URL_MAX = 512
QUOTE_MAX = 480
REASON_MAX = 800
PAGE_MAX = 12000

KINDS = ("FACT", "LISTING", "PRESS", "JOB", "STATUS", "OTHER")
STATES = ("OPEN", "TRUE", "FALSE", "THIN", "CANCELED")
OUTCOMES = ("TRUE", "FALSE", "THIN")


@allow_storage
@dataclass
class Back:
    id: str
    poster: Address
    prover: Address
    claim: str
    source_url: str
    kind: str
    state: str
    amount: u256
    created_at: str
    outcome: str
    quote: str
    reason: str
    fee_paid: u256
    paid_to_poster: u256
    paid_to_prover: u256
    credit_poster: u256
    credit_prover: u256
    attestation_json: str


class BackOpened(gl.Event):
    def __init__(self, back_id: str, poster: str, amount: u256, /):
        pass


class BackSettled(gl.Event):
    def __init__(self, back_id: str, outcome: str, /):
        pass


class BackCanceled(gl.Event):
    def __init__(self, back_id: str, /):
        pass


class CreditsWithdrawn(gl.Event):
    def __init__(self, account: str, amount: u256, /):
        pass


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class BackIt(gl.Contract):
    backs: TreeMap[str, Back]
    id_order: DynArray[str]
    credits: TreeMap[Address, u256]
    treasury: u256
    locked: u256
    credits_outstanding: u256

    def __init__(self):
        self.treasury = u256(0)
        self.locked = u256(0)
        self.credits_outstanding = u256(0)

    def _kind_norm(self, kind: str) -> str:
        k = str(kind or "").strip().upper()
        if k not in KINDS:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} kind must be one of {', '.join(KINDS)}")
        return k

    def _validate_claim(self, claim: str) -> str:
        c = str(claim or "").strip()
        if not c:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} claim cannot be empty")
        if len(c) > CLAIM_MAX:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} claim exceeds {CLAIM_MAX} characters")
        return c

    def _validate_url(self, source_url: str) -> str:
        u = str(source_url or "").strip()
        if not u:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} source_url cannot be empty")
        if len(u) > URL_MAX:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} source_url exceeds {URL_MAX} characters")
        low = u.lower()
        if low.startswith("javascript:") or low.startswith("data:") or low.startswith("file:"):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} source_url scheme is forbidden")
        if not low.startswith("https://"):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} source_url must be https://")
        if " " in u:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} source_url must not contain spaces")
        return u

    def _credit_of(self, addr: Address) -> u256:
        if addr in self.credits:
            return self.credits[addr]
        return u256(0)

    def _add_credit(self, addr: Address, amount: u256) -> None:
        if amount == u256(0):
            return
        self.credits[addr] = self._credit_of(addr) + amount
        self.credits_outstanding = self.credits_outstanding + amount

    def _pay(self, addr: Address, amount: u256) -> u256:
        """Native IC→EOA transfer. emit_transfer returns None (not bool).
        Official path: EVM _Recipient.emit_transfer. Studio fallback: get_contract_at.
        If both raise, write credits for withdraw()."""
        if amount == u256(0):
            return u256(0)
        try:
            # Reconstruct from hex — calldata Address into this interface can raise on Studio.
            recipient = Address(addr.as_hex)
            _Recipient(recipient).emit_transfer(value=amount)
            return u256(0)
        except Exception:
            try:
                gl.get_contract_at(Address(addr.as_hex)).emit_transfer(value=amount)
                return u256(0)
            except Exception:
                self._add_credit(addr, amount)
                return amount

    def _new_id(self, claim: str, source_url: str) -> str:
        raw = b""
        try:
            entry = gl.message_raw.get("entry_data", b"")
            if isinstance(entry, bytes):
                raw = entry
            elif entry is not None:
                raw = str(entry).encode("utf-8")
        except Exception:
            raw = b""
        dt = ""
        try:
            dt = str(gl.message_raw.get("datetime", "") or "")
        except Exception:
            dt = ""
        payload = "|".join(
            [
                str(gl.message.origin_address),
                str(gl.message.sender_address),
                dt,
                str(int(gl.message.value)),
                claim,
                source_url,
                raw.hex(),
            ]
        )
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        n = 0
        while digest in self.backs:
            n += 1
            digest = hashlib.sha256((payload + "|" + str(n)).encode("utf-8")).hexdigest()
        return digest

    @gl.public.write.payable
    def back(self, claim: str, source_url: str, kind: str) -> str:
        if gl.message.value == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bond must be greater than 0")
        c = self._validate_claim(claim)
        u = self._validate_url(source_url)
        k = self._kind_norm(kind)
        back_id = self._new_id(c, u)
        created = ""
        try:
            created = str(gl.message_raw.get("datetime", "") or "")
        except Exception:
            created = ""
        zero = Address("0x0000000000000000000000000000000000000000")
        self.backs[back_id] = Back(
            id=back_id,
            poster=gl.message.sender_address,
            prover=zero,
            claim=c,
            source_url=u,
            kind=k,
            state="OPEN",
            amount=gl.message.value,
            created_at=created,
            outcome="",
            quote="",
            reason="",
            fee_paid=u256(0),
            paid_to_poster=u256(0),
            paid_to_prover=u256(0),
            credit_poster=u256(0),
            credit_prover=u256(0),
            attestation_json="",
        )
        self.id_order.append(back_id)
        self.locked = self.locked + gl.message.value
        BackOpened(back_id, str(gl.message.sender_address), gl.message.value).emit()
        return back_id

    @gl.public.write
    def cancel(self, id: str) -> None:
        if id not in self.backs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} back not found")
        rec = self.backs[id]
        if rec.state != "OPEN":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} cancel only while OPEN")
        if str(gl.message.sender_address).lower() != str(rec.poster).lower():
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only poster can cancel")
        rec.state = "CANCELED"
        rec.outcome = "CANCELED"
        rec.reason = "Canceled by poster while OPEN. 100% bond returned."
        credited = self._pay(rec.poster, rec.amount)
        rec.paid_to_poster = rec.amount - credited
        rec.credit_poster = credited
        rec.attestation_json = json.dumps(
            {"outcome": "CANCELED", "quote": "", "reason": rec.reason}
        )
        self.locked = self.locked - rec.amount
        self.backs[id] = rec
        BackCanceled(id).emit()

    @gl.public.write
    def prove(self, id: str) -> None:
        if id not in self.backs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} back not found")
        rec = self.backs[id]
        if rec.state != "OPEN":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} prove only while OPEN")

        claim_text = rec.claim
        source_url = rec.source_url

        def _http_status(res) -> int:
            if res is None:
                return 0
            for attr in ("status", "status_code"):
                if hasattr(res, attr):
                    try:
                        return int(getattr(res, attr))
                    except Exception:
                        pass
            if isinstance(res, dict):
                for key in ("status", "status_code"):
                    if key in res:
                        try:
                            return int(res[key])
                        except Exception:
                            pass
            return 0

        def _body_text(res) -> str:
            body = None
            if hasattr(res, "body"):
                body = res.body
            elif isinstance(res, dict):
                body = res.get("body")
            if body is None:
                return ""
            if isinstance(body, bytes):
                try:
                    return body.decode("utf-8", errors="replace")
                except Exception:
                    return ""
            return str(body)

        def _thin(reason: str) -> dict:
            return {"outcome": "THIN", "quote": "", "reason": reason[:REASON_MAX]}

        def _is_binary(text: str) -> bool:
            t = str(text or "")
            if "\x00" in t:
                return True
            if t.lstrip().startswith("%PDF"):
                return True
            return False

        def _is_bot_wall(text: str) -> bool:
            low = str(text or "").lower()
            if not low.strip():
                return True
            markers = (
                "captcha",
                "cf-challenge",
                "verify you are human",
                "access denied",
                "just a moment",
                "enable javascript",
                "checking your browser",
                "attention required",
            )
            for m in markers:
                if m in low:
                    return True
            return False

        def _looks_unreadable(text: str) -> bool:
            return _is_binary(text) or _is_bot_wall(text)

        def _html_to_text(raw: str) -> str:
            t = str(raw or "")
            t = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", t)
            t = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", t)
            t = re.sub(r"(?is)<noscript[^>]*>.*?</noscript>", " ", t)
            t = re.sub(r"(?is)<nav[^>]*>.*?</nav>", " ", t)
            t = re.sub(r"(?is)<header[^>]*>.*?</header>", " ", t)
            t = re.sub(r"(?is)<footer[^>]*>.*?</footer>", " ", t)
            t = re.sub(r"(?is)<!--.*?-->", " ", t)
            t = re.sub(r"<[^>]+>", " ", t)
            t = html_lib.unescape(t)
            t = re.sub(r"\s+", " ", t)
            return t.strip()

        def _best_text(raw: str) -> str:
            raw_s = str(raw or "")
            stripped = _html_to_text(raw_s)
            if len(stripped) >= 40:
                return stripped
            return raw_s.strip()

        def _parse_outcome(raw) -> dict:
            data = raw
            if isinstance(raw, str):
                try:
                    first = raw.find("{")
                    last = raw.rfind("}")
                    data = json.loads(raw[first : last + 1] if first >= 0 and last > first else raw)
                except Exception:
                    raise gl.vm.UserError(f"{ERROR_LLM} LLM returned non-JSON")
            if not isinstance(data, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} LLM returned non-dict")
            outcome = str(data.get("outcome") or data.get("verdict") or data.get("result") or "").strip().upper()
            if outcome not in OUTCOMES:
                raise gl.vm.UserError(f"{ERROR_LLM} outcome must be TRUE|FALSE|THIN, got {outcome}")
            quote = str(data.get("quote") or data.get("excerpt") or "")[:QUOTE_MAX]
            reason = str(data.get("reason") or data.get("explanation") or "")[:REASON_MAX]
            return {"outcome": outcome, "quote": quote, "reason": reason}

        def leader_fn() -> dict:
            status = 0
            page = ""
            got_http = False
            try:
                res = gl.nondet.web.get(source_url)
                status = _http_status(res)
                page = _body_text(res)
                got_http = True
            except Exception:
                status = 0
                page = ""

            if status in (403, 404):
                return _thin(f"HTTP {status}. Unreadable source. 100% refund poster.")
            if status >= 500:
                return _thin(f"HTTP {status}. Source unavailable. 100% refund poster.")
            if status not in (0, 200) and status >= 400:
                return _thin(f"HTTP {status}. Non-text or blocked source. 100% refund poster.")

            # Raw GET often returns a Cloudflare interstitial (HTTP 200) for Wikipedia.
            # That used to short-circuit THIN before web.render. Render first when
            # GET is empty, binary-skip, or a bot wall.
            if _is_binary(page):
                return _thin("Binary or PDF source. Use an HTML page. 100% refund poster.")

            page_text = _best_text(page)
            chrome_only = ("<" in page and len(page_text) < 500) or _looks_unreadable(page)
            if chrome_only:
                for mode in ("text", "html"):
                    try:
                        rendered = gl.nondet.web.render(source_url, mode=mode)
                        if rendered is None:
                            continue
                        cand = _best_text(str(rendered))
                        if cand and not _looks_unreadable(cand) and len(cand) > len(page_text):
                            page_text = cand
                            if len(page_text) >= 500:
                                break
                    except Exception:
                        continue

            if not page_text.strip() and not got_http:
                return _thin("Network error while fetching source. 100% refund poster.")
            if _looks_unreadable(page_text):
                return _thin("Empty, CAPTCHA, or non-text page. 100% refund poster.")

            excerpt = page_text[:PAGE_MAX]
            prompt = (
                "You verify one claim against one live HTTPS page. "
                "Return JSON only with keys outcome, quote, reason.\n"
                "outcome MUST be exactly TRUE, FALSE, or THIN.\n"
                "TRUE = the page text clearly supports the claim as stated.\n"
                "FALSE = the page text clearly contradicts the claim.\n"
                "THIN = the page is too thin, paywalled, CAPTCHA, unrelated, or you cannot tell.\n"
                "quote = a short verbatim excerpt from the page (may be empty for THIN).\n"
                "reason = one short sentence.\n"
                f"CLAIM: {claim_text}\n"
                f"URL: {source_url}\n"
                f"PAGE:\n{excerpt}\n"
            )
            try:
                analysis = gl.nondet.exec_prompt(prompt, response_format="json")
            except Exception:
                raise gl.vm.UserError(f"{ERROR_LLM} exec_prompt failed")
            return _parse_outcome(analysis)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                try:
                    leader_fn()
                    return False
                except gl.vm.UserError as e:
                    validator_msg = e.message if hasattr(e, "message") else str(e)
                    leader_msg = leaders_res.message if hasattr(leaders_res, "message") else ""
                    if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(ERROR_EXTERNAL):
                        return validator_msg == leader_msg
                    if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
                        return True
                    return False
                except Exception:
                    return False
            leader_data = leaders_res.calldata
            if not isinstance(leader_data, dict):
                return False
            leader_outcome = str(leader_data.get("outcome", "")).strip().upper()
            if leader_outcome not in OUTCOMES:
                return False
            try:
                val_data = leader_fn()
            except Exception:
                return False
            val_outcome = str(val_data.get("outcome", "")).strip().upper()
            return leader_outcome == val_outcome

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if not isinstance(result, dict) or str(result.get("outcome", "")).upper() not in OUTCOMES:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} invalid consensus result")

        outcome = str(result["outcome"]).upper()
        quote = str(result.get("quote") or "")[:QUOTE_MAX]
        reason = str(result.get("reason") or "")[:REASON_MAX]

        rec.prover = gl.message.sender_address
        rec.outcome = outcome
        rec.state = outcome
        rec.quote = quote
        rec.reason = reason
        rec.attestation_json = json.dumps({"outcome": outcome, "quote": quote, "reason": reason})

        amount = rec.amount
        self.locked = self.locked - amount

        if outcome == "TRUE":
            fee = (amount * PROTOCOL_FEE_BPS) // u256(10000)
            rest = amount - fee
            self.treasury = self.treasury + fee
            rec.fee_paid = fee
            credited = self._pay(rec.poster, rest)
            rec.paid_to_poster = rest - credited
            rec.credit_poster = credited
        elif outcome == "FALSE":
            credited = self._pay(rec.prover, amount)
            rec.paid_to_prover = amount - credited
            rec.credit_prover = credited
        else:
            credited = self._pay(rec.poster, amount)
            rec.paid_to_poster = amount - credited
            rec.credit_poster = credited

        self.backs[id] = rec
        BackSettled(id, outcome).emit()

    @gl.public.write
    def withdraw(self) -> None:
        addr = gl.message.sender_address
        amount = self._credit_of(addr)
        if amount == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no credits")
        self.credits[addr] = u256(0)
        if self.credits_outstanding >= amount:
            self.credits_outstanding = self.credits_outstanding - amount
        else:
            self.credits_outstanding = u256(0)
        try:
            _Recipient(Address(addr.as_hex)).emit_transfer(value=amount)
        except Exception:
            try:
                gl.get_contract_at(Address(addr.as_hex)).emit_transfer(value=amount)
            except Exception:
                self.credits[addr] = amount
                self.credits_outstanding = self.credits_outstanding + amount
                raise gl.vm.UserError(f"{ERROR_EXPECTED} native withdraw failed; credits restored")
        CreditsWithdrawn(str(addr), amount).emit()

    def _back_dict(self, rec: Back) -> dict:
        return {
            "id": rec.id,
            "poster": str(rec.poster),
            "prover": str(rec.prover),
            "claim": rec.claim,
            "source_url": rec.source_url,
            "kind": rec.kind,
            "state": rec.state,
            "amount": int(rec.amount),
            "created_at": rec.created_at,
            "outcome": rec.outcome,
            "quote": rec.quote,
            "reason": rec.reason,
            "fee_paid": int(rec.fee_paid),
            "paid_to_poster": int(rec.paid_to_poster),
            "paid_to_prover": int(rec.paid_to_prover),
            "credit_poster": int(rec.credit_poster),
            "credit_prover": int(rec.credit_prover),
            "attestation_json": rec.attestation_json,
        }

    @gl.public.view
    def get_back(self, id: str) -> dict:
        if id not in self.backs:
            raise gl.vm.UserError("back not found")
        return self._back_dict(self.backs[id])

    @gl.public.view
    def list_ids(self) -> list:
        return list(self.id_order)

    @gl.public.view
    def get_back_ids(self) -> list:
        return list(self.id_order)

    @gl.public.view
    def get_economics(self) -> dict:
        return {
            "treasury": int(self.treasury),
            "locked": int(self.locked),
            "credits": int(self.credits_outstanding),
            "fee_bps": int(PROTOCOL_FEE_BPS),
        }

    @gl.public.view
    def get_credit(self, addr: str) -> int:
        return int(self._credit_of(Address(addr)))
