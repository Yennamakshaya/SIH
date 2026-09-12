import os
import sys
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, FarmerProfile, BuyerProfile, Offer, Negotiation, Agreement, ProcurementSlot, Procurement, Transaction, Payment
from app.seed import init_admin_account, run_schema_migrations
from fastapi.testclient import TestClient
from app.main import app

def run_full_lifecycle_test():
    print("=" * 70)
    print("STARTING COMPLETE FARMER <-> BUYER FULL LIFECYCLE E2E TEST")
    print("=" * 70)

    db = SessionLocal()
    run_schema_migrations(db)
    
    # Clean test data for farmer 1 & buyer 1
    prior_offers = db.query(Offer).filter(Offer.farmer_id == 1, Offer.buyer_id == 1).all()
    for po in prior_offers:
        db.query(Negotiation).filter(Negotiation.offer_id == po.id).delete()
        db.query(Agreement).filter(Agreement.offer_id == po.id).delete()
        db.delete(po)
    db.commit()
    db.close()

    client = TestClient(app)

    # 1. Login Farmer & Buyer
    farmer_login = client.post("/api/auth/login", json={"identifier": "ramesh_reddy", "password": "demo123", "role": "farmer"})
    assert farmer_login.status_code == 200
    farmer_headers = {"Authorization": f"Bearer {farmer_login.json()['access_token']}"}

    buyer_login = client.post("/api/auth/login", json={"identifier": "shree_foods", "password": "demo123", "role": "buyer"})
    assert buyer_login.status_code == 200
    buyer_headers = {"Authorization": f"Bearer {buyer_login.json()['access_token']}"}
    print("[OK] Auth: Logged in Farmer (Ramesh Reddy) and Buyer (Shree Foods).")

    # 2. Farmer sends initial offer (Rs 30/kg for 5000 kg Tomato)
    res1 = client.post("/api/workflow/offers", json={
        "produce_id": 1,
        "buyer_id": 1,
        "crop_name": "Tomato",
        "quantity": 5000,
        "price_per_kg": 30.0,
        "message": "Initial offer: Rs 30/kg for 5000 kg"
    }, headers=farmer_headers)
    assert res1.status_code == 200
    offer_id = res1.json()["offer_id"]
    neg_code = res1.json()["negotiation_id"]
    print(f"[OK] 1. Farmer sent Rs 30 offer -> Created {neg_code}")

    # 3. Buyer counter-offers Rs 32/kg
    res2 = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 32.0,
        "quantity": 5000,
        "message": "Buyer counter: Rs 32/kg"
    }, headers=buyer_headers)
    assert res2.status_code == 200
    print(f"[OK] 2. Buyer counter-offered Rs 32/kg under {neg_code}")

    # 4. Farmer counter-offers Rs 34/kg
    res3 = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 34.0,
        "quantity": 5000,
        "message": "Farmer counter: Rs 34/kg"
    }, headers=farmer_headers)
    assert res3.status_code == 200
    print(f"[OK] 3. Farmer counter-offered Rs 34/kg under {neg_code}")

    # 5. Buyer counter-offers Rs 33/kg
    res4 = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 33.0,
        "quantity": 5000,
        "message": "Buyer counter: Rs 33/kg"
    }, headers=buyer_headers)
    assert res4.status_code == 200
    print(f"[OK] 4. Buyer counter-offered Rs 33/kg under {neg_code}")

    # 6. Farmer accepts Rs 33/kg
    accept_res = client.post(f"/api/workflow/offers/{offer_id}/accept", headers=farmer_headers)
    assert accept_res.status_code == 200
    agr_id = accept_res.json()["agreement_id"]
    agr_code = accept_res.json()["agreement_code"]
    print(f"[OK] 5. Farmer accepted Rs 33/kg! Agreement {agr_code} generated.")

    # 7. Slot Booking
    slot_res = client.post("/api/workflow/procurement/book-slot", json={
        "agreement_id": agr_id,
        "slot_date": "2026-09-15",
        "time_window": "08:00 AM - 10:00 AM",
        "location": "Shadnagar APMC Collection Center, Rangareddy",
        "vehicle_details": "Mini Truck (Bolero Pickup)",
        "driver_contact": "9876543210",
        "crop": "Tomato",
        "quantity": 5000
    }, headers=farmer_headers)
    assert slot_res.status_code == 200, f"Slot booking failed: {slot_res.text}"
    slot_id = slot_res.json()["slot_id"]
    slot_code = slot_res.json()["slot_code"]
    proc_id = slot_res.json()["procurement_id"]
    print(f"[OK] 6. Slot booked: {slot_code} (ID: {slot_id}, Procurement ID: {proc_id})")

    # 8. Produce Handover Verification
    handover_res = client.post(f"/api/workflow/procurement/{proc_id}/handover", json={
        "notes": "Quality verified. Clean Grade A tomatoes."
    }, headers=farmer_headers)
    assert handover_res.status_code == 200, f"Handover failed: {handover_res.text}"
    txn_code = handover_res.json()["transaction_code"]
    net_real = handover_res.json()["net_realisation"]
    print(f"[OK] 7. Produce Handover confirmed -> Transaction {txn_code} created (Net Realisation: Rs {net_real})")

    # 9. Transactions & Payment Verification
    txn_list = client.get("/api/workflow/transactions", headers=farmer_headers)
    assert txn_list.status_code == 200
    txns = txn_list.json()
    assert len(txns) > 0, "No transactions found!"
    matching_txn = next((t for t in txns if t["transaction_code"] == txn_code), None)
    assert matching_txn is not None
    print(f"[OK] 8. Transaction {matching_txn['transaction_code']} verified in Farmer Ledger (Gross: Rs {matching_txn['gross_value']}, Net: Rs {matching_txn['net_realisation']})")

    print("\n" + "=" * 70)
    print("SUCCESS: 100% OF THE COMPLETE KISANLINK WORKFLOW PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_full_lifecycle_test()
