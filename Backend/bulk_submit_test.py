import os
import requests

BASE_URL = "http://localhost:8000/reports/"
TEST_ROOT = r"C:\Users\mohds\OneDrive\Desktop\codes\CoastalEye\ml-service\datasets\test"

LAT = 26.4499
LON = 80.3319

for category in os.listdir(TEST_ROOT):
    category_path = os.path.join(TEST_ROOT, category)

    if not os.path.isdir(category_path):
        continue

    print(f"\n=== {category} ===")

    for filename in os.listdir(category_path):
        path = os.path.join(category_path, filename)

        if not os.path.isfile(path):
            continue

        with open(path, "rb") as f:
            files = {
                "image": (filename, f, "image/jpeg")
            }

            data = {
                "title": filename,
                "description": "Bulk test",
                "latitude": LAT,
                "longitude": LON,
                "claimedHazard": category
            }

            r = requests.post(BASE_URL, files=files, data=data)

            print(filename, "->", r.status_code)

            if r.status_code != 200:
                print(r.text)