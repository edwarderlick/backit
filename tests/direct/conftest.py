"""Point direct tests at the pinned runner.

The installed gltest and the pinned runner do not always agree on the SDK
module layout. Older runners expose ``genlayer.py.*`` and newer Studio Next
runners expose top-level ``genlayer.*`` modules. Keep the direct harness
compatible with both layouts.
"""

import importlib
import sys


def _drop_host_genlayer() -> None:
    for key in list(sys.modules):
        if key != "genlayer" and not key.startswith("genlayer."):
            continue
        mod = sys.modules.get(key)
        origin = str(getattr(mod, "__file__", "") or "").replace("\\", "/")
        if "site-packages/genlayer" in origin:
            del sys.modules[key]


def _import_calldata():
    try:
        return importlib.import_module("genlayer.calldata")
    except ModuleNotFoundError:
        return importlib.import_module("genlayer.py.calldata")


def _import_types():
    try:
        return importlib.import_module("genlayer.types")
    except ModuleNotFoundError:
        return importlib.import_module("genlayer.py.types")


def _import_message():
    try:
        return importlib.import_module("genlayer.message")
    except ModuleNotFoundError:
        return None


def _import_storage():
    try:
        return importlib.import_module("genlayer.storage")
    except ModuleNotFoundError:
        return importlib.import_module("genlayer.py.storage")


def _import_vm():
    try:
        return importlib.import_module("genlayer.vm")
    except ModuleNotFoundError:
        return importlib.import_module("genlayer.gl.vm")


def _as_address(value):
    if isinstance(value, (bytes, bytearray)):
        return _import_types().Address(bytes(value))
    return value


def _sync_message_context(
    *,
    contract_address=None,
    sender_address=None,
    origin_address=None,
    value=None,
    chain_id=None,
    datetime=None,
) -> None:
    message_mod = _import_message()
    if message_mod is not None:
        raw = message_mod.raw
        if isinstance(raw, dict):
            if contract_address is not None:
                raw["contract_address"] = contract_address
            if sender_address is not None:
                raw["sender_address"] = _as_address(sender_address)
            if origin_address is not None:
                raw["origin_address"] = _as_address(origin_address)
            if value is not None:
                raw["value"] = value
            if chain_id is not None:
                raw["chain_id"] = chain_id
            if datetime is not None:
                raw["datetime"] = datetime
            for key, val in raw.items():
                setattr(message_mod, key, val)
        return

    import genlayer.gl as gl

    raw = gl.message_raw
    if isinstance(raw, dict):
        if contract_address is not None:
            raw["contract_address"] = contract_address
        if sender_address is not None:
            raw["sender_address"] = _as_address(sender_address)
        if origin_address is not None:
            raw["origin_address"] = _as_address(origin_address)
        if value is not None:
            raw["value"] = value
        if chain_id is not None:
            raw["chain_id"] = chain_id
        if datetime is not None:
            raw["datetime"] = datetime
        gl.message = gl.MessageType(
            contract_address=raw["contract_address"],
            sender_address=raw["sender_address"],
            origin_address=raw["origin_address"],
            value=_import_types().u256(raw["value"]),
            chain_id=_import_types().u256(raw["chain_id"]),
        )


