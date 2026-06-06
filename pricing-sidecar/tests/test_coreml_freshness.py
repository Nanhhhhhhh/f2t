import os, pytest
ct = pytest.importorskip("coremltools")
from PIL import Image
FRESH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "freshnessmodels"))

@pytest.mark.parametrize("fname", ["MyFreshnessClassifier-fruit.mlmodel", "MyFreshnessClassifier-root.mlmodel"])
def test_coreml_predict(fname):
    path = os.path.join(FRESH, fname)
    assert os.path.exists(path), f"missing {path}"
    model = ct.models.MLModel(path)
    img = Image.new("RGB", (299, 299), (120, 180, 90))
    out = model.predict({"image": img})
    assert "target" in out or "targetProbability" in out, out.keys()
    print(fname, "->", {k: out[k] for k in out})
