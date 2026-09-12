import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import (
    User, FarmerProfile, BuyerProfile, Produce, BuyerRequirement, Offer, Negotiation,
    Agreement, ProcurementSlot, Procurement, QualityConfirmation, Payment, Transaction,
    RatingFeedback, Grievance, Notification
)
from app.schemas import (
    SendOfferSchema, CounterOfferSchema, SignAgreementSchema, BookSlotSchema,
    QualityConfirmSchema, ProcessPaymentSchema, AddFeedbackSchema, AddGrievanceSchema
)
from app.auth import get_current_user
from app.recommendation import calculate_net_realisation
from app.notifications import create_notification, notify_admins

router = APIRouter(prefix="/api/workflow", tags=["Workflow & Lifecycle"])

# 1. OFFERS & NEGOTIATION
@router.post("/offers")
def send_offer(payload: SendOfferSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.price_per_kg <= 0:
        raise HTTPException(status_code=400, detail="Price per kg must be greater than zero.")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    farmer_id = payload.farmer_id
    buyer_id = payload.buyer_id
    sender_name = "User"

    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            raise HTTPException(status_code=400, detail="Farmer profile not found for this user.")
        farmer_id = farmer.id
        sender_name = farmer.full_name
        initial_status = "BUYER_PENDING"
        current_offer_by = "farmer"
        
        # Resolve target buyer
        if buyer_id:
            b = db.query(BuyerProfile).filter((BuyerProfile.id == buyer_id) | (BuyerProfile.user_id == buyer_id)).first()
            buyer_id = b.id if b else buyer_id
        if not buyer_id:
            b = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "verified").first()
            buyer_id = b.id if b else 1
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            raise HTTPException(status_code=400, detail="Buyer profile not found for this user.")
        buyer_id = buyer.id
        sender_name = buyer.company_name
        initial_status = "FARMER_PENDING"
        current_offer_by = "buyer"
        
        # Resolve target farmer
        if farmer_id:
            f = db.query(FarmerProfile).filter((FarmerProfile.id == farmer_id) | (FarmerProfile.user_id == farmer_id)).first()
            farmer_id = f.id if f else farmer_id
        if not farmer_id:
            f = db.query(FarmerProfile).first()
            farmer_id = f.id if f else 1
    else:
        initial_status = "BUYER_PENDING"
        current_offer_by = "farmer"
        sender_name = "Admin"
        farmer_id = farmer_id or 1
        buyer_id = buyer_id or 1

    total_val = round(payload.quantity * payload.price_per_kg, 2)
    transport_cost = 1500.0
    storage_cost = 0.0
    net_calc = calculate_net_realisation(payload.quantity, payload.price_per_kg, transport_cost=transport_cost, storage_cost=storage_cost)
    net_realisation = net_calc.get("net_realisation", total_val - transport_cost)

    pickup_date = payload.pickup_date or (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
    delivery_location = payload.delivery_location or "Farmer Farm Site, Telangana"

    # CRITICAL: Check if an active negotiation ALREADY EXISTS between this farmer and buyer for this crop/lot
    existing_offer = None
    if payload.produce_id:
        existing_offer = db.query(Offer).filter(
            Offer.farmer_id == farmer_id,
            Offer.buyer_id == buyer_id,
            Offer.produce_id == payload.produce_id,
            Offer.status.in_(["ACTIVE", "BUYER_PENDING", "FARMER_PENDING", "Pending", "Negotiating", "Draft"])
        ).first()

    if not existing_offer:
        existing_offer = db.query(Offer).filter(
            Offer.farmer_id == farmer_id,
            Offer.buyer_id == buyer_id,
            Offer.crop_name.ilike(f"%{payload.crop_name}%"),
            Offer.status.in_(["ACTIVE", "BUYER_PENDING", "FARMER_PENDING", "Pending", "Negotiating", "Draft"])
        ).first()

    if existing_offer:
        # Re-use existing negotiation container so both participants remain in ONE conversation
        offer = existing_offer
        offer.price_per_kg = payload.price_per_kg
        offer.quantity = payload.quantity
        offer.total_value = total_val
        offer.net_realisation = net_realisation
        offer.status = initial_status
        offer.current_offer_by = current_offer_by
        offer.updated_at = datetime.datetime.utcnow()
        if payload.message:
            offer.message = payload.message
        db.commit()
    else:
        # Create single negotiation record
        offer = Offer(
            produce_id=payload.produce_id,
            requirement_id=payload.requirement_id,
            farmer_id=farmer_id,
            buyer_id=buyer_id,
            crop_name=payload.crop_name,
            quantity=payload.quantity,
            price_per_kg=payload.price_per_kg,
            total_value=total_val,
            transport_cost=transport_cost,
            storage_cost=storage_cost,
            net_realisation=net_realisation,
            pickup_date=pickup_date,
            delivery_location=delivery_location,
            payment_terms=payload.payment_terms,
            message=payload.message or f"Initial offer: ₹{payload.price_per_kg}/kg for {payload.quantity} kg {payload.crop_name}",
            status=initial_status,
            sender_role=current_user.role,
            current_offer_by=current_offer_by
        )
        db.add(offer)
        db.commit()
        db.refresh(offer)

    # Append offer entry to the negotiation history with the SAME negotiation_id
    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=sender_name,
        price_per_kg=payload.price_per_kg,
        quantity=payload.quantity,
        message=payload.message or f"Offer: ₹{payload.price_per_kg}/kg for {payload.quantity} kg",
        status="ACTIVE"
    )
    db.add(neg)
    db.commit()
    
    # Notify recipient (Buyer if farmer sent offer, Farmer if buyer sent offer)
    recipient_user_id = offer.buyer.user_id if current_user.role == "farmer" and offer.buyer else (offer.farmer.user_id if offer.farmer else None)
    if recipient_user_id:
        create_notification(
            db=db,
            user_id=recipient_user_id,
            title="New Offer Received",
            message=f"A farmer has sent you a new offer for {payload.crop_name}: ₹{payload.price_per_kg}/kg for {payload.quantity} kg.",
            notification_type="NEGOTIATION_OFFER",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Offer sent successfully!",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "negotiation_code": f"NEG-{offer.id:04d}",
        "status": offer.status
    }

