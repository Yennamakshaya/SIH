from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, FarmerProfile, BuyerProfile, Produce, Offer, Agreement, Transaction, BuyerRequirement
from app.schemas import AddProduceSchema
from app.auth import get_current_user, require_role
from app.recommendation import score_buyer_for_farmer, calculate_net_realisation

router = APIRouter(prefix="/api/farmer", tags=["Farmer"])

@router.get("/dashboard-summary")
def get_farmer_dashboard(current_user: User = Depends(require_role("farmer")), db: Session = Depends(get_db)):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")

    my_produces = db.query(Produce).filter(Produce.farmer_id == farmer.id).all()
    active_produce_count = len([p for p in my_produces if p.status == "Available"])
    
    pending_offers_count = db.query(Offer).filter(
        Offer.farmer_id == farmer.id,
        Offer.status.in_(["Pending", "Negotiating"])
    ).count()

    active_agreements_count = db.query(Agreement).filter(
        Agreement.farmer_id == farmer.id,
        Agreement.status == "Signed"
    ).count()

    transactions = db.query(Transaction).filter(Transaction.farmer_id == farmer.id).all()
    completed_tx_count = len([t for t in transactions if t.final_status == "Completed"])
    pending_payments_count = len([t for t in transactions if t.payment_status != "Completed"])

    return {
        "farmer_name": farmer.full_name,
        "village": farmer.village,
        "district": farmer.district,
        "total_produce": len(my_produces),
        "active_produce": active_produce_count,
        "pending_offers": pending_offers_count,
        "active_agreements": active_agreements_count,
        "completed_transactions": completed_tx_count,
        "pending_payments": pending_payments_count,
        "rating": farmer.rating,
        "reliability_score": farmer.reliability_score
    }

@router.get("/produce")
def get_my_produce(
    crop: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    query = db.query(Produce).filter(Produce.farmer_id == farmer.id)
    if crop:
        query = query.filter(Produce.crop_name.ilike(f"%{crop}%"))
    if status_filter:
        query = query.filter(Produce.status == status_filter)
    
    produces = query.order_by(Produce.id.desc()).all()
    result = []
    for p in produces:
        result.append({
            "id": p.id,
            "crop_name": p.crop_name,
            "variety": p.variety,
            "quantity": p.quantity,
            "unit": p.unit,
            "quality": p.quality,
            "expected_price": p.expected_price,
            "harvest_date": p.harvest_date,
            "available_from": p.available_from,
            "location": f"{p.village}, {p.mandal}, {p.district}",
            "village": p.village,
            "mandal": p.mandal,
            "district": p.district,
            "state": p.state,
            "pincode": p.pincode,
            "description": p.description,
            "images": p.images,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return result

@router.post("/produce")
def add_produce(payload: AddProduceSchema, current_user: User = Depends(require_role("farmer")), db: Session = Depends(get_db)):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")

    produce = Produce(
        farmer_id=farmer.id,
        crop_name=payload.crop_name,
        variety=payload.variety,
        quantity=payload.quantity,
        unit=payload.unit,
        quality=payload.quality,
        expected_price=payload.expected_price,
        harvest_date=payload.harvest_date,
        available_from=payload.available_from,
        state=payload.state,
        district=payload.district,
        mandal=payload.mandal,
        village=payload.village,
        pincode=payload.pincode,
        description=payload.description,
        images=payload.images or "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop",
        status="Available"
    )
    db.add(produce)
    db.commit()
    db.refresh(produce)
    return {"message": "Produce added successfully!", "produce_id": produce.id}

@router.put("/produce/{produce_id}/deactivate")
def deactivate_produce(produce_id: int, current_user: User = Depends(require_role("farmer")), db: Session = Depends(get_db)):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    produce = db.query(Produce).filter(Produce.id == produce_id, Produce.farmer_id == farmer.id).first()
    if not produce:
        raise HTTPException(status_code=404, detail="Produce not found.")
    produce.status = "Deactivated"
    db.commit()
    return {"message": "Produce deactivated successfully."}

@router.get("/buyers")
def get_buyers_list(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    produce_id: Optional[int] = None,
    sort_by: Optional[str] = "recommended",
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    buyers = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "verified").all()
    
    selected_produce = None
    if produce_id:
        selected_produce = db.query(Produce).filter(Produce.id == produce_id).first()
    if not selected_produce:
        selected_produce = db.query(Produce).filter(Produce.farmer_id == farmer.id, Produce.status == "Available").first()

    produce_dict = {
        "quantity": selected_produce.quantity if selected_produce else 500.0,
        "crop_name": selected_produce.crop_name if selected_produce else "Tomato"
    }

    result = []
    for b in buyers:
        # Check requirement matching
        req = db.query(BuyerRequirement).filter(
            BuyerRequirement.buyer_id == b.id,
            BuyerRequirement.crop_name.ilike(f"%{produce_dict['crop_name']}%")
        ).first()

        offered_price = req.max_price if req else 31.0
        req_qty = req.required_quantity if req else 5000.0
        
        # Determine distance estimate (e.g. Rangareddy to Hyderabad ~45km, etc.)
        dist_km = 45.0
        if b.district.lower() == farmer.district.lower():
            dist_km = 15.0

        ai_eval = score_buyer_for_farmer({
            "offered_price": offered_price,
            "reliability_score": b.reliability_score,
            "completed_transactions": b.completed_transactions,
            "demand_score": 90.0
        }, produce_dict, distance_km=dist_km)

        if crop and req and crop.lower() not in req.crop_name.lower():
            continue
        if district and district.lower() not in b.district.lower() and district.lower() not in b.city.lower():
            continue
        if min_price and offered_price < min_price:
            continue

        result.append({
            "buyer_id": b.id,
            "buyer_name": b.contact_person,
            "company_name": b.company_name,
            "company_id": b.company_id,
            "location": f"{b.city}, {b.district}, Telangana",
            "district": b.district,
            "buyer_category": b.buyer_category,
            "verification_status": b.verification_status,
            "rating": b.rating,
            "completed_transactions": b.completed_transactions,
            "reliability_score": b.reliability_score,
            "response_time": b.response_time,
            "crops_required": req.crop_name if req else "Tomato, Vegetables",
            "required_quantity": req_qty,
            "offered_price": offered_price,
            "estimated_net_realisation": ai_eval["estimated_net_realisation"],
            "net_price_per_kg": ai_eval["net_price_per_kg"],
            "transport_cost": ai_eval["transport_cost"],
            "ai_score": ai_eval["score"],
            "ai_explanation": ai_eval["explanation"],
            "badge": ai_eval["badge"]
        })

    if sort_by == "recommended" or sort_by == "best_net":
        result.sort(key=lambda x: x["ai_score"], reverse=True)
    elif sort_by == "highest_price":
        result.sort(key=lambda x: x["offered_price"], reverse=True)
    elif sort_by == "highest_rating":
        result.sort(key=lambda x: x["rating"], reverse=True)
    elif sort_by == "reliability":
        result.sort(key=lambda x: x["reliability_score"], reverse=True)

    return result
