from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, BuyerProfile, FarmerProfile, Produce, BuyerRequirement, Offer, Agreement, Transaction
from app.schemas import AddRequirementSchema
from app.auth import get_current_user, require_role
from app.recommendation import score_farmer_for_buyer

router = APIRouter(prefix="/api/buyer", tags=["Buyer"])

@router.get("/dashboard-summary")
def get_buyer_dashboard(current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")

    reqs = db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).all()
    active_reqs_count = len([r for r in reqs if r.status == "Active"])

    offers_count = db.query(Offer).filter(
        Offer.buyer_id == buyer.id,
        Offer.status.in_(["Pending", "Negotiating"])
    ).count()

    active_agreements_count = db.query(Agreement).filter(
        Agreement.buyer_id == buyer.id,
        Agreement.status == "Signed"
    ).count()

    transactions = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).all()

    return {
        "company_name": buyer.company_name,
        "contact_person": buyer.contact_person,
        "verification_status": buyer.verification_status,
        "active_requirements": active_reqs_count,
        "pending_offers": offers_count,
        "active_agreements": active_agreements_count,
        "completed_transactions": len([t for t in transactions if t.final_status == "Completed"]),
        "rating": buyer.rating,
        "reliability_score": buyer.reliability_score
    }

@router.get("/requirements")
def get_my_requirements(current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    reqs = db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).order_by(BuyerRequirement.id.desc()).all()
    result = []
    for r in reqs:
        result.append({
            "id": r.id,
            "crop_name": r.crop_name,
            "variety": r.variety,
            "required_quantity": r.required_quantity,
            "quality": r.quality,
            "max_price": r.max_price,
            "preferred_district": r.preferred_district,
            "preferred_mandal": r.preferred_mandal,
            "required_by_date": r.required_by_date,
            "pickup_delivery": r.pickup_delivery,
            "additional_reqs": r.additional_reqs,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return result

@router.post("/requirements")
def add_requirement(payload: AddRequirementSchema, current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")

    req = BuyerRequirement(
        buyer_id=buyer.id,
        crop_name=payload.crop_name,
        variety=payload.variety,
        required_quantity=payload.required_quantity,
        quality=payload.quality,
        max_price=payload.max_price,
        preferred_district=payload.preferred_district,
        preferred_mandal=payload.preferred_mandal,
        required_by_date=payload.required_by_date,
        pickup_delivery=payload.pickup_delivery,
        additional_reqs=payload.additional_reqs,
        status="Active"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Requirement posted successfully!", "requirement_id": req.id}

@router.get("/farmers")
def search_farmers(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    quality: Optional[str] = None,
    max_price: Optional[float] = None,
    current_user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db)
):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    query = db.query(Produce).filter(Produce.status == "Available")

    if crop:
        query = query.filter(Produce.crop_name.ilike(f"%{crop}%"))
    if district:
        query = query.filter(Produce.district.ilike(f"%{district}%"))
    if quality:
        query = query.filter(Produce.quality == quality)
    if max_price:
        query = query.filter(Produce.expected_price <= max_price)

    produces = query.order_by(Produce.id.desc()).all()
    result = []

    for p in produces:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.id == p.farmer_id).first()
        if not farmer:
            continue
        
        dist_km = 45.0
        if buyer and buyer.district.lower() == farmer.district.lower():
            dist_km = 15.0

        ai_eval = score_farmer_for_buyer({
            "quantity": p.quantity,
            "price": p.expected_price,
            "quality": p.quality,
            "reliability_score": farmer.reliability_score
        }, {}, distance_km=dist_km)

        result.append({
            "produce_id": p.id,
            "farmer_id": farmer.id,
            "farmer_name": farmer.full_name,
            "location": f"{p.village}, {p.mandal}, {p.district}, Telangana",
            "village": p.village,
            "mandal": p.mandal,
            "district": p.district,
            "farm_size": farmer.farm_size,
            "rating": farmer.rating,
            "completed_transactions": farmer.completed_transactions,
            "reliability_score": farmer.reliability_score,
            "crop_name": p.crop_name,
            "variety": p.variety,
            "quantity": p.quantity,
            "unit": p.unit,
            "quality": p.quality,
            "expected_price": p.expected_price,
            "harvest_date": p.harvest_date,
            "available_from": p.available_from,
            "description": p.description,
            "images": p.images,
            "match_score": ai_eval["match_score"],
            "explanation": ai_eval["explanation"]
        })

    result.sort(key=lambda x: x["match_score"], reverse=True)
    return result