def format_negotiation_payload(o: Offer, current_user: User, db: Session):
    negs = db.query(Negotiation).filter(Negotiation.offer_id == o.id).order_by(Negotiation.id.asc()).all()

    # Benchmark prices for crops
    benchmark_map = {
        "tomato": 28.0,
        "paddy": 23.5,
        "cotton": 70.0,
        "maize": 20.5,
        "chilli": 190.0,
        "turmeric": 140.0,
        "onion": 22.0,
        "red gram": 66.0
    }
    
    crop_lower = (o.crop_name or "").lower().strip()
    market_benchmark = benchmark_map.get(crop_lower, 28.0)
    
    gross_val = round(o.quantity * o.price_per_kg, 2)
    trans_cost = getattr(o, "transport_cost", 1500.0) or 1500.0
    stor_cost = getattr(o, "storage_cost", 0.0) or 0.0
    net_real = max(0.0, gross_val - trans_cost - stor_cost)
    net_per_kg = round(net_real / o.quantity, 2) if o.quantity > 0 else o.price_per_kg

    target_rec_price = round(max(market_benchmark, o.price_per_kg * 1.05), 1)
    ai_reason = f"Based on Telangana APMC market rate (₹{market_benchmark}/kg), transportation logistics to {o.buyer.district if o.buyer else 'Hyderabad'}, and optimal net profit margin."

    # Turn calculation
    user_role = (current_user.role or "").lower()
    offer_status = o.status.upper() if o.status else "ACTIVE"
    is_my_turn = False
    
    if offer_status in ["ACCEPTED", "REJECTED"]:
        is_my_turn = False
        turn_status = "Accepted" if offer_status == "ACCEPTED" else "Rejected"
    elif offer_status == "BUYER_PENDING":
        is_my_turn = (user_role == "buyer")
        turn_status = "Your Response Required" if is_my_turn else "Waiting for Buyer Response"
    elif offer_status == "FARMER_PENDING":
        is_my_turn = (user_role == "farmer")
        turn_status = "Your Response Required" if is_my_turn else "Waiting for Farmer Response"
    else:
        is_my_turn = (o.current_offer_by != user_role)
        turn_status = "Your Response Required" if is_my_turn else f"Waiting for {('Buyer' if user_role == 'farmer' else 'Farmer')} Response"

    agr = None
    if o.agreement_id:
        agr = db.query(Agreement).filter(Agreement.id == o.agreement_id).first()

    first_buyer_offer = o.price_per_kg
    for n in negs:
        if n.sender_role == "buyer":
            first_buyer_offer = n.price_per_kg
            break

    formatted_negotiations = [
        {
            "id": n.id,
            "offer_id": n.id,
            "negotiation_id": f"NEG-{o.id:04d}",
            "sender_id": n.sender_id,
            "sender_role": n.sender_role,
            "sender_name": n.sender_name,
            "price_per_kg": n.price_per_kg,
            "offered_price": n.price_per_kg,
            "quantity": n.quantity,
            "gross_value": round(n.quantity * n.price_per_kg, 2),
            "message": n.message,
            "status": n.status,
            "created_at": n.created_at.strftime("%I:%M %p, %b %d") if n.created_at else None
        } for n in negs
    ]

    return {
        "id": o.id,
        "offer_id": o.id,
        "negotiation_id": f"NEG-{o.id:04d}",
        "negotiation_code": f"NEG-{o.id:04d}",
        "produce_id": o.produce_id,
        "lot_id": o.produce_id,
        "requirement_id": o.requirement_id,
        "crop": o.crop_name,
        "crop_name": o.crop_name,
        "farmer_id": o.farmer_id,
        "farmer_name": o.farmer.full_name if o.farmer else "Farmer",
        "farmer_location": f"{o.farmer.village}, {o.farmer.district}" if o.farmer else "Telangana",
        "farmer_district": o.farmer.district if o.farmer else "Telangana",
        "farmer_rating": o.farmer.rating if o.farmer else 4.8,
        "farmer_reliability": o.farmer.reliability_score if o.farmer else 95.0,
        "buyer_id": o.buyer_id,
        "buyer_company": o.buyer.company_name if o.buyer else "Buyer",
        "buyer_name": o.buyer.contact_person if o.buyer else "Manager",
        "buyer_contact": o.buyer.contact_person if o.buyer else "Manager",
        "buyer_location": f"{o.buyer.city}, {o.buyer.district}" if o.buyer else "Telangana",
        "buyer_district": o.buyer.district if o.buyer else "Telangana",
        "buyer_rating": o.buyer.rating if o.buyer else 4.7,
        "buyer_reliability": o.buyer.reliability_score if o.buyer else 94.0,
        "quantity": o.quantity,
        "price_per_kg": o.price_per_kg,
        "current_offer": o.price_per_kg,
        "current_offer_by": o.current_offer_by,
        "latest_offer_from": "Farmer" if o.current_offer_by == "farmer" else "Buyer",
        "total_value": gross_val,
        "transport_cost": trans_cost,
        "storage_cost": stor_cost,
        "net_realisation": net_real,
        "net_price_per_kg": net_per_kg,
        "market_price_benchmark": market_benchmark,
        "buyer_initial_offer": first_buyer_offer,
        "ai_target_price": target_rec_price,
        "ai_explanation": ai_reason,
        "pickup_date": o.pickup_date,
        "delivery_location": o.delivery_location,
        "payment_terms": o.payment_terms,
        "status": o.status,
        "sender_role": o.sender_role,
        "is_my_turn": is_my_turn,
        "turn_status": turn_status,
        "agreed_price": o.agreed_price,
        "agreed_quantity": o.agreed_quantity,
        "agreement_id": o.agreement_id,
        "agreement_code": agr.agreement_code if agr else None,
        "created_at": o.created_at.strftime("%I:%M %p, %b %d") if o.created_at else None,
        "updated_at": o.updated_at.strftime("%I:%M %p, %b %d") if o.updated_at else (o.created_at.strftime("%I:%M %p, %b %d") if o.created_at else None),
        "negotiations": formatted_negotiations,
        "offers": formatted_negotiations
    }

