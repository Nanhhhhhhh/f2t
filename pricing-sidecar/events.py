"""In-memory event ring-buffer for live observability.

Thread-safe: FastAPI runs sync endpoints in a threadpool, so record() may be
called from worker threads while the SSE generator reads from the event loop.
We rely on a Lock + deque (deque.append is atomic in CPython). Read-only feed —
this never alters any endpoint's response contract.
"""
import time
from collections import deque
from threading import Lock

_MAX = 200  # keep last ~200 events; memory negligible, covers a demo session of traffic
_events: "deque[dict]" = deque(maxlen=_MAX)
_seq = 0
_lock = Lock()


def record(kind: str, payload: dict) -> dict:
    global _seq
    with _lock:
        _seq += 1
        evt = {"seq": _seq, "ts": time.time(), "kind": kind, **payload}
        _events.append(evt)
        return evt


def get_since(since: int) -> list[dict]:
    with _lock:
        return [e for e in _events if e["seq"] > since]  # O(n) scan over ≤_MAX events — acceptable at this scale


def latest_seq() -> int:
    with _lock:
        return _seq


def _reset(maxlen: int = _MAX) -> None:
    """Test helper: clear buffer and reset the sequence counter."""
    global _events, _seq
    with _lock:
        _events = deque(maxlen=maxlen)  # safe under _lock: concurrent record()/get_since() block until the new deque is installed
        _seq = 0
