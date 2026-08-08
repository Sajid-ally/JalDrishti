from fastapi import FastAPI, UploadFile, File
from app.location.routes import router as locationRouter
from app.reports.routes import router as reportRouter
from app.gemini.service import analyzeImage
from app.utils.fileHandler import saveImage
from app.relief.routes import router as reliefRouter
from app.missingPerson.routes import router as missingPersonRouter

app = FastAPI(
    title="OceanShield Backend",
    version="1.0.0"
)

app.include_router(reportRouter)
app.include_router(locationRouter)
app.include_router(reliefRouter)
app.include_router(missingPersonRouter)


@app.get("/")
async def home():
    return {
        "message": "OceanShield Backend Running Successfully"
    }


@app.post("/test-gemini")
async def testGemini(
    image: UploadFile = File(...)
):
    print("STEP 1")

    imagePath = saveImage(image, "uploads/test")

    print("STEP 2")
    print(imagePath)

    result = await analyzeImage(imagePath)

    print("STEP 3")
    print(result)

    return result