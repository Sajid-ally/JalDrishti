from datetime import datetime

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form
)

from app.utils.fileHandler import saveImage

from app.missingPerson.service import (
    createMissingPerson,
    getMissingPersons,
    markPersonFound
)


router = APIRouter(
    prefix="/missing-persons",
    tags=["Missing Person"]
)


# =========================================================
# CREATE MISSING PERSON REPORT
# =========================================================

@router.post("/")
async def addMissingPerson(

    name: str = Form(...),

    age: int = Form(...),

    gender: str = Form(...),

    description: str = Form(...),

    latitude: float = Form(...),

    longitude: float = Form(...),

    lastSeenDescription: str = Form(...),

    contactName: str = Form(...),

    contactPhone: str = Form(...),

    image: UploadFile = File(...)
):

    print("MISSING PERSON REPORT RECEIVED")

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    imagePath = saveImage(
        image,
        "uploads/missingPersons"
    )

    print("MISSING PERSON IMAGE SAVED:")
    print(imagePath)

    # -----------------------------------------------------
    # CREATE DATA
    # -----------------------------------------------------

    personData = {

        "name": name,

        "age": age,

        "gender": gender,

        "description": description,

        "lastSeenLocation": {
            "latitude": latitude,
            "longitude": longitude
        },

        "lastSeenDescription": lastSeenDescription,

        "imageUrl": imagePath,

        "contactName": contactName,

        "contactPhone": contactPhone,

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    # -----------------------------------------------------
    # SAVE TO MONGODB
    # -----------------------------------------------------

    print("SAVING MISSING PERSON TO MONGODB")

    insertedId = await createMissingPerson(
        personData
    )

    print("MISSING PERSON SAVED")

    return {

        "message": "Missing person report submitted successfully",

        "personId": str(insertedId),

        "status": "Missing"
    }


# =========================================================
# GET ALL MISSING PERSONS
# =========================================================

@router.get("/")
async def fetchMissingPersons():

    print("FETCHING MISSING PERSONS")

    persons = await getMissingPersons()

    return {

        "count": len(persons),

        "persons": persons
    }

# =========================================================
# MARK PERSON AS FOUND
# =========================================================

@router.put("/{personId}/found")
async def foundMissingPerson(
    personId: str,
    foundBy: str = Form(...)
):

    print("MARKING PERSON AS FOUND")

    person = await markPersonFound(
        personId,
        foundBy
    )

    if person is None:

        return {
            "message": "Missing person not found"
        }

    return {
        "message": "Missing person marked as found",
        "person": person
    }