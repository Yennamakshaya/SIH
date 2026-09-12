from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, FarmerProfile, BuyerProfile, Produce, BuyerRequirement, Agreement, Procurement, Transaction, Payment, Grievance, MarketPrice
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard-summary")
def get_admin_dashboard(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    total_farmers = db.query(FarmerProfile).count()
    total_buyers = db.query(BuyerProfile).count()
    verified_buyers = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "verified").count()
    pending_buyers = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "pending").count()
    
    active_produce = db.query(Produce).filter(Produce.status == "Available").count()
    active_reqs = db.query(BuyerRequirement).filter(BuyerRequirement.status == "Active").count()
    
    total_tx = db.query(Transaction).count()
    completed_tx = db.query(Transaction).filter(Transaction.final_status == "Completed").count()
    open_grievances = db.query(Grievance).filter(Grievance.status == "Open").count()
    
    return {
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "verified_buyers": verified_buyers,
        "pending_verification": pending_buyers,
        "active_produce": active_produce,
        "active_requirements": active_reqs,
        "total_transactions": total_tx,
        "completed_transactions": completed_tx,
        "open_grievances": open_grievances,
        "monthly_volume_tons": 145.5,
        "total_trade_value_rs": 4515000.0
    }

@router.get("/farmers")
def get_farmers_list(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    farmers = db.query(FarmerProfile).all()
    result = []
    for f in farmers:
        result.append({
            "id": f.id,
            "user_id": f.user_id,
            "full_name": f.full_name,
            "village": f.village,
            "mandal": f.mandal,
            "district": f.district,
            "state": f.state,
            "pincode": f.pincode,
            "aadhaar_masked": f.aadhaar_masked,
            "crops_grown": f.crops_grown,
            "farm_size": f.farm_size,
            "status": f.status,
            "rating": f.rating,
            "completed_transactions": f.completed_transactions,
            "reliability_score": f.reliability_score
        })
    return result

@router.put("/farmers/{farmer_id}/status")
def update_farmer_status(farmer_id: int, status_val: str, current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")
    farmer.status = status_val # 'verified', 'suspended', 'pending'
    db.commit()
    return {"message": f"Farmer status updated to {status_val}"}

@router.get("/buyers")
def get_buyers_list(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    buyers = db.query(BuyerProfile).all()
    result = []
    for b in buyers:
        result.append({
            "id": b.id,
            "user_id": b.user_id,
            "company_name": b.company_name,
            "company_id": b.company_id,
            "contact_person": b.contact_person,
            "city": b.city,
            "district": b.district,
            "gstin_masked": b.gstin_masked,
            "pan_masked": b.pan_masked,
            "buyer_category": b.buyer_category,
            "verification_status": b.verification_status,
            "gst_doc_url": b.gst_doc_url,
            "rating": b.rating,
            "completed_transactions": b.completed_transactions,
            "reliability_score": b.reliability_score
        })
    return result

@router.put("/buyers/{buyer_id}/verify")
def verify_buyer(buyer_id: int, action: str, current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found.")
    
    if action == "approve":
        buyer.verification_status = "verified"
    elif action == "reject":
        buyer.verification_status = "rejected"
    elif action == "suspend":
        buyer.verification_status = "suspended"
    db.commit()
    return {"message": f"Buyer verification status updated to {buyer.verification_status}"}

@router.get("/analytics")
def get_analytics(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return {
        "monthly_transactions": [
            {"month": "Apr", "value": 1200000, "volume": 40},
            {"month": "May", "value": 1800000, "volume": 55},
            {"month": "Jun", "value": 2400000, "volume": 75},
            {"month": "Jul", "value": 3100000, "volume": 95},
            {"month": "Aug", "value": 3800000, "volume": 120},
            {"month": "Sep", "value": 4515000, "volume": 145}
        ],
        "crop_demand": [
            {"crop": "Tomato", "demand_tn": 65, "avg_price": 28.5},
            {"crop": "Paddy", "demand_tn": 120, "avg_price": 23.5},
            {"crop": "Cotton", "demand_tn": 45, "avg_price": 70.0},
            {"crop": "Maize", "demand_tn": 80, "avg_price": 20.5},
            {"crop": "Chilli", "demand_tn": 30, "avg_price": 190.0}
        ],
        "district_distribution": [
            {"district": "Rangareddy", "farmers": 42, "buyers": 18},
            {"district": "Hyderabad", "farmers": 5, "buyers": 45},
            {"district": "Siddipet", "farmers": 38, "buyers": 8},
            {"district": "Warangal", "farmers": 52, "buyers": 12},
            {"district": "Nizamabad", "farmers": 60, "buyers": 15}
        ]
    }
