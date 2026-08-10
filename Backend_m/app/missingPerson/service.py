from app.database import database


# =========================================================
# CREATE MISSING PERSON REPORT
# =========================================================

async def createMissingPerson(personData: dict):

    missingPersonDocument = {

        "name": personData["name"],

        "age": personData["age"],

        "gender": personData["gender"],

        "description": personData["description"],

        "lastSeenLocation": {
            "latitude": personData["lastSeenLocation"]["latitude"],
            "longitude": personData["lastSeenLocation"]["longitude"]
        },

        "lastSeenDescription": personData["lastSeenDescription"],

        "imageUrl": personData["imageUrl"],

        "contactName": personData["contactName"],

        "contactPhone": personData["contactPhone"],

        "status": "Missing",

        "createdAt": personData["createdAt"],

        "updatedAt": personData["updatedAt"]
    }

    result = await database.missingPersons.insert_one(
        missingPersonDocument
    )

    return result.inserted_id


# =========================================================
# GET ALL MISSING PERSONS
# =========================================================

async def getMissingPersons():

    cursor = database.missingPersons.find().sort(
        "createdAt",
        -1
    )

    persons = []

    async for person in cursor:

        person["id"] = str(person["_id"])

        del person["_id"]

        persons.append(person)

    return persons

from bson import ObjectId

# =========================================================
# MARK MISSING PERSON AS FOUND
# =========================================================

async def markPersonFound(
    personId: str,
    foundBy: str
):

    from datetime import datetime
    from bson import ObjectId

    foundAt = datetime.utcnow()

    result = await database.missingPersons.update_one(
        {
            "_id": ObjectId(personId)
        },
        {
            "$set": {
                "status": "Found",
                "foundBy": foundBy,
                "foundAt": foundAt,
                "updatedAt": foundAt
            }
        }
    )

    if result.matched_count == 0:
        return None

    person = await database.missingPersons.find_one(
        {
            "_id": ObjectId(personId)
        }
    )

    if person:

        person["id"] = str(person["_id"])

        del person["_id"]

    return person