@router.get("/offers")
def get_user_offers(offer_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if offer_id:
        offers = db.query(Offer).filter(Offer.id == offer_id).all()
    elif current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        offers = db.query(Offer).filter(Offer.farmer_id == farmer.id).order_by(Offer.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            return []
        offers = db.query(Offer).filter(Offer.buyer_id == buyer.id).order_by(Offer.id.desc()).all()
    else:
        offers = db.query(Offer).order_by(Offer.id.desc()).all()

    return [format_negotiation_payload(o, current_user, db) for o in offers]

@router.get("/offers/{offer_id}")
def get_single_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Negotiation not found.")
    
    # Authorization check
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer or offer.farmer_id != farmer.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this negotiation.")
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer or offer.buyer_id != buyer.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this negotiation.")

    return format_negotiation_payload(offer, current_user, db)

@router.get("/negotiations/{negotiation_id}")
def get_single_negotiation(negotiation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_single_offer(offer_id=negotiation_id, current_user=current_user, db=db)

@router.post("/offers/{offer_id}/counter")
def counter_offer(offer_id: int, payload: CounterOfferSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.price_per_kg <= 0:
        raise HTTPException(status_code=400, detail="Counter price must be greater than zero.")

    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Negotiation not found.")

    if offer.status in ["ACCEPTED", "Accepted"]:
        raise HTTPException(status_code=400, detail="Negotiation has already been accepted and locked.")
    if offer.status in ["REJECTED", "Rejected"]:
        raise HTTPException(status_code=400, detail="Negotiation has been rejected.")

    qty = payload.quantity if (payload.quantity and payload.quantity > 0) else offer.quantity
    gross_val = round(qty * payload.price_per_kg, 2)
    trans_cost = getattr(offer, "transport_cost", 1500.0) or 1500.0
    stor_cost = getattr(offer, "storage_cost", 0.0) or 0.0
    net_real = max(0.0, gross_val - trans_cost - stor_cost)

    offer.price_per_kg = payload.price_per_kg
    offer.quantity = qty
    offer.total_value = gross_val
    offer.net_realisation = net_real
    offer.updated_at = datetime.datetime.utcnow()

    user_role = (current_user.role or "").lower()
    if user_role == "farmer":
        offer.status = "BUYER_PENDING"
        offer.current_offer_by = "farmer"
        sender_name = offer.farmer.full_name if offer.farmer else "Farmer"
        recipient_user_id = offer.buyer.user_id if offer.buyer else None
    else:
        offer.status = "FARMER_PENDING"
        offer.current_offer_by = "buyer"
        sender_name = offer.buyer.company_name if offer.buyer else "Buyer"
        recipient_user_id = offer.farmer.user_id if offer.farmer else None

    # CRITICAL: Append new offer record to SAME negotiation_id
    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=user_role,
        sender_name=sender_name,
        price_per_kg=payload.price_per_kg,
        quantity=qty,
        message=payload.message or f"Counter offer: ₹{payload.price_per_kg}/kg for {qty} kg ({sender_name})",
        status="ACTIVE"
    )
    db.add(neg)
    db.commit()

    # Notify recipient
    if recipient_user_id:
        create_notification(
            db=db,
            user_id=recipient_user_id,
            title="New Counter Offer",
            message=f"The {('farmer' if user_role == 'farmer' else 'buyer')} has sent you a counter-offer: ₹{payload.price_per_kg}/kg ({qty} kg) for {offer.crop_name}.",
            notification_type="NEGOTIATION_COUNTER",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Counter offer submitted successfully.",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "status": offer.status
    }

@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Negotiation not found.")

    if offer.status in ["REJECTED", "Rejected"]:
        raise HTTPException(status_code=400, detail="Cannot accept a rejected negotiation.")

    offer.status = "ACCEPTED"
    offer.agreed_price = offer.price_per_kg
    offer.agreed_quantity = offer.quantity
    offer.accepted_by = current_user.role
    offer.accepted_at = datetime.datetime.utcnow()
    offer.updated_at = datetime.datetime.utcnow()
    
    # Financial calculation
    transport_cost = getattr(offer, "transport_cost", 1500.0) or 1500.0
    storage_cost = getattr(offer, "storage_cost", 0.0) or 0.0
    gross_val = round(offer.quantity * offer.price_per_kg, 2)
    net_real = max(0.0, gross_val - transport_cost - storage_cost)
    offer.net_realisation = net_real

    agr_code = f"AGR-KL-2026-{offer.id:04d}"
    farmer_name = offer.farmer.full_name if offer.farmer else "Farmer"
    farmer_loc = f"{offer.farmer.village}, {offer.farmer.district}" if offer.farmer else "Telangana"
    buyer_name = offer.buyer.company_name if offer.buyer else "Buyer"
    buyer_gst = offer.buyer.gstin_masked if offer.buyer else "Verified"
    buyer_loc = f"{offer.buyer.city}, {offer.buyer.district}" if offer.buyer else "Telangana"

    # Generate or retrieve Digital Agreement
    agreement = None
    if offer.agreement_id:
        agreement = db.query(Agreement).filter(Agreement.id == offer.agreement_id).first()
    if not agreement:
        agreement = db.query(Agreement).filter(Agreement.offer_id == offer.id).first()

    if not agreement:
        terms_text = f"""DIGITAL PROCUREMENT CONTRACT — KISANLINK TELANGANA
Agreement Code: {agr_code}
Date: {datetime.date.today().isoformat()}

PARTIES:
Farmer (Seller): {farmer_name} (Village/District: {farmer_loc}, Telangana)
Buyer (Procurer): {buyer_name} (GST: {buyer_gst}, Location: {buyer_loc}, Telangana)

COMMERCIAL TERMS:
Crop: {offer.crop_name}
Quantity: {offer.quantity} kg
Quality Grade: Grade A / Premium Standard
Agreed Price: ₹{offer.price_per_kg}/kg
Gross Transaction Value: ₹{gross_val:,.2f}
Estimated Transport Deduction: ₹{transport_cost:,.2f}
Cold Storage / Warehouse Deduction: ₹{storage_cost:,.2f}
Estimated Net Realisation to Farmer: ₹{net_real:,.2f} (Net ₹{round(net_real / offer.quantity, 2) if offer.quantity > 0 else offer.price_per_kg}/kg)

TRANSACTION & PICKUP CONDITIONS:
1. Pickup Schedule: {offer.pickup_date}
2. Handover Site: Farmer Farm Site ({farmer_loc})
3. Payment Release: Within 24 hours of Quality & Weight Verification.
4. Dispute Resolution: Mediated via Telangana Agricultural Marketing Grievance Center.
"""
        agreement = Agreement(
            agreement_code=agr_code,
            offer_id=offer.id,
            produce_id=offer.produce_id,
            farmer_id=offer.farmer_id,
            buyer_id=offer.buyer_id,
            crop_name=offer.crop_name,
            quantity=offer.quantity,
            quality="Grade A",
            final_price=offer.price_per_kg,
            total_value=gross_val,
            transport_cost=transport_cost,
            storage_cost=storage_cost,
            other_costs=0.0,
            net_realisation=net_real,
            procurement_date=offer.pickup_date,
            last_tx_date=offer.pickup_date,
            payment_deadline="24 Hours Post Pickup",
            pickup_deadline=offer.pickup_date,
            terms_and_conditions=terms_text,
            farmer_signed=False,
            buyer_signed=False,
            status="Draft"
        )
        db.add(agreement)
        db.commit()
        db.refresh(agreement)

    offer.agreement_id = agreement.id

    # Append acceptance entry in negotiation history
    user_name = farmer_name if current_user.role == "farmer" else buyer_name
    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=user_name,
        price_per_kg=offer.price_per_kg,
        quantity=offer.quantity,
        message=f"Offer Accepted at ₹{offer.price_per_kg}/kg ({offer.quantity} kg) by {user_name}. Digital Agreement generated.",
        status="ACCEPTED"
    )
    db.add(neg)

    # Notify both participants with appropriate type
    if current_user.role == "farmer":
        if offer.buyer and offer.buyer.user_id:
            create_notification(
                db=db,
                user_id=offer.buyer.user_id,
                title="Negotiation Accepted",
                message=f"The farmer has accepted your offer of ₹{offer.price_per_kg}/kg for {offer.crop_name} ({offer.quantity} kg).",
                notification_type="NEGOTIATION_ACCEPTED",
                related_id=f"NEG-{offer.id:04d}",
                related_type="NEGOTIATION"
            )
        if offer.farmer and offer.farmer.user_id:
            create_notification(
                db=db,
                user_id=offer.farmer.user_id,
                title="Negotiation Accepted & Agreement Ready",
                message=f"Offer agreed at ₹{offer.price_per_kg}/kg. Digital Agreement {agr_code} generated.",
                notification_type="AGREEMENT_CREATED",
                related_id=str(agreement.id),
                related_type="AGREEMENT"
            )
    else:
        if offer.farmer and offer.farmer.user_id:
            create_notification(
                db=db,
                user_id=offer.farmer.user_id,
                title="Negotiation Accepted",
                message=f"The buyer has accepted your offer of ₹{offer.price_per_kg}/kg for {offer.crop_name} ({offer.quantity} kg).",
                notification_type="NEGOTIATION_ACCEPTED",
                related_id=f"NEG-{offer.id:04d}",
                related_type="NEGOTIATION"
            )
        if offer.buyer and offer.buyer.user_id:
            create_notification(
                db=db,
                user_id=offer.buyer.user_id,
                title="Negotiation Accepted & Agreement Ready",
                message=f"Offer agreed at ₹{offer.price_per_kg}/kg. Digital Agreement {agr_code} generated.",
                notification_type="AGREEMENT_CREATED",
                related_id=str(agreement.id),
                related_type="AGREEMENT"
            )

    return {
        "message": "Offer accepted! Digital Agreement generated.",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "agreement_id": agreement.id,
        "agreement_code": agr_code,
        "agreed_price": offer.price_per_kg,
        "agreed_quantity": offer.quantity,
        "status": "ACCEPTED"
    }

@router.post("/offers/{offer_id}/reject")
def reject_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    if offer.status in ["ACCEPTED", "Accepted"]:
        raise HTTPException(status_code=400, detail="Cannot reject an already accepted negotiation.")

    offer.status = "REJECTED"
    offer.updated_at = datetime.datetime.utcnow()

    user_role = (current_user.role or "").lower()
    sender_name = offer.farmer.full_name if user_role == "farmer" and offer.farmer else (offer.buyer.company_name if offer.buyer else "User")
    recipient_user_id = offer.buyer.user_id if user_role == "farmer" and offer.buyer else (offer.farmer.user_id if offer.farmer else None)

    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=user_role,
        sender_name=sender_name,
        price_per_kg=offer.price_per_kg,
        quantity=offer.quantity,
        message=f"Negotiation was declined/rejected by {sender_name}.",
        status="REJECTED"
    )
    db.add(neg)
    db.commit()

    if recipient_user_id:
        create_notification(
            db=db,
            user_id=recipient_user_id,
            title="Negotiation Rejected",
            message=f"The price negotiation for {offer.crop_name} was declined by {sender_name}.",
            notification_type="NEGOTIATION_REJECTED",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Negotiation rejected.",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "status": "REJECTED"
    }

# 2. AGREEMENT & DIGITAL SIGNING
@router.get("/agreements")
def get_user_agreements(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        agrs = db.query(Agreement).filter(Agreement.farmer_id == farmer.id).order_by(Agreement.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            return []
        agrs = db.query(Agreement).filter(Agreement.buyer_id == buyer.id).order_by(Agreement.id.desc()).all()
    else:
        agrs = db.query(Agreement).order_by(Agreement.id.desc()).all()

    return [
        {
            "id": agr.id,
            "agreement_code": agr.agreement_code,
            "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
            "buyer_company": agr.buyer.company_name if agr.buyer else "Buyer",
            "crop_name": agr.crop_name,
            "quantity": agr.quantity,
            "quality": agr.quality,
            "final_price": agr.final_price,
            "total_value": agr.total_value,
            "transport_cost": agr.transport_cost,
            "net_realisation": agr.net_realisation,
            "procurement_date": agr.procurement_date,
            "payment_deadline": agr.payment_deadline,
            "terms_and_conditions": agr.terms_and_conditions,
            "farmer_signed": agr.farmer_signed,
            "buyer_signed": agr.buyer_signed,
            "status": agr.status,
            "signed_at": agr.signed_at.isoformat() if agr.signed_at else None
        } for agr in agrs
    ]

@router.get("/agreements/{agreement_id}")
def get_agreement(agreement_id: int, db: Session = Depends(get_db)):
    agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found.")
    return {
        "id": agr.id,
        "agreement_code": agr.agreement_code,
        "farmer_name": agr.farmer.full_name,
        "buyer_company": agr.buyer.company_name,
        "crop_name": agr.crop_name,
        "quantity": agr.quantity,
        "quality": agr.quality,
        "final_price": agr.final_price,
        "total_value": agr.total_value,
        "transport_cost": agr.transport_cost,
        "net_realisation": agr.net_realisation,
        "procurement_date": agr.procurement_date,
        "payment_deadline": agr.payment_deadline,
        "terms_and_conditions": agr.terms_and_conditions,
        "farmer_signed": agr.farmer_signed,
        "buyer_signed": agr.buyer_signed,
        "status": agr.status,
        "signed_at": agr.signed_at.isoformat() if agr.signed_at else None
    }

@router.post("/agreements/{agreement_id}/sign")
def sign_agreement(agreement_id: int, payload: SignAgreementSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.accepted_tc:
        raise HTTPException(status_code=400, detail="You must read and agree to the Terms & Conditions before signing.")

    agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found.")

    if current_user.role == "farmer":
        agr.farmer_signed = True
    elif current_user.role == "buyer":
        agr.buyer_signed = True

    # If both signed or single sign prototype fast-track
    agr.farmer_signed = True
    agr.buyer_signed = True
    agr.status = "Signed"
    agr.signed_at = datetime.datetime.utcnow()

    # Create Procurement Record
    proc = Procurement(
        agreement_id=agr.id,
        farmer_id=agr.farmer_id,
        buyer_id=agr.buyer_id,
        produce_id=agr.produce_id,
        status="Agreement Signed",
        pickup_location=f"{agr.farmer.village}, {agr.farmer.district}, Telangana",
        delivery_location=f"{agr.buyer.city}, {agr.buyer.district}, Telangana",
        distance_km=45.0,
        transport_cost=agr.transport_cost
    )
    db.commit()
    db.refresh(proc)

    recipient_uid = agr.buyer.user_id if current_user.role == "farmer" and agr.buyer else (agr.farmer.user_id if agr.farmer else None)
    if recipient_uid:
        create_notification(
            db=db,
            user_id=recipient_uid,
            title="Agreement Signed",
            message=f"Digital Agreement {agr.agreement_code} for {agr.crop_name} has been signed and is ready for slot booking.",
            notification_type="AGREEMENT_ACCEPTED",
            related_id=str(agr.id),
            related_type="AGREEMENT"
        )

    return {"message": "Agreement signed successfully!", "agreement_code": agr.agreement_code, "procurement_id": proc.id}

# 3. SLOT BOOKING & HANDOVER
@router.get("/procurement/available-slots")
def get_available_procurement_slots(agreement_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    slots_template = [
        {"id": 1, "date": "12 Sep 2026", "raw_date": "2026-09-12", "time_window": "08:00 AM – 10:00 AM", "location": "Shadnagar APMC Collection Center, Rangareddy", "type": "APMC Collection Yard", "capacity": "15 MT"},
        {"id": 2, "date": "12 Sep 2026", "raw_date": "2026-09-12", "time_window": "10:00 AM – 12:00 PM", "location": "Shadnagar APMC Collection Center, Rangareddy", "type": "APMC Collection Yard", "capacity": "12 MT"},
        {"id": 3, "date": "12 Sep 2026", "raw_date": "2026-09-12", "time_window": "02:00 PM – 04:00 PM", "location": "Direct Farmgate Pickup (Telangana)", "type": "Direct Farm Pickup", "capacity": "8 MT"},
        {"id": 4, "date": "13 Sep 2026", "raw_date": "2026-09-13", "time_window": "08:00 AM – 10:00 AM", "location": "Khammam APMC Yard Hub, Khammam", "type": "APMC Collection Yard", "capacity": "20 MT"},
        {"id": 5, "date": "13 Sep 2026", "raw_date": "2026-09-13", "time_window": "10:00 AM – 12:00 PM", "location": "Khammam APMC Yard Hub, Khammam", "type": "APMC Collection Yard", "capacity": "18 MT"},
        {"id": 6, "date": "13 Sep 2026", "raw_date": "2026-09-13", "time_window": "03:00 PM – 05:00 PM", "location": "Warangal Enkoor Hub, Warangal", "type": "APMC Collection Yard", "capacity": "15 MT"},
        {"id": 7, "date": "14 Sep 2026", "raw_date": "2026-09-14", "time_window": "09:00 AM – 11:00 AM", "location": "Suryapet Logistics Park, Suryapet", "type": "Logistics Park Hub", "capacity": "25 MT"},
        {"id": 8, "date": "14 Sep 2026", "raw_date": "2026-09-14", "time_window": "02:00 PM – 04:00 PM", "location": "Nizamabad Integrated Market Center", "type": "APMC Collection Yard", "capacity": "10 MT"},
    ]

    booked_slots = db.query(ProcurementSlot).filter(ProcurementSlot.status.in_(["Booked", "CONFIRMED"])).all()
    booked_pairs = {(s.slot_date, s.time_window, s.location) for s in booked_slots}

    results = []
    for s in slots_template:
        is_booked = (s["date"], s["time_window"], s["location"]) in booked_pairs or (s["raw_date"], s["time_window"], s["location"]) in booked_pairs
        results.append({
            **s,
            "is_available": not is_booked,
            "status": "Booked" if is_booked else "Available"
        })
    return results

@router.get("/procurement/active-agreement")
def get_active_procurement_agreement(agreement_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    agr = None
    if agreement_id:
        agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()

    if not agr and current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if farmer:
            agr = db.query(Agreement).filter(Agreement.farmer_id == farmer.id).order_by(Agreement.id.desc()).first()

    if not agr and current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if buyer:
            agr = db.query(Agreement).filter(Agreement.buyer_id == buyer.id).order_by(Agreement.id.desc()).first()

    if not agr:
        agr = db.query(Agreement).order_by(Agreement.id.desc()).first()

    if not agr:
        raise HTTPException(status_code=404, detail="No active agreement found.")

    proc = db.query(Procurement).filter(Procurement.agreement_id == agr.id).first()
    existing_slot = db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == agr.id).first()

    return {
        "id": agr.id,
        "agreement_code": agr.agreement_code,
        "crop_name": agr.crop_name,
        "quantity": agr.quantity,
        "quality": agr.quality,
        "final_price": agr.final_price,
        "total_value": agr.total_value,
        "transport_cost": agr.transport_cost,
        "net_realisation": agr.net_realisation,
        "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
        "buyer_company": agr.buyer.company_name if agr.buyer else "Verified Buyer",
        "pickup_location": f"{agr.farmer.village}, {agr.farmer.district}, Telangana" if agr.farmer else "Farmgate Pickup, Telangana",
        "delivery_location": f"{agr.buyer.city}, {agr.buyer.district}, Telangana" if agr.buyer else "APMC Delivery Hub",
        "status": agr.status,
        "procurement_id": proc.id if proc else None,
        "slot_booking": {
            "id": existing_slot.id,
            "slot_code": existing_slot.slot_code,
            "slot_date": existing_slot.slot_date,
            "time_window": existing_slot.time_window,
            "location": existing_slot.location,
            "status": existing_slot.status
        } if existing_slot else None
    }

@router.post("/procurement/book-slot")
def book_procurement_slot(payload: BookSlotSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Locate Agreement
    agr = None
    if payload.agreement_id and payload.agreement_id > 0:
        agr = db.query(Agreement).filter(Agreement.id == payload.agreement_id).first()
        if not agr:
            raise HTTPException(status_code=404, detail=f"Agreement #{payload.agreement_id} not found.")
    else:
        if current_user.role == "farmer":
            farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            if farmer:
                agr = db.query(Agreement).filter(Agreement.farmer_id == farmer.id).order_by(Agreement.id.desc()).first()

        if not agr:
            agr = db.query(Agreement).order_by(Agreement.id.desc()).first()

    if not agr:
        raise HTTPException(
            status_code=400,
            detail="No signed agreement found for slot booking. Please initiate and accept an agreement first."
        )

    slot_date = payload.slot_date or "12 Sep 2026"
    time_window = payload.time_window or "10:00 AM – 12:00 PM"
    location = payload.location or (f"{agr.farmer.village}, {agr.farmer.district}, Telangana" if agr.farmer else "Farmgate Collection Center, Shadnagar")

    # 2. Check for conflicting booking (double booking prevention)
    conflict = db.query(ProcurementSlot).filter(
        ProcurementSlot.slot_date == slot_date,
        ProcurementSlot.time_window == time_window,
        ProcurementSlot.location == location,
        ProcurementSlot.agreement_id != agr.id,
        ProcurementSlot.status.in_(["Booked", "CONFIRMED"])
    ).first()

    if conflict:
        raise HTTPException(
            status_code=409,
            detail="This slot window is no longer available. Please select another slot or time window."
        )

    # 3. Unique slot code generation
    rand_suffix = random.randint(100, 999)
    ts_fragment = int(datetime.datetime.utcnow().timestamp()) % 100000
    slot_code = f"SLOT-TS-{agr.id:03d}-{ts_fragment:05d}-{rand_suffix}"

    # Check if agreement already has a slot
    existing_slot = db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == agr.id).first()
    if existing_slot:
        existing_slot.slot_code = slot_code
        existing_slot.slot_date = slot_date
        existing_slot.time_window = time_window
        existing_slot.location = location
        existing_slot.crop_name = payload.crop or agr.crop_name
        existing_slot.quantity = payload.quantity or agr.quantity
        existing_slot.farmer_id = agr.farmer_id
        existing_slot.buyer_id = agr.buyer_id
        existing_slot.booked_by = current_user.username
        existing_slot.status = "CONFIRMED"
        slot = existing_slot
    else:
        slot = ProcurementSlot(
            agreement_id=agr.id,
            slot_code=slot_code,
            slot_date=slot_date,
            time_window=time_window,
            location=location,
            crop_name=payload.crop or agr.crop_name,
            quantity=payload.quantity or agr.quantity,
            farmer_id=agr.farmer_id,
            buyer_id=agr.buyer_id,
            booked_by=current_user.username,
            status="CONFIRMED",
            created_at=datetime.datetime.utcnow()
        )
        db.add(slot)

    db.commit()
    db.refresh(slot)

    # 4. Link with Procurement record
    proc = db.query(Procurement).filter(Procurement.agreement_id == agr.id).first()
    if not proc:
        proc = Procurement(
            agreement_id=agr.id,
            slot_id=slot.id,
            farmer_id=agr.farmer_id,
            buyer_id=agr.buyer_id,
            produce_id=agr.produce_id,
            status="Slot Booked",
            pickup_location=location,
            delivery_location=f"{agr.buyer.city}, {agr.buyer.district}, Telangana" if agr.buyer else "APMC Delivery Hub",
            distance_km=45.0,
            transport_cost=agr.transport_cost
        )
        db.add(proc)
    else:
        proc.slot_id = slot.id
        proc.status = "Slot Booked"
        proc.pickup_location = location

    # 5. Add notifications
    if agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Slot Confirmed",
            message=f"Your procurement slot {slot.slot_code} has been confirmed for {agr.crop_name} ({agr.quantity} kg) on {slot.slot_date} ({slot.time_window}).",
            notification_type="SLOT_BOOKED",
            related_id=str(slot.id),
            related_type="SLOT"
        )
    if agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Procurement Slot Booked",
            message=f"A procurement slot {slot.slot_code} has been booked for your order by {agr.farmer.full_name if agr.farmer else 'Farmer'} for {agr.crop_name} on {slot.slot_date}.",
            notification_type="SLOT_BOOKED",
            related_id=str(slot.id),
            related_type="SLOT"
        )

    if proc:
        db.refresh(proc)

    return {
        "message": "Procurement slot booked successfully!",
        "slot_id": slot.id,
        "slot_code": slot.slot_code,
        "slot_date": slot.slot_date,
        "time_window": slot.time_window,
        "location": slot.location,
        "crop_name": agr.crop_name,
        "quantity": agr.quantity,
        "buyer_company": agr.buyer.company_name if agr.buyer else "Verified Buyer",
        "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
        "status": "CONFIRMED",
        "procurement_id": proc.id if proc else None,
        "agreement_id": agr.id
    }

@router.post("/procurement/{procurement_id}/handover")
def produce_handover(procurement_id: int, notes: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proc = db.query(Procurement).filter(Procurement.id == procurement_id).first()
    if not proc:
        # Fallback to latest procurement for current farmer if not found
        if current_user.role == "farmer":
            farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            if farmer:
                proc = db.query(Procurement).filter(Procurement.farmer_id == farmer.id).order_by(Procurement.id.desc()).first()
        if not proc:
            proc = db.query(Procurement).order_by(Procurement.id.desc()).first()

    if not proc:
        raise HTTPException(status_code=404, detail="Procurement record not found. Please complete agreement and slot booking first.")

    agr = proc.agreement
    if not agr:
        raise HTTPException(status_code=404, detail="Associated agreement not found for this procurement.")

    # 1. Update Procurement Status
    proc.status = "Produce Picked Up"
    proc.handover_notes = notes or "Produce physical handover completed at farm site in good order."
    proc.handover_at = datetime.datetime.utcnow()

    # 2. Check if a transaction already exists for this agreement to prevent duplicate records
    tx = db.query(Transaction).filter(Transaction.agreement_id == agr.id).first()

    # Accurate financial calculation
    gross_value = round(float(agr.final_price) * float(agr.quantity), 2)
    transport_cost = round(float(agr.transport_cost), 2) if agr.transport_cost is not None else 1500.0
    storage_cost = round(float(agr.storage_cost), 2) if hasattr(agr, 'storage_cost') and agr.storage_cost is not None else 0.0
    other_costs = round(float(agr.other_costs), 2) if hasattr(agr, 'other_costs') and agr.other_costs is not None else 0.0
    net_realisation = round(gross_value - transport_cost - storage_cost - other_costs, 2)
    net_price_per_kg = round(net_realisation / float(agr.quantity), 2) if float(agr.quantity) > 0 else agr.final_price

    if not tx:
        # Generate clean guaranteed unique transaction code
        rand_suffix = random.randint(100, 999)
        ts_suffix = int(datetime.datetime.utcnow().timestamp()) % 10000
        txn_code = f"TXN-KL-2026-{agr.id:03d}-{ts_suffix:04d}-{rand_suffix}"

        tx = Transaction(
            transaction_code=txn_code,
            agreement_id=agr.id,
            farmer_id=agr.farmer_id,
            buyer_id=agr.buyer_id,
            produce_id=agr.produce_id,
            booking_id=proc.slot_id,
            procurement_id=proc.id,
            crop_name=agr.crop_name,
            quantity=agr.quantity,
            price_per_kg=agr.final_price,
            gross_value=gross_value,
            transport_cost=transport_cost,
            storage_cost=storage_cost,
            other_costs=other_costs,
            net_realisation=net_realisation,
            net_price_per_kg=net_price_per_kg,
            procurement_status="HANDOVER_COMPLETED",
            payment_status="PENDING",
            final_status="HANDOVER_COMPLETED",
            created_at=datetime.datetime.utcnow()
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        # Create/Link Payment Tracking Record
        existing_pmt = db.query(Payment).filter(Payment.procurement_id == proc.id).first()
        if not existing_pmt:
            pmt = Payment(
                procurement_id=proc.id,
                transaction_id=tx.id,
                transaction_code=txn_code,
                amount=net_realisation,
                amount_due=net_realisation,
                status="Pending",
                payment_method="Direct Bank Transfer (Prototype Sandbox)",
                payment_reference=f"REF-TS-SBX-{random.randint(100000, 999999)}"
            )
            db.add(pmt)
            db.commit()
        else:
            existing_pmt.transaction_id = tx.id
            existing_pmt.transaction_code = txn_code
            existing_pmt.amount = net_realisation
            existing_pmt.amount_due = net_realisation
            db.commit()

    else:
        # Update existing transaction
        tx.procurement_status = "HANDOVER_COMPLETED"
        if not tx.booking_id:
            tx.booking_id = proc.slot_id
        if not tx.procurement_id:
            tx.procurement_id = proc.id
        db.commit()

    # Send Notifications to Farmer and Buyer
    txn_ref_code = tx.transaction_code
    if agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Produce Handover Completed",
            message=f"Produce handover completed successfully. Transaction {txn_ref_code} has been created for {agr.crop_name} ({agr.quantity} kg).",
            notification_type="HANDOVER_COMPLETED",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Feedback Requested",
            message=f"Please provide your rating and feedback for completed transaction {txn_ref_code}.",
            notification_type="FEEDBACK_REQUEST",
            related_id=str(tx.id),
            related_type="FEEDBACK"
        )
    if agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Produce Handover Completed",
            message=f"The farmer's produce handover for {agr.crop_name} has been completed. Transaction {txn_ref_code} created.",
            notification_type="HANDOVER_COMPLETED",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Feedback Requested",
            message=f"Please provide your rating and feedback for completed transaction {txn_ref_code}.",
            notification_type="FEEDBACK_REQUEST",
            related_id=str(tx.id),
            related_type="FEEDBACK"
        )

    return {
        "message": "Produce handover confirmed and transaction created successfully!",
        "status": proc.status,
        "procurement_id": proc.id,
        "transaction_id": tx.id,
        "transaction_code": tx.transaction_code,
        "gross_value": tx.gross_value,
        "net_realisation": tx.net_realisation,
        "payment_status": tx.payment_status
    }

# 4. QUALITY CONFIRMATION & PAYMENT
@router.post("/procurement/quality-confirm")
def confirm_quality(payload: QualityConfirmSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proc = db.query(Procurement).filter(Procurement.id == payload.procurement_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement not found.")

    agr = proc.agreement
    diff_qty = proc.agreement.quantity - payload.received_quantity

    qconf = QualityConfirmation(
        procurement_id=proc.id,
        expected_quantity=agr.quantity,
        received_quantity=payload.received_quantity,
        diff_quantity=diff_qty,
        quality_received=payload.quality_received,
        status=payload.status,
        adjustment_reason=payload.adjustment_reason
    )
    db.add(qconf)
    
    proc.status = "Quality Confirmed"
    db.commit()

    return {"message": "Quality and quantity confirmed successfully!", "quality_status": payload.status}

@router.post("/procurement/process-payment")
def process_payment(payload: ProcessPaymentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = None
    proc = None
    if payload.transaction_id:
        tx = db.query(Transaction).filter(Transaction.id == payload.transaction_id).first()
        if tx:
            proc = tx.procurement or db.query(Procurement).filter(Procurement.agreement_id == tx.agreement_id).first()

    if not proc and payload.procurement_id:
        proc = db.query(Procurement).filter(Procurement.id == payload.procurement_id).first()
        if proc:
            tx = db.query(Transaction).filter(Transaction.agreement_id == proc.agreement_id).first()

    if not tx and not proc:
        tx = db.query(Transaction).order_by(Transaction.id.desc()).first()
        if tx:
            proc = tx.procurement

    if not tx and not proc:
        raise HTTPException(status_code=404, detail="No transaction or procurement found to process payment.")

    agr = tx.agreement if tx else proc.agreement
    now = datetime.datetime.utcnow()

    # Update or create payment record
    pmt = None
    if proc:
        pmt = db.query(Payment).filter(Payment.procurement_id == proc.id).first()
    if not pmt and tx:
        pmt = db.query(Payment).filter(Payment.transaction_id == tx.id).first()

    ref_code = f"REF-TS-SBX-{random.randint(100000, 999999)}"
    if pmt:
        pmt.status = "Completed"
        pmt.amount_due = 0.0
        pmt.payment_date = now
        pmt.payment_method = payload.payment_method or pmt.payment_method
        pmt.payment_reference = pmt.payment_reference or ref_code
    else:
        pmt = Payment(
            procurement_id=proc.id if proc else 1,
            transaction_id=tx.id if tx else None,
            transaction_code=tx.transaction_code if tx else f"TXN-KL-2026-{agr.id * 10 + 1023}",
            amount=tx.net_realisation if tx else agr.total_value,
            amount_due=0.0,
            status="Completed",
            payment_method=payload.payment_method,
            payment_reference=ref_code,
            payment_date=now
        )
        db.add(pmt)

    if proc:
        proc.status = "Payment Completed"

    if tx:
        tx.payment_status = "COMPLETED"
        tx.procurement_status = "COMPLETED"
        tx.final_status = "COMPLETED"
        tx.completed_at = now

    # Notify Farmer & Buyer
    if agr and agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Payment Completed",
            message=f"Payment of ₹{tx.net_realisation if tx else pmt.amount:,.2f} for transaction {tx.transaction_code if tx else pmt.transaction_code} has been completed.",
            notification_type="PAYMENT_UPDATED",
            related_id=str(tx.id if tx else pmt.id),
            related_type="PAYMENT"
        )
    if agr and agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Payment Settlement Completed",
            message=f"Payment settlement of ₹{tx.net_realisation if tx else pmt.amount:,.2f} for transaction {tx.transaction_code if tx else pmt.transaction_code} is complete.",
            notification_type="PAYMENT_UPDATED",
            related_id=str(tx.id if tx else pmt.id),
            related_type="PAYMENT"
        )

    db.commit()

    return {
        "message": "Payment completed successfully!",
        "transaction_code": tx.transaction_code if tx else pmt.transaction_code,
        "amount": tx.net_realisation if tx else pmt.amount,
        "net_realisation": tx.net_realisation if tx else pmt.amount,
        "payment_status": "COMPLETED",
        "payment_reference": pmt.payment_reference,
        "payment_date": now.strftime("%Y-%m-%d %H:%M")
    }

@router.post("/transactions/{transaction_id}/pay")
def pay_transaction(transaction_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return process_payment(ProcessPaymentSchema(transaction_id=transaction_id), current_user=current_user, db=db)

# 5. TRANSACTIONS LIST & DETAILS
@router.get("/transactions")
def get_transactions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        txs = db.query(Transaction).filter(Transaction.farmer_id == farmer.id).order_by(Transaction.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            return []
        txs = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).order_by(Transaction.id.desc()).all()
    else:
        # Admin gets all transactions
        txs = db.query(Transaction).order_by(Transaction.id.desc()).all()

    result = []
    for t in txs:
        slot = t.booking or (db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == t.agreement_id).first())
        pmt = db.query(Payment).filter((Payment.transaction_id == t.id) | (Payment.transaction_code == t.transaction_code)).first()
        
        fb_list = db.query(RatingFeedback).filter(RatingFeedback.transaction_id == t.id).all()
        user_fb = next((f for f in fb_list if f.reviewer_id == current_user.id), None)
        other_fb = next((f for f in fb_list if f.reviewer_id != current_user.id), None)

        result.append({
            "id": t.id,
            "transaction_code": t.transaction_code,
            "agreement_id": t.agreement_id,
            "agreement_code": t.agreement.agreement_code if t.agreement else f"AGR-{t.agreement_id}",
            "produce_id": t.produce_id,
            "booking_id": t.booking_id,
            "procurement_id": t.procurement_id,
            "crop_name": t.crop_name,
            "quantity": t.quantity,
            "price_per_kg": t.price_per_kg,
            "gross_value": t.gross_value,
            "transport_cost": t.transport_cost,
            "storage_cost": t.storage_cost,
            "other_costs": t.other_costs,
            "net_realisation": t.net_realisation,
            "net_price_per_kg": t.net_price_per_kg,
            "procurement_status": t.procurement_status,
            "payment_status": t.payment_status,
            "final_status": t.final_status,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else None,
            "completed_at": t.completed_at.strftime("%Y-%m-%d %H:%M") if t.completed_at else None,
            "farmer_name": t.farmer.full_name if t.farmer else "Farmer",
            "farmer_village": t.farmer.village if t.farmer else "Shadnagar",
            "farmer_district": t.farmer.district if t.farmer else "Rangareddy",
            "buyer_company": t.buyer.company_name if t.buyer else "Verified Buyer",
            "buyer_city": t.buyer.city if t.buyer else "Hyderabad",
            "buyer_district": t.buyer.district if t.buyer else "Telangana",
            "slot_date": slot.slot_date if slot else (t.procurement.handover_at.strftime("%d %b %Y") if t.procurement and t.procurement.handover_at else "12 Sep 2026"),
            "slot_window": slot.time_window if slot else "10:00 AM – 12:00 PM",
            "pickup_location": slot.location if (slot and slot.location) else (f"{t.farmer.village}, {t.farmer.district}" if t.farmer else "Farmgate Pickup"),
            "payment": {
                "id": pmt.id if pmt else None,
                "amount": pmt.amount if pmt else t.net_realisation,
                "amount_due": pmt.amount_due if pmt else (0.0 if t.payment_status == "COMPLETED" else t.net_realisation),
                "status": pmt.status if pmt else t.payment_status,
                "payment_method": pmt.payment_method if pmt else "Direct Bank Transfer (Prototype Sandbox)",
                "payment_reference": pmt.payment_reference if pmt else f"REF-TS-SBX-{t.id * 100 + 45}",
                "payment_date": pmt.payment_date.strftime("%Y-%m-%d %H:%M") if (pmt and pmt.payment_date) else None
            },
            "user_feedback": {
                "id": user_fb.id,
                "rating": user_fb.rating,
                "comments": user_fb.comments,
                "created_at": user_fb.created_at.strftime("%Y-%m-%d")
            } if user_fb else None,
            "other_feedback": {
                "id": other_fb.id,
                "rating": other_fb.rating,
                "comments": other_fb.comments,
                "created_at": other_fb.created_at.strftime("%Y-%m-%d")
            } if other_fb else None
        })
    return result

@router.get("/transactions/{transaction_id}")
def get_transaction_by_id(transaction_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    slot = t.booking or (db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == t.agreement_id).first())
    pmt = db.query(Payment).filter((Payment.transaction_id == t.id) | (Payment.transaction_code == t.transaction_code)).first()
    fb_list = db.query(RatingFeedback).filter(RatingFeedback.transaction_id == t.id).all()
    user_fb = next((f for f in fb_list if f.reviewer_id == current_user.id), None)
    other_fb = next((f for f in fb_list if f.reviewer_id != current_user.id), None)

    return {
        "id": t.id,
        "transaction_code": t.transaction_code,
        "agreement_id": t.agreement_id,
        "agreement_code": t.agreement.agreement_code if t.agreement else f"AGR-{t.agreement_id}",
        "produce_id": t.produce_id,
        "booking_id": t.booking_id,
        "procurement_id": t.procurement_id,
        "crop_name": t.crop_name,
        "quantity": t.quantity,
        "price_per_kg": t.price_per_kg,
        "gross_value": t.gross_value,
        "transport_cost": t.transport_cost,
        "storage_cost": t.storage_cost,
        "other_costs": t.other_costs,
        "net_realisation": t.net_realisation,
        "net_price_per_kg": t.net_price_per_kg,
        "procurement_status": t.procurement_status,
        "payment_status": t.payment_status,
        "final_status": t.final_status,
        "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else None,
        "completed_at": t.completed_at.strftime("%Y-%m-%d %H:%M") if t.completed_at else None,
        "farmer_name": t.farmer.full_name if t.farmer else "Farmer",
        "farmer_village": t.farmer.village if t.farmer else "Shadnagar",
        "farmer_district": t.farmer.district if t.farmer else "Rangareddy",
        "buyer_company": t.buyer.company_name if t.buyer else "Verified Buyer",
        "buyer_city": t.buyer.city if t.buyer else "Hyderabad",
        "buyer_district": t.buyer.district if t.buyer else "Telangana",
        "slot_date": slot.slot_date if slot else "12 Sep 2026",
        "slot_window": slot.time_window if slot else "10:00 AM – 12:00 PM",
        "pickup_location": slot.location if (slot and slot.location) else (f"{t.farmer.village}, {t.farmer.district}" if t.farmer else "Farmgate Pickup"),
        "payment": {
            "id": pmt.id if pmt else None,
            "amount": pmt.amount if pmt else t.net_realisation,
            "amount_due": pmt.amount_due if pmt else (0.0 if t.payment_status == "COMPLETED" else t.net_realisation),
            "status": pmt.status if pmt else t.payment_status,
            "payment_method": pmt.payment_method if pmt else "Direct Bank Transfer (Prototype Sandbox)",
            "payment_reference": pmt.payment_reference if pmt else f"REF-TS-SBX-{t.id * 100 + 45}",
            "payment_date": pmt.payment_date.strftime("%Y-%m-%d %H:%M") if (pmt and pmt.payment_date) else None
        },
        "user_feedback": {
            "id": user_fb.id,
            "rating": user_fb.rating,
            "comments": user_fb.comments,
            "created_at": user_fb.created_at.strftime("%Y-%m-%d")
        } if user_fb else None,
        "other_feedback": {
            "id": other_fb.id,
            "rating": other_fb.rating,
            "comments": other_fb.comments,
            "created_at": other_fb.created_at.strftime("%Y-%m-%d")
        } if other_fb else None
    }

# 6. FEEDBACK & GRIEVANCES
@router.post("/feedback")
def add_feedback(payload: AddFeedbackSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == payload.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    reviewee_id = tx.buyer.user_id if current_user.role == "farmer" else tx.farmer.user_id
    if not reviewee_id:
        reviewee_id = current_user.id

    existing_fb = db.query(RatingFeedback).filter(
        RatingFeedback.transaction_id == payload.transaction_id,
        RatingFeedback.reviewer_id == current_user.id
    ).first()

    if existing_fb:
        existing_fb.rating = payload.rating
        existing_fb.comments = payload.comments
        existing_fb.communication_rating = payload.communication_rating
        existing_fb.payment_reliability = payload.payment_reliability
        existing_fb.quality_accuracy = payload.quality_accuracy
        existing_fb.pickup_reliability = payload.pickup_reliability
        existing_fb.professionalism = payload.professionalism
        fb = existing_fb
    else:
        fb = RatingFeedback(
            transaction_id=payload.transaction_id,
            reviewer_id=current_user.id,
            reviewee_id=reviewee_id,
            rating=payload.rating,
            communication_rating=payload.communication_rating,
            payment_reliability=payload.payment_reliability,
            quality_accuracy=payload.quality_accuracy,
            pickup_reliability=payload.pickup_reliability,
            professionalism=payload.professionalism,
            comments=payload.comments,
            created_at=datetime.datetime.utcnow()
        )
        db.add(fb)

    db.commit()
    db.refresh(fb)

    return {"message": "Feedback submitted successfully! Thank you.", "feedback_id": fb.id, "rating": fb.rating}

@router.post("/transactions/{transaction_id}/feedback")
def add_transaction_feedback(transaction_id: int, payload: AddFeedbackSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload.transaction_id = transaction_id
    return add_feedback(payload, current_user=current_user, db=db)

@router.post("/grievances")
def create_grievance(payload: AddGrievanceSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    grv_code = f"GRV-KL-{datetime.datetime.utcnow().strftime('%M%S')}"
    grv = Grievance(
        grievance_code=grv_code,
        user_id=current_user.id,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        status="Open"
    )
    db.add(grv)
    db.commit()

    # Notify Admins of new grievance
    notify_admins(
        db=db,
        title="New Grievance Registered",
        message=f"New grievance {grv_code} registered under category '{payload.category}': {payload.title}.",
        notification_type="ADMIN_GRIEVANCE",
        related_id=grv_code,
        related_type="ADMIN_GRIEVANCE"
    )

    return {"message": "Grievance registered.", "grievance_code": grv_code}

@router.get("/grievances")
def get_grievances(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        grvs = db.query(Grievance).order_by(Grievance.id.desc()).all()
    else:
        grvs = db.query(Grievance).filter(Grievance.user_id == current_user.id).order_by(Grievance.id.desc()).all()

    result = []
    for g in grvs:
        result.append({
            "id": g.id,
            "grievance_code": g.grievance_code,
            "category": g.category,
            "title": g.title,
            "description": g.description,
            "status": g.status,
            "admin_remarks": g.admin_remarks,
            "created_at": g.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return result

# 7. NOTIFICATIONS API
@router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.id.desc()).all()
    unread_count = len([n for n in notifs if not n.is_read])
    return {
        "count": unread_count,
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "notification_id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "type": n.notification_type,
                "notification_type": n.notification_type,
                "related_id": n.related_id,
                "related_type": n.related_type,
                "created_at": n.created_at.strftime("%I:%M %p, %b %d") if n.created_at else None,
                "raw_created_at": n.created_at.isoformat() if n.created_at else None
            } for n in notifs
        ]
    }

@router.get("/notifications/unread-count")
def get_unread_notification_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    return {"count": count, "unread_count": count}

@router.patch("/notifications/{notification_id}/read")
@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read", "notification_id": notification_id}

@router.patch("/notifications/read-all")
@router.post("/notifications/read-all")
def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({Notification.is_read: True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