def pytest_configure() -> None:
    import gltest.direct.sdk_compat as compat

    compat.import_calldata = _import_calldata
    compat.import_types = _import_types
    compat.sync_message_context = _sync_message_context
    import gltest.direct.wasi_mock as wasi_mock

    # wasi_mock binds import_calldata at import time. The stock helper looks
    # for genlayer.calldata, which this runner does not export, so every
    # web/LLM gl_call decoded as a failure and came back as an empty page.
    wasi_mock.import_calldata = _import_calldata

    def _handle_llm_request(vm, data):
        prompt = data.get("prompt", "")
        response = vm._match_llm_mock(prompt)
        if response is not None:
            return {"ok": response}

        strict = getattr(vm, "_strict_mock_mode", False)
        if strict:
            registered = [p.pattern for p, _ in vm._llm_mocks]
            raise wasi_mock.MockNotFoundError(
                f"[strict] No LLM mock for prompt: {prompt[:100]}...\n"
                f"  Registered: {registered or '(none)'}"
            )

        live_handler = getattr(vm, "_live_llm_handler", None)
        if live_handler is not None:
            return live_handler(data)

        registered = [p.pattern for p, _ in vm._llm_mocks]
        raise wasi_mock.MockNotFoundError(
            f"No LLM mock for prompt: {prompt[:100]}...\n"
            f"  Registered: {registered or '(none)'}"
        )

    # Newer stdlib parses response_format="json" itself, so keep mock JSON as
    # text instead of auto-decoding it into a dict.
    wasi_mock._handle_llm_request = _handle_llm_request

    def _bytes(value):
        if value is None or isinstance(value, bytes):
            return value
        if isinstance(value, str):
            return value.encode("utf-8")
        return str(value).encode("utf-8")

    def _normalize_web_response(data):
        response = data.get("response", data)
        body = response.get("body", b"")
        headers = response.get("headers", {}) or {}
        return {
            "status": int(response.get("status", 200)),
            "headers": {str(k): _bytes(v) or b"" for k, v in headers.items()},
            "body": _bytes(body),
        }

    def _handle_web_request(vm, data):
        url = data.get("url", "")
        method = data.get("method", "GET")
        mock_data = vm._match_web_mock(url, method)
        if mock_data:
            return {"ok": {"response": _normalize_web_response(mock_data)}}

        strict = getattr(vm, "_strict_mock_mode", False)
        if strict:
            registered = [f"{r.get('method', 'GET')} {p.pattern}" for p, r in vm._web_mocks]
            raise wasi_mock.MockNotFoundError(
                f"[strict] No web mock for {method} {url}\n"
                f"  Registered: {registered or '(none)'}"
            )

        live_handler = getattr(vm, "_live_web_handler", None)
        if live_handler is not None:
            return live_handler(data)

        registered = [f"{r.get('method', 'GET')} {p.pattern}" for p, r in vm._web_mocks]
        raise wasi_mock.MockNotFoundError(
            f"No web mock for {method} {url}\n"
            f"  Registered: {registered or '(none)'}"
        )

    wasi_mock._handle_web_request = _handle_web_request
    import gltest.direct.vm as vm_mod

    vm_mod.sync_message_context = _sync_message_context

    import gltest.direct.loader as loader

    def load_contract_class(contract_path, vm, sdk_version=None):
        from pathlib import Path

        from gltest.direct import wasi_mock
        from gltest.direct.sdk_loader import setup_sdk_paths

        contract_path = Path(contract_path).resolve()
        if not contract_path.exists():
            raise FileNotFoundError(f"Contract not found: {contract_path}")
        wasi_mock.set_vm(vm)
        sys.modules["_genlayer_wasi"] = wasi_mock
        setup_sdk_paths(contract_path, sdk_version)
        _drop_host_genlayer()
        import os
        import tempfile

        calldata = _import_calldata()
        Address = _import_types().Address

        def _addr(value):
            if isinstance(value, bytes):
                return Address(value)
            return value

        message_data = {
            "contract_address": _addr(vm._contract_address),
            "sender_address": _addr(vm.sender),
            "origin_address": _addr(vm.origin),
            "stack": [],
            "value": vm._value,
            "datetime": vm._datetime,
            "is_init": False,
            "chain_id": vm._chain_id,
            "entry_kind": 0,
            "entry_data": b"",
            "entry_stage_data": None,
        }
        encoded = calldata.encode(message_data)
        fd, path = tempfile.mkstemp()
        os.write(fd, encoded)
        os.lseek(fd, 0, os.SEEK_SET)
        vm._original_stdin_fd = os.dup(0)
        os.dup2(fd, 0)
        os.close(fd)
        try:
            os.unlink(path)
        except OSError:
            pass
        os.lseek(0, 0, os.SEEK_SET)
        loader._patch_get_type_hints_for_pep695()
        module = loader._load_module(contract_path)
        storage = _import_storage()
        internal = importlib.import_module(f"{storage.__name__}._internal")
        generate = importlib.import_module(f"{storage.__name__}._internal.generate")

        sys.modules.setdefault("genlayer.storage", storage)
        sys.modules.setdefault("genlayer.storage._internal", internal)
        sys.modules.setdefault("genlayer.storage._internal.generate", generate)
        gl_vm = _import_vm()

        def _direct_nondet(leader_fn, validator_fn, /, **kwargs):
            from gltest.direct import wasi_mock

            vm_ctx = wasi_mock.get_vm()
            vm_ctx._in_nondet = True
            try:
                result = leader_fn()
            finally:
                vm_ctx._in_nondet = False
            vm_ctx._captured_validators.append((result, leader_fn, validator_fn))
            return result

        gl_vm.run_nondet_default = _direct_nondet
        gl_vm.run_nondet_unsafe = _direct_nondet
        gl_vm.run_nondet = _direct_nondet
        contract_cls = loader._find_contract_class(module)
        if contract_cls is None:
            raise ValueError(f"No contract class found in {contract_path}")
        return contract_cls

    def _allocate_contract(contract_cls, vm, *args, **kwargs):
        storage = _import_storage()
        ROOT_SLOT_ID = storage.ROOT_SLOT_ID
        generate = importlib.import_module(f"{storage.__name__}._internal.generate")
        ORIGINAL_INIT_ATTR = generate.ORIGINAL_INIT_ATTR
        _storage_build = generate._storage_build
        _BuilderCtx = getattr(generate, "_BuilderCtx", None)

        if _BuilderCtx is not None:
            td = _storage_build(_BuilderCtx.empty(), contract_cls)
        else:
            td = _storage_build(contract_cls, {})
        slot = vm._storage.get_store_slot(ROOT_SLOT_ID)
        instance = td.get(slot, 0)
        init = getattr(getattr(td, "cls", contract_cls), "__init__", None)
        if init is not None and hasattr(init, ORIGINAL_INIT_ATTR):
            init = getattr(init, ORIGINAL_INIT_ATTR)
        if init is not None:
            init(instance, *args, **kwargs)
        return instance

    loader.load_contract_class = load_contract_class
    loader._allocate_contract = _allocate_contract

    def _refresh(self) -> None:
        try:
            _sync_message_context(
                sender_address=self.sender,
                origin_address=self.origin,
                value=self._value,
                chain_id=self._chain_id,
                datetime=self._datetime,
            )
        except Exception:
            return

    vm_mod.VMContext._refresh_gl_message = _refresh

    import functools

    def _make_contract_proxy(instance):
        """Public calls snapshot storage and roll back on any exception.

        GenVM reverts the whole transaction when a method raises. Direct mode
        otherwise keeps the proof lock written before a failed prove.
        """
        contract_cls = type(instance)
        proxy_cls = loader._proxy_class_cache.get(contract_cls)
        if proxy_cls is None:
            proxy_cls = type(
                contract_cls.__name__,
                (),
                {
                    "__slots__": ("_instance",),
                    "__module__": contract_cls.__module__,
                    "__qualname__": contract_cls.__qualname__,
                },
            )

            def _proxy_getattr(self, name):
                inst = object.__getattribute__(self, "_instance")
                attr = getattr(inst, name)
                if not name.startswith("_") and callable(attr):

                    @functools.wraps(attr)
                    def _wrapped(*args, **kwargs):
                        from gltest.direct import wasi_mock

                        vm = wasi_mock.get_vm()
                        snap = vm.snapshot()
                        try:
                            kwargs = loader._drop_direct_transaction_kwargs(kwargs)
                            args, kwargs = loader._calldata_roundtrip_args(args, kwargs)
                            return attr(*args, **kwargs)
                        except Exception:
                            vm.revert(snap)
                            raise

                    return _wrapped
                return attr

            def _proxy_setattr(self, name, value):
                if name == "_instance":
                    object.__setattr__(self, name, value)
                else:
                    setattr(object.__getattribute__(self, "_instance"), name, value)

            def _proxy_repr(self):
                inst = object.__getattribute__(self, "_instance")
                return f"<CalldataProxy for {inst!r}>"

            proxy_cls.__getattr__ = _proxy_getattr
            proxy_cls.__setattr__ = _proxy_setattr
            proxy_cls.__repr__ = _proxy_repr
            loader._proxy_class_cache[contract_cls] = proxy_cls

        proxy = object.__new__(proxy_cls)
        object.__setattr__(proxy, "_instance", instance)
        return proxy

    loader._make_contract_proxy = _make_contract_proxy

    _unset = object()

    def run_validator(self, *, leader_result=_unset, leader_error=None, index=-1):
        if not self._captured_validators:
            raise RuntimeError(
                "No validator captured. Call a contract method that uses "
                "gl.vm.run_nondet before calling run_validator()."
            )
        stored_result, _leader_fn, validator_fn = self._captured_validators[index]
        gl_vm = _import_vm()

        if leader_error is not None:
            wrapped = gl_vm.UserError(str(leader_error))
        elif leader_result is not _unset:
            wrapped = gl_vm.Return(calldata=leader_result)
        else:
            wrapped = gl_vm.Return(calldata=stored_result)
        return validator_fn(wrapped)

    vm_mod.VMContext.run_validator = run_validator
