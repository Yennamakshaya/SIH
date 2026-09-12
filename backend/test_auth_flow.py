import random
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_system():
    rand_id = random.randint(1000, 9999)
    test_mobile = f"9848{random.randint(100000, 999999)}"
    test_buyer_mobile = f"9876{random.randint(100000, 999999)}"
    test_username = f"kiran_farmer_{rand_id}"
    test_email = f"kiran_{rand_id}@kisanlink.in"

    print("\n--- 1. Testing Farmer Registration (Separate Form, Zero OTP) ---")
    farmer_payload = {
        "full_name": f"Kiran Kumar {rand_id}",
        "mobile_number": test_mobile,
        "username": test_username,
        "email": test_email,
        "password": "farmerpassword123",
        "confirm_password": "farmerpassword123",
        "address": "Plot 12, Farm Road",
        "village": "Shadnagar",
        "mandal": "Farooqnagar",
        "district": "Rangareddy",
        "state": "Telangana",
        "pincode": "509216",
        "aadhaar_number": "123456789012"
    }
    res = client.post("/api/auth/register/farmer", json=farmer_payload)
    assert res.status_code == 200, res.text
    print("Farmer Registered Response:", res.json())

    print("\n--- 2. Testing Buyer Registration (Separate Form & GST upload) ---")
    buyer_payload = {
        "company_name": f"Deccan Agro Processors {rand_id}",
        "company_id": f"CMP-TG-2026-{rand_id}",
        "contact_person": "Deccan Agro Processors",
        "mobile_number": test_buyer_mobile,
        "email": f"procurement_{rand_id}@deccanagro.in",
        "password": "buyerpassword123",
        "confirm_password": "buyerpassword123",
        "city": "Hyderabad",
        "district": "Medchal-Malkajgiri",
        "state": "Telangana",
        "pincode": "500051",
        "gstin": "36BBBBB1111B1Z2",
        "pan": "BCDEF2345G",
        "buyer_category": "Processor"
    }
    res = client.post("/api/auth/register/buyer", json=buyer_payload)
    assert res.status_code == 200, res.text
    print("Buyer Registered Response:", res.json())

    print("\n--- 3. Testing Farmer Manual Login ---")
    res = client.post("/api/auth/login", json={
        "identifier": test_username,
        "password": "farmerpassword123",
        "role": "farmer"
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    print("Farmer logged in successfully. Name:", res.json()["name"])

    print("\n--- 4. Testing Role Protection (Farmer trying to access Buyer role) ---")
    res = client.post("/api/auth/login", json={
        "identifier": test_username,
        "password": "farmerpassword123",
        "role": "buyer"
    })
    assert res.status_code == 403
    print("Role protection verified: Farmer blocked from logging in as Buyer (403 Forbidden).")

    print("\n--- 5. Testing Forgot Password Flow ---")
    res = client.post("/api/auth/forgot-password", json={"identifier": test_username})
    assert res.status_code == 200, res.text
    reset_otp = res.json()["otp_hint"]
    print("Reset OTP requested:", reset_otp)

    res = client.post("/api/auth/reset-password", json={
        "identifier": test_username,
        "otp": reset_otp,
        "new_password": "newfarmerpassword123",
        "confirm_password": "newfarmerpassword123"
    })
    assert res.status_code == 200, res.text
    print("Password reset successfully.")

    # Verify login with new password
    res = client.post("/api/auth/login", json={
        "identifier": test_username,
        "password": "newfarmerpassword123",
        "role": "farmer"
    })
    assert res.status_code == 200, res.text
    print("Logged in with new password successfully.")

    print("\nALL AUTHENTICATION & REGISTRATION TESTS PASSED!")

if __name__ == "__main__":
    test_auth_system()
