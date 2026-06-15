from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
from .detection import Detect,Result
from .database import FetchAnalytics


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict_image(
    file: UploadFile = File(...),
    province: str = Form(...),
    city: str = Form(...),
    barangay: str = Form(...)
):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    parameters = {
        "image" : image,
        "location" : {
            "province" : province,
            "city" : city,
            "barangay" : barangay
        }
    }

    result = Result(parameters)
    return result


@app.get("/analytics")
async def get_analytics():
    result = FetchAnalytics()
    if result is None:
        raise HTTPException(status_code=500, detail="Database error")
    return {"data": result.data}  # returns the raw list of rows