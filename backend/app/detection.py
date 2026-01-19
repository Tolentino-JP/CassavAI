from ultralytics import YOLO

model = YOLO(r'C:\Users\johnp\Documents\Paul_Files\fourth year\CSELEC3\Thesis\Models\yolo8x.pt')  # your trained weights

def predicts(image):
    results = model(image)

    output = []
    for box in results[0].boxes:
        cls = int(box.cls)
        label = results[0].names[cls]
        conf = float(box.conf)
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        output.append({
            "label": label,
            "confidence": conf,
            "box": [x1, y1, x2, y2]
        })

    return output