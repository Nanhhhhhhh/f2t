import pytest
import events


@pytest.fixture(autouse=True)
def fresh_buffer():
    events._reset()
    yield


def test_record_assigns_monotonic_seq():
    e1 = events.record("predict", {"productId": "a"})
    e2 = events.record("predict", {"productId": "b"})
    assert e1["seq"] == 1
    assert e2["seq"] == 2
    assert e2["ts"] >= e1["ts"]
    assert e2["kind"] == "predict"
    assert e2["productId"] == "b"


def test_get_since_returns_only_newer():
    events.record("predict", {"productId": "a"})
    events.record("predict", {"productId": "b"})
    newer = events.get_since(1)
    assert [e["productId"] for e in newer] == ["b"]
    assert events.latest_seq() == 2


def test_ring_buffer_caps_size():
    events._reset(maxlen=3)
    for i in range(5):
        events.record("predict", {"i": i})
    all_evts = events.get_since(0)
    assert len(all_evts) == 3
    assert [e["i"] for e in all_evts] == [2, 3, 4]
