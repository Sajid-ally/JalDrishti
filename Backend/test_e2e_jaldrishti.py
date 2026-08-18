import asyncio
import os
import sys
import io
import httpx
from PIL import Image, ImageDraw

BACKEND_URL = "http://127.0.0.1:8000"
ML_URL = "http://127.0.0.1:8001"


def create_test_image(seed: int = 1, size=(250, 250)) -> bytes:
    img = Image.new("RGB", size, color=((seed * 43) % 255, (seed * 89) % 255, (seed * 127) % 255))
    draw = ImageDraw.Draw(img)
    for i in range(8):
        x0 = (seed * 19 + i * 28) % 180
        y0 = (seed * 31 + i * 22) % 180
        fill_color = ((seed * 71 + i * 33) % 255, (seed * 53 + i * 44) % 255, (seed * 97 + i * 11) % 255)
        draw.rectangle([x0, y0, x0 + 45, y0 + 45], fill=fill_color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


async def run_all_tests():
    print("=" * 60)
    print(" JalDrishti End-to-End Local System Integration Test")
    print("=" * 60)

    results = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Health Checks
        try:
            r = await client.get(f"{BACKEND_URL}/health")
            assert r.status_code == 200, f"Status {r.status_code}"
            data = r.json()
            assert data.get("status") == "ok"
            results.append(("1. Backend Health Check", "PASS", f"Status: {data}"))
        except Exception as e:
            results.append(("1. Backend Health Check", "FAIL", str(e)))

        # 2. ML Service Health
        try:
            r = await client.get(f"{ML_URL}/")
            assert r.status_code == 200, f"Status {r.status_code}"
            results.append(("2. ML Service Health Check", "PASS", f"Status: {r.json()}"))
        except Exception as e:
            results.append(("2. ML Service Health Check", "FAIL", str(e)))

        # 3. Direct ML Detection
        try:
            test_img_bytes = create_test_image(seed=10)
            files = {"file": ("water.jpg", test_img_bytes, "image/jpeg")}
            r = await client.post(f"{ML_URL}/api/detect", files=files)
            assert r.status_code == 200, f"Status {r.status_code}"
            ml_data = r.json()
            assert "hazard_type" in ml_data
            assert "confidence" in ml_data
            assert "severity" in ml_data
            results.append(("3. MobileNetV2 ML Inference", "PASS", f"Detected: {ml_data['hazard_type']} (conf: {ml_data['confidence']}, sev: {ml_data['severity']})"))
        except Exception as e:
            results.append(("3. MobileNetV2 ML Inference", "FAIL", str(e)))

        # 4. User Signup & Auth Token
        test_email = f"testuser_{os.urandom(3).hex()}@jaldrishti.in"
        test_password = "Password@123"
        citizen_token = None
        citizen_user_id = None

        try:
            r = await client.post(f"{BACKEND_URL}/auth/signup", json={
                "name": "Local Test Citizen",
                "email": test_email,
                "password": test_password,
                "role": "citizen"
            })
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            auth_data = r.json()
            assert auth_data.get("success") is True
            citizen_token = auth_data.get("token")
            citizen_user_id = auth_data.get("user", {}).get("id")
            results.append(("4. Citizen Auth Signup", "PASS", f"User: {auth_data['user']['email']}, Role: {auth_data['user']['role']}"))
        except Exception as e:
            results.append(("4. Citizen Auth Signup", "FAIL", str(e)))

        # 5. User Login & Verification
        try:
            r = await client.post(f"{BACKEND_URL}/auth/login", json={
                "email": test_email,
                "password": test_password,
                "role": "citizen"
            })
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            login_data = r.json()
            assert login_data.get("success") is True
            results.append(("5. Citizen Auth Login", "PASS", f"Authenticated successfully as {login_data['user']['email']}"))
        except Exception as e:
            results.append(("5. Citizen Auth Login", "FAIL", str(e)))

        # 6. Session Verification (/auth/me)
        try:
            headers = {"Authorization": f"Bearer {citizen_token}"}
            r = await client.get(f"{BACKEND_URL}/auth/me", headers=headers)
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            me_data = r.json()
            assert me_data.get("success") is True
            results.append(("6. Auth Session /auth/me", "PASS", f"Verified profile for ID: {me_data['user']['id']}"))
        except Exception as e:
            results.append(("6. Auth Session /auth/me", "FAIL", str(e)))

        # 7. AI Analyze Endpoint (/reports/analyze)
        try:
            test_img_bytes = create_test_image(seed=25)
            files = {"image": ("flood_test.jpg", test_img_bytes, "image/jpeg")}
            r = await client.post(f"{BACKEND_URL}/reports/analyze", files=files)
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            analyze_data = r.json()
            assert analyze_data.get("success") is True
            assert "category" in analyze_data
            assert "confidence" in analyze_data
            results.append(("7. Report Media AI Analysis (/reports/analyze)", "PASS", f"Category: {analyze_data['category']}, Title: '{analyze_data.get('title')}'"))
        except Exception as e:
            results.append(("7. Report Media AI Analysis (/reports/analyze)", "FAIL", str(e)))

        # 8. Unique Report Submission (/reports/)
        first_report_id = None
        unique_seed = int(os.urandom(2).hex(), 16)
        unique_image_bytes = create_test_image(seed=unique_seed)

        try:
            headers = {"Authorization": f"Bearer {citizen_token}"}
            files = {"image": ("report1.jpg", unique_image_bytes, "image/jpeg")}
            data = {
                "latitude": 20.2961,
                "longitude": 85.8245,
                "claimedHazard": "flooding",
                "category": "flooding",
                "title": "Submerged Major Roadway",
                "description": "Rising water levels blocking two vehicular lanes.",
            }
            r = await client.post(f"{BACKEND_URL}/reports/", headers=headers, files=files, data=data)
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            rep_data = r.json()
            assert rep_data.get("success") is True, f"Response: {rep_data}"
            first_report_id = rep_data.get("publicReportId") or rep_data.get("reportId") or rep_data.get("id")
            results.append(("8. Real Report Submission to MongoDB Atlas", "PASS", f"Public Report ID: {first_report_id}, Priority: {rep_data.get('priority')}"))
        except Exception as e:
            results.append(("8. Real Report Submission to MongoDB Atlas", "FAIL", str(e)))

        # 9. Exact Duplicate Report Detection (Submitting the same image again)
        try:
            headers = {"Authorization": f"Bearer {citizen_token}"}
            files = {"image": ("report1_dup.jpg", unique_image_bytes, "image/jpeg")}
            data = {
                "latitude": 20.2961,
                "longitude": 85.8245,
                "claimedHazard": "flooding",
            }
            r = await client.post(f"{BACKEND_URL}/reports/", headers=headers, files=files, data=data)
            assert r.status_code == 200, f"Status {r.status_code}"
            dup_data = r.json()
            assert dup_data.get("duplicate") is True or dup_data.get("duplicateType") == "exact"
            results.append(("9. Duplicate Report Detection (Image/User check)", "PASS", f"Correctly flagged duplicate of: {dup_data.get('existingReportId')}"))
        except Exception as e:
            results.append(("9. Duplicate Report Detection (Image/User check)", "FAIL", str(e)))

        # 10. Citizen's Own Reports (/reports/my)
        try:
            headers = {"Authorization": f"Bearer {citizen_token}"}
            r = await client.get(f"{BACKEND_URL}/reports/my", headers=headers)
            assert r.status_code == 200, f"Status {r.status_code}"
            my_data = r.json()
            assert my_data.get("success") is True
            count = len(my_data.get("reports", []))
            assert count >= 1, f"Count was {count}"
            results.append(("10. Citizen Own Reports Retrieval (/reports/my)", "PASS", f"Retrieved {count} reports for authenticated user"))
        except Exception as e:
            results.append(("10. Citizen Own Reports Retrieval (/reports/my)", "FAIL", str(e)))

        # 11. Nearby Reports Endpoint (/reports/nearby)
        try:
            r = await client.get(f"{BACKEND_URL}/reports/nearby?latitude=20.2961&longitude=85.8245&radiusKm=10.0")
            assert r.status_code == 200, f"Status {r.status_code}"
            nearby_data = r.json()
            assert nearby_data.get("success") is True
            assert len(nearby_data.get("reports", [])) >= 1
            results.append(("11. Nearby Reports Calculation (/reports/nearby)", "PASS", f"Found {len(nearby_data['reports'])} nearby reports with distance tags"))
        except Exception as e:
            results.append(("11. Nearby Reports Calculation (/reports/nearby)", "FAIL", str(e)))

        # 12. Report Public Tracking (/reports/{id}/track)
        try:
            assert first_report_id is not None
            r = await client.get(f"{BACKEND_URL}/reports/{first_report_id}/track")
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            track_data = r.json()
            assert track_data.get("success") is True
            assert "timeline" in track_data.get("report", {})
            results.append(("12. Public Incident Tracking (/reports/{id}/track)", "PASS", f"Tracking verified for ID: {first_report_id}"))
        except Exception as e:
            results.append(("12. Public Incident Tracking (/reports/{id}/track)", "FAIL", str(e)))

        # 13. Government Role Auth & Verification Update
        try:
            gov_email = f"gov_{os.urandom(3).hex()}@jaldrishti.gov.in"
            r = await client.post(f"{BACKEND_URL}/auth/signup", json={
                "name": "Incident Commander Sharma",
                "email": gov_email,
                "password": test_password,
                "role": "government"
            })
            assert r.status_code == 200
            gov_token = r.json()["token"]

            headers = {"Authorization": f"Bearer {gov_token}"}
            form_data = {
                "status": "verified",
                "officerNotes": "Ground unit dispatched, confirmed 2ft waterlogging.",
                "assignedDepartment": "Drainage Department",
            }
            r = await client.put(f"{BACKEND_URL}/reports/{first_report_id}/verification", headers=headers, data=form_data)
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
            results.append(("13. Government Report Verification & Department Assignment", "PASS", f"Report verified and assigned to Drainage Department"))
        except Exception as e:
            results.append(("13. Government Report Verification & Department Assignment", "FAIL", str(e)))

    print("\n" + "=" * 60)
    print(" FINAL INTEGRATION TEST MATRIX")
    print("=" * 60)
    all_passed = True
    for name, status, detail in results:
        status_str = f"[\033[92m{status}\033[0m]" if status == "PASS" else f"[\033[91m{status}\033[0m]"
        print(f"{name:<55} {status_str}")
        print(f"   -> {detail}")
        if status != "PASS":
            all_passed = False
    print("=" * 60)
    if all_passed:
        print(" ALL 13 END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY!")
    else:
        print(" SOME TESTS FAILED. PLEASE CHECK LOGS ABOVE.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
