from ultralytics import YOLO
from PIL import Image, ImageDraw
import base64
import io
from pathlib import Path
from .classify import predict_ensemble_soft_voting, predict_ensemble_weighted

weights_dir = Path(__file__).parent.parent.parent / "model" / "weights"
model = YOLO(str(weights_dir / "Yolov8.pt"))  # trained weights



def Detect(image: Image.Image):

    #Get start time
    results = model(image, conf=0.60)
    result = results[0]
    boxes = result.boxes
    names = result.names

    if boxes is None or len(boxes) == 0:
        return {"error": "No detections"}

    best_leaf_box = None
    best_conf = -1.0

    for box in boxes:
        cls = int(box.cls[0])
        label = names[cls]
        conf = float(box.conf[0])

        if label.lower() == "cassava_leaf" and conf > best_conf:
            best_conf = conf
            best_leaf_box = box

    if best_leaf_box is None:
        return {"error": "Not Leaf"}

    x1, y1, x2, y2 = map(int, best_leaf_box.xyxy[0].tolist())

    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(image.width, x2)
    y2 = min(image.height, y2)

    bbox = [x1, y1, x2, y2]

    cropped = CropImage(image, bbox)
    if cropped is None:
        return {"error": "Invalid crop"}

    classification = predict_ensemble_soft_voting(
        cropped,
        return_individual=False
    )

    annotated = DrawBox(image.copy(), bbox, label="Cassava_Leaf", conf=best_conf)
    annotated_b64 = ImageToBase64(annotated)

    return {
        "detection": {
            "label": "Cassava Leaf",
            "confidence": round(best_conf, 4),
            "box": bbox
        },
        "ensemble": classification,
        "annotated_image_base64": annotated_b64,
    }

# Crop Image 
def CropImage(image: Image.Image, box: list):

    x1, y1, x2, y2 = map(int, box)

    w, h = image.size
    x1 = max(0, min(x1, w))
    x2 = max(0, min(x2, w))
    y1 = max(0, min(y1, h))
    y2 = max(0, min(y2, h))

    cropped = image.crop((x1, y1, x2, y2))
    return cropped

# Draw bounding box
def DrawBox(image: Image.Image, box, label="Leaf", conf=0.0):

    img = image.copy()
    draw = ImageDraw.Draw(img)

    x1, y1, x2, y2 = map(int, box)

    # Rectangle
    draw.rectangle([x1, y1, x2, y2], outline="red", width=4)

    # Label text
    text = f"{label} {conf:.2f}"
    draw.text((x1, max(0, y1 - 20)), text, fill="red")

    return img

def ImageToBase64(image: Image.Image):
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")