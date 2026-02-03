from fastapi import FastAPI
from fastapi import UploadFile, File
from PIL import Image
import io

from .detection import Detect


app = FastAPI()

@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    result = Detect(image)
    return result

