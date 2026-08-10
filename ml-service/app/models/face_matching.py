import io
import numpy as np
import torch

from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1


# Detects a face and aligns/crops it
face_detector = MTCNN(
    image_size=160,
    margin=20,
    keep_all=False
)

# Pretrained FaceNet model
face_model = InceptionResnetV1(
    pretrained="vggface2"
).eval()


def get_embedding(image_bytes):
   

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Detect and crop the face
    face = face_detector(image)

    if face is None:
        raise ValueError("No face detected in the image")

    # Add batch dimension
    face = face.unsqueeze(0)

    # Generate 512-dimensional embedding
    with torch.no_grad():
        embedding = face_model(face)

    # Convert tensor → numpy
    embedding = embedding[0].numpy()

    # Normalize embedding
    embedding = embedding / np.linalg.norm(embedding)

    return embedding


def cosine_similarity(embedding1, embedding2):
   

    embedding1 = np.asarray(embedding1)
    embedding2 = np.asarray(embedding2)

    similarity = np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    )

    return float(similarity)


def compare_face(new_embedding, stored_embedding, threshold=0.70):
   

    similarity = cosine_similarity(
        new_embedding,
        stored_embedding
    )

    return {
        "matched": similarity >= threshold,
        "similarity": round(similarity, 4)
    }


def find_matching_person(
    new_embedding,
    people,
    threshold=0.70
):
    

    best_match = None
    best_similarity = -1

    for person in people:

        similarity = cosine_similarity(
            new_embedding,
            person["embedding"]
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = person

    # No people in database
    if best_match is None:
        return {
            "matched": False,
            "person_id": None,
            "similarity": 0.0
        }

    # Check threshold
    if best_similarity >= threshold:
        return {
            "matched": True,
            "person_id": best_match["person_id"],
            "similarity": round(best_similarity, 4)
        }

    return {
        "matched": False,
        "person_id": None,
        "similarity": round(best_similarity, 4)
    }