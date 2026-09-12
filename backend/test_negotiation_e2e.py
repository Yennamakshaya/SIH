import os
import sys
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, FarmerProfile, BuyerProfile, Offer, Negotiation, Agreement
from app.seed import init_admin_account, seed_db, run_schema_migrations
from app.auth import create_access_token
from fastapi.testclient import TestClient
from app.main import app

def run_test():
    print("=" * 60)
    print("STARTING FARMER <-> BUYER NEGOTIATION E2E TEST")
    print("=" * 60)

    # Ensure schema migrations are up to date and clean any previous test data
    _db = SessionLocal()
    run_schema_migrations(_db)
    # Clean any prior offers/negotiations for farmer 1, buyer 1, produce 1
    prior_offers = _db.query(Offer).filter(Offer.farmer_id == 1, Offer.buyer_id == 1).all()
    for po in prior_offers:
        _db.query(Negotiation).filter(Negotiation.offer_id == po.id).delete()
        _db.query(Agreement).filter(Agreement.offer_id == po.id).delete()
        _db.delete(po)
    _db.commit()
    _db.close()

    client = TestClient(app)

    # 1. Login as Farmer (Ramesh Reddy)
    farmer_login = client.post("/api/auth/login", json={
        "identifier": "ramesh_reddy",
        "password": "demo123",
        "role": "farmer"
    })
    assert farmer_login.status_code == 200, f"Farmer login failed: {farmer_login.text}"
    farmer_token = farmer_login.json()["access_token"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}
    print("[OK] Step 1: Farmer Ramesh Reddy logged in successfully.")

    # 2. Login as Buyer (Shree Foods Pvt Ltd)
    buyer_login = client.post("/api/auth/login", json={
        "identifier": "shree_foods",
        "password": "demo123",
        "role": "buyer"
    })
    assert buyer_login.status_code == 200, f"Buyer login failed: {buyer_login.text}"
    buyer_token = buyer_login.json()["access_token"]
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    print("[OK] Step 2: Buyer Shree Foods logged in successfully.")

    # 3. Farmer creates negotiation / sends ₹30/kg offer for Tomato (5000 kg)
    step1_res = client.post("/api/workflow/offers", json={
        "produce_id": 1,
        "buyer_id": 1,
        "crop_name": "Tomato",
        "quantity": 5000,
        "price_per_kg": 30.0,
        "message": "Initial offer: ₹30/kg for 5000 kg"
    }, headers=farmer_headers)
    assert step1_res.status_code == 200, f"Offer creation failed: {step1_res.text}"
    offer_id = step1_res.json()["offer_id"]
    neg_id = step1_res.json()["negotiation_id"]
    print(f"[OK] Step 3: Farmer sent Rs 30/kg offer. Negotiation created with ID: {neg_id} (Internal: {offer_id})")

    # 4. Buyer checks Negotiations list
    buyer_offers = client.get("/api/workflow/offers", headers=buyer_headers)
    assert buyer_offers.status_code == 200, f"Buyer get offers failed: {buyer_offers.text}"
    buyer_list = buyer_offers.json()
    assert len(buyer_list) > 0, "Buyer sees no negotiations!"
    matching_neg = next((o for o in buyer_list if o["id"] == offer_id), None)
    assert matching_neg is not None, f"Negotiation {offer_id} not found in Buyer list!"
    assert matching_neg["price_per_kg"] == 30.0, f"Expected Rs 30, got {matching_neg['price_per_kg']}"
    assert matching_neg["is_my_turn"] == True, "Buyer should see 'Your Response Required'!"
    assert matching_neg["turn_status"] == "Your Response Required"
    print(f"[OK] Step 4: Buyer retrieved SAME negotiation {matching_neg['negotiation_id']}, sees Farmer's Rs 30/kg offer, and turn is correctly 'Your Response Required'.")

    # 5. Buyer sends Counter-Offer of Rs 32/kg
    buyer_counter = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 32.0,
        "quantity": 5000,
        "message": "Buyer counter: Rs 32/kg for 5000 kg"
    }, headers=buyer_headers)
    assert buyer_counter.status_code == 200, f"Buyer counter failed: {buyer_counter.text}"
    assert buyer_counter.json()["offer_id"] == offer_id, "Counter offer created a different negotiation ID!"
    print(f"[OK] Step 5: Buyer submitted counter-offer of Rs 32/kg under SAME negotiation_id {neg_id}.")

    # 6. Farmer opens Negotiations
    farmer_offers = client.get("/api/workflow/offers", headers=farmer_headers)
    assert farmer_offers.status_code == 200
    farmer_neg = next((o for o in farmer_offers.json() if o["id"] == offer_id), None)
    assert farmer_neg is not None
    assert farmer_neg["price_per_kg"] == 32.0, f"Farmer should see Rs 32/kg, got {farmer_neg['price_per_kg']}"
    assert farmer_neg["is_my_turn"] == True, "Farmer should see 'Your Response Required'!"
    assert len(farmer_neg["negotiations"]) == 2, f"Expected 2 negotiation entries, got {len(farmer_neg['negotiations'])}"
    print(f"[OK] Step 6: Farmer sees Buyer's Rs 32/kg counter-offer on SAME negotiation {neg_id} (2 history entries).")

    # 7. Farmer sends Counter-Offer of Rs 34/kg
    farmer_counter = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 34.0,
        "quantity": 5000,
        "message": "Farmer counter: Rs 34/kg for 5000 kg"
    }, headers=farmer_headers)
    assert farmer_counter.status_code == 200
    print(f"[OK] Step 7: Farmer submitted counter-offer of Rs 34/kg under SAME negotiation_id {neg_id}.")

    # 8. Buyer opens Negotiations and sends Counter-Offer of Rs 33/kg
    buyer_offers2 = client.get("/api/workflow/offers", headers=buyer_headers)
    buyer_neg2 = next((o for o in buyer_offers2.json() if o["id"] == offer_id), None)
    assert buyer_neg2["price_per_kg"] == 34.0
    assert buyer_neg2["is_my_turn"] == True
    
    buyer_counter2 = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 33.0,
        "quantity": 5000,
        "message": "Buyer final counter: Rs 33/kg for 5000 kg"
    }, headers=buyer_headers)
    assert buyer_counter2.status_code == 200
    print(f"[OK] Step 8: Buyer received Rs 34/kg and replied with counter-offer of Rs 33/kg under SAME negotiation_id {neg_id}.")

    # 9. Farmer accepts Rs 33/kg
    accept_res = client.post(f"/api/workflow/offers/{offer_id}/accept", headers=farmer_headers)
    assert accept_res.status_code == 200, f"Accept failed: {accept_res.text}"
    agr_id = accept_res.json()["agreement_id"]
    agr_code = accept_res.json()["agreement_code"]
    print(f"[OK] Step 9: Farmer accepted offer of Rs 33/kg! Digital Agreement {agr_code} generated.")

    # 10. Database Verification
    db: Session = SessionLocal()
    try:
        # Exactly ONE negotiation / offer record with this ID
        db_offers = db.query(Offer).filter(Offer.id == offer_id).all()
        assert len(db_offers) == 1, f"Expected exactly 1 negotiation record, found {len(db_offers)}"
        db_offer = db_offers[0]
        assert db_offer.status == "ACCEPTED"
        assert db_offer.agreed_price == 33.0
        assert db_offer.price_per_kg == 33.0

        # Check all negotiation history items
        negs = db.query(Negotiation).filter(Negotiation.offer_id == offer_id).order_by(Negotiation.id.asc()).all()
        print(f"\n--- DATABASE VERIFICATION (Negotiation {neg_id}) ---")
        print(f"Total History Entries: {len(negs)}")
        for idx, n in enumerate(negs, 1):
            print(f"  Entry {idx}: {n.sender_name} ({n.sender_role}) -> Rs {n.price_per_kg}/kg ({n.quantity} kg) [Status: {n.status}]")
        
        assert len(negs) >= 4, f"Expected at least 4 history entries, got {len(negs)}"
        # Verify agreement
        db_agr = db.query(Agreement).filter(Agreement.offer_id == offer_id).first()
        assert db_agr is not None
        assert db_agr.final_price == 33.0
        print(f"Digital Agreement: {db_agr.agreement_code}, Final Price: Rs {db_agr.final_price}/kg, Net Realisation: Rs {db_agr.net_realisation}")
        print("\nALL VERIFICATIONS PASSED 100% SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
