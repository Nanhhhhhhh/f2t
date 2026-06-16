"""Đánh giá CoreML freshness classifier trên một tập kiểm thử có nhãn.

Cách dùng:
    python eval_freshness.py <category> <test_dir>

Trong đó:
  - <category> là "fruit" hoặc "root" (chọn model MyFreshnessClassifier-<category>.mlmodel)
  - <test_dir> chứa hai thư mục con đúng tên nhãn của model: "fresh/" và "rotten/",
    mỗi thư mục chứa ảnh .jpg/.png/.jpeg/.webp tương ứng.

Cấu trúc tập kiểm thử mong đợi:
    test_dir/
        fresh/   *.jpg ...
        rotten/  *.jpg ...

Script chạy on-device bằng coremltools (macOS), in ra accuracy, precision/recall/F1
theo từng lớp và ma trận nhầm lẫn. Yêu cầu: pip install coremltools pillow.
"""
import os
import sys
import coremltools as ct
from PIL import Image

LABELS = ("fresh", "rotten")
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")


def _img_size(model: ct.models.MLModel) -> tuple[int, int]:
    it = model.get_spec().description.input[0].type.imageType
    return int(it.width), int(it.height)


def evaluate(category: str, test_dir: str) -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(here, f"MyFreshnessClassifier-{category}.mlmodel")
    model = ct.models.MLModel(model_path)
    w, h = _img_size(model)
    input_name = model.get_spec().description.input[0].name  # "image"

    # confusion[true][pred]
    confusion = {t: {p: 0 for p in LABELS} for t in LABELS}
    n_total = 0
    n_skipped = 0

    for true_label in LABELS:
        folder = os.path.join(test_dir, true_label)
        if not os.path.isdir(folder):
            print(f"[cảnh báo] thiếu thư mục nhãn: {folder}")
            continue
        for fname in os.listdir(folder):
            if not fname.lower().endswith(IMG_EXT):
                continue
            try:
                img = Image.open(os.path.join(folder, fname)).convert("RGB").resize((w, h))
                out = model.predict({input_name: img})
                pred = out["target"]
            except Exception as e:
                n_skipped += 1
                continue
            if pred not in LABELS:
                n_skipped += 1
                continue
            confusion[true_label][pred] += 1
            n_total += 1

    if n_total == 0:
        print("Không có ảnh hợp lệ nào được dự đoán. Kiểm tra lại đường dẫn / cấu trúc thư mục.")
        return

    correct = sum(confusion[l][l] for l in LABELS)
    accuracy = correct / n_total

    print(f"\n=== CoreML Freshness Eval — {category} ===")
    print(f"Model    : MyFreshnessClassifier-{category}.mlmodel  (input {w}x{h})")
    print(f"Test set : {test_dir}")
    print(f"N        : {n_total} ảnh  (bỏ qua {n_skipped})")
    print(f"Accuracy : {accuracy:.4f}\n")

    print("Ma trận nhầm lẫn (hàng = nhãn thật, cột = dự đoán):")
    header = "            " + "".join(f"{p:>10}" for p in LABELS)
    print(header)
    for t in LABELS:
        row = "".join(f"{confusion[t][p]:>10}" for p in LABELS)
        print(f"{t:>10}  {row}")

    print("\nTheo từng lớp:")
    for c in LABELS:
        tp = confusion[c][c]
        fp = sum(confusion[t][c] for t in LABELS if t != c)
        fn = sum(confusion[c][p] for p in LABELS if p != c)
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        print(f"  {c:>7} | precision={prec:.4f}  recall={rec:.4f}  f1={f1:.4f}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("fruit", "root"):
        print(__doc__)
        sys.exit(1)
    evaluate(sys.argv[1], sys.argv[2])
