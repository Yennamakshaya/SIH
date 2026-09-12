import datetime
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

router = APIRouter(prefix="/api/workflow", tags=["Workflow & Lifecycle"])

# 1. OFFERS & NEGOTIATION
@router.post("/offers")
def send_offer(payload: SendOfferSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_val = round(payload.quantity * payload.price_per_kg, 2)
    
    offer = Offer(
        produce_id=payload.produce_id,
        requirement_id=payload.requirement_id,
        farmer_id=payload.farmer_id,
        buyer_id=payload.buyer_id,
        crop_name=payload.crop_name,
        quantity=payload.quantity,
        price_per_kg=payload.price_per_kg,
        total_value=total_val,
        pickup_date=payload.pickup_date,
        delivery_location=payload.delivery_location,
        payment_terms=payload.payment_terms,
        message=payload.message,
        status="Negotiating",
        sender_role=current_user.role
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    # Initial Negotiation Entry
    sender_name = "Farmer" if current_user.role == "farmer" else "Buyer"
    if current_user.role == "farmer" and current_user.farmer_profile:
        sender_name = current_user.farmer_profile.full_name
    elif current_user.role == "buyer" and current_user.buyer_profile:
        sender_name = current_user.buyer_profile.company_name

    neg = Negotiation(
        offer_id=offer.id,
        sender_role=current_user.role,
        sender_name=sender_name,
        price_per_kg=payload.price_per_kg,
        quantity=payload.quantity,
        message=payload.message or f"Initial offer: ₹{payload.price_per_kg}/kg for {payload.quantity} kg"
    )
    db.add(neg)
    
    # Notify recipient
    recipient_user_id = offer.buyer.user_id if current_user.role == "farmer" else offer.farmer.user_id
    notif = Notification(
        user_id=recipient_user_id,
        title="New Offer Received",
        message=f"New offer of ₹{payload.price_per_kg}/kg for {payload.crop_name} received from {sender_name}.",
        notification_type="info"
    )
    db.add(notif)
    db.commit()

    return {"message": "Offer sent successfully!", "offer_id": offer.id}

@router.get("/offers")
def get_user_offers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
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

    result = []
    for o in offers:
        negs = db.query(Negotiation).filter(Negotiation.offer_id == o.id).order_by(Negotiation.id.asc()).all()
        result.append({
            "id": o.id,
            "produce_id": o.produce_id,
            "crop_name": o.crop_name,
            "farmer_name": o.farmer.full_name,
            "buyer_company": o.buyer.company_name,
            "farmer_id": o.farmer_id,
            "buyer_id": o.buyer_id,
            "quantity": o.quantity,
            "price_per_kg": o.price_per_kg,
            "total_value": o.total_value,
            "pickup_date": o.pickup_date,
            "delivery_location": o.delivery_location,
            "payment_terms": o.payment_terms,
            "status": o.status,
            "sender_role": o.sender_role,
            "negotiations": [
                {
                    "id": n.id,
                    "sender_role": n.sender_role,
                    "sender_name": n.sender_name,
                    "price_per_kg": n.price_per_kg,
                    "quantity": n.quantity,
                    "message": n.message,
                    "created_at": n.created_at.strftime("%I:%M %p, %b %d") if n.created_at else None
                } for n in negs
            ]
        })
    return result

@router.post("/offers/{offer_id}/counter")
def counter_offer(offer_id: int, payload: CounterOfferSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    offer.price_per_kg = payload.price_per_kg
    offer.quantity = payload.quantity
    offer.total_value = round(payload.quantity * payload.price_per_kg, 2)
    offer.status = "Negotiating"

    sender_name = "Farmer" if current_user.role == "farmer" else "Buyer"
    if current_user.role == "farmer" and current_user.farmer_profile:
        sender_name = current_user.farmer_profile.full_name
    elif current_user.role == "buyer" and current_user.buyer_profile:
        sender_name = current_user.buyer_profile.company_name

    neg = Negotiation(
        offer_id=offer.id,
        sender_role=current_user.role,
        sender_name=sender_name,
        price_per_kg=payload.price_per_kg,
        quantity=payload.quantity,
        message=payload.message or f"Counter offer: ₹{payload.price_per_kg}/kg"
    )
    db.add(neg)
    db.commit()
    return {"message": "Counter offer submitted.", "offer_id": offer.id}

@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    offer.status = "Accepted"
    
    # Calculate Net Realisation
    # Transport cost estimate based on distance (~45km * ₹30/km)
    transport_cost = 1500.0
    net_calc = calculate_net_realisation(offer.quantity, offer.price_per_kg, transport_cost=transport_cost)

    agr_code = f"AGR-KL-2026-{offer.id:05d}"
    
    # Generate Digital Agreement
    terms_text = f"""DIGITAL PROCUREMENT AGREEMENT — KISANLINK TELANGANA
Agreement Code: {agr_code}
Date: {datetime.date.today().isoformat()}

PARTIES:
Farmer: {offer.farmer.full_name} (Village: {offer.farmer.village}, Mandal: {offer.farmer.mandal}, District: {offer.farmer.district}, Telangana)
Buyer: {offer.buyer.company_name} (GST: {offer.buyer.gstin_masked}, District: {offer.buyer.district}, Telangana)

COMMERCIAL TERMS:
Crop: {offer.crop_name}
Quantity: {offer.quantity} kg
Quality Standard: Grade A / Premium
Final Agreed Price: ₹{offer.price_per_kg}/kg
Gross Transaction Value: ₹{offer.total_value:,.2f}
Estimated Transport Deduction: ₹{transport_cost:,.2f}
Estimated Net Realisation to Farmer: ₹{net_calc['net_realisation']:,.2f} (Net ₹{net_calc['net_price_per_kg']}/kg)

TRANSACTION & PICKUP TERMS:
1. Pickup Date / Deadline: {offer.pickup_date}
2. Pickup Location: Farmer Farm Site ({offer.farmer.village}, {offer.farmer.district})
3. Payment Deadline: Within 24 hours of Quality & Quantity Confirmation.
4. Cancellation Penalty: 5% of total transaction value if cancelled without mutual consent.
5. Quality Conditions: Buyer will confirm weight & quality grade upon pickup.

DISPUTE RESOLUTION:
Any dispute shall be mediated via KisanLink Telangana Grievance Portal (admin arbitration).
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
        total_value=offer.total_value,
        transport_cost=transport_cost,
        storage_cost=0.0,
        other_costs=0.0,
        net_realisation=net_calc["net_realisation"],
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

    return {"message": "Offer accepted! Digital Agreement generated.", "agreement_id": agreement.id, "agreement_code": agr_code}

# 2. AGREEMENT & DIGITAL SIGNING
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
    db.add(proc)
    db.commit()
    db.refresh(proc)

    return {"message": "Agreement signed successfully!", "agreement_code": agr.agreement_code, "procurement_id": proc.id}

# 3. SLOT BOOKING & HANDOVER
@router.post("/procurement/book-slot")
def book_procurement_slot(payload: BookSlotSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    agr = db.query(Agreement).filter(Agreement.id == payload.agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found.")

    slot_code = f"SLOT-KL-{payload.agreement_id * 100 + 24}"
    slot = ProcurementSlot(
        agreement_id=payload.agreement_id,
        slot_code=slot_code,
        slot_date=payload.slot_date,
        time_window=payload.time_window,
        booked_by=current_user.username,
        status="Booked"
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    proc = db.query(Procurement).filter(Procurement.agreement_id == payload.agreement_id).first()
    if proc:
        proc.slot_id = slot.id
        proc.status = "Slot Booked"
        db.commit()

    return {"message": "Procurement slot booked successfully!", "slot_code": slot_code, "slot_date": payload.slot_date, "time_window": payload.time_window}

@router.post("/procurement/{procurement_id}/handover")
def produce_handover(procurement_id: int, notes: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proc = db.query(Procurement).filter(Procurement.id == procurement_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement record not found.")

    proc.status = "Produce Picked Up"
    proc.handover_notes = notes or "Produce picked up from farmer site in good condition."
    proc.handover_at = datetime.datetime.utcnow()
    db.commit()

    return {"message": "Produce handover confirmed!", "status": proc.status}

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
    proc = db.query(Procurement).filter(Procurement.id == payload.procurement_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement not found.")

    agr = proc.agreement
    txn_code = f"TXN-KL-2026-{agr.id * 10 + 1023}"

    pmt = Payment(
        procurement_id=proc.id,
        transaction_code=txn_code,
        amount=agr.total_value,
        status="Completed",
        payment_method=payload.payment_method,
        payment_date=datetime.datetime.utcnow()
    )
    db.add(pmt)

    proc.status = "Payment Completed"

    # Create Final Completed Transaction Record
    net_calc = calculate_net_realisation(agr.quantity, agr.final_price, transport_cost=agr.transport_cost)

    tx = Transaction(
        transaction_code=txn_code,
        agreement_id=agr.id,
        farmer_id=agr.farmer_id,
        buyer_id=agr.buyer_id,
        crop_name=agr.crop_name,
        quantity=agr.quantity,
        price_per_kg=agr.final_price,
        gross_value=agr.total_value,
        transport_cost=agr.transport_cost,
        storage_cost=0.0,
        other_costs=0.0,
        net_realisation=net_calc["net_realisation"],
        net_price_per_kg=net_calc["net_price_per_kg"],
        procurement_status="Completed",
        payment_status="Completed",
        final_status="Completed"
    )
    db.add(tx)
    db.commit()

    return {
        "message": "Payment completed successfully!",
        "transaction_code": txn_code,
        "amount": agr.total_value,
        "net_realisation": net_calc["net_realisation"],
        "payment_status": "Completed"
    }

# 5. TRANSACTIONS LIST
@router.get("/transactions")
def get_transactions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        txs = db.query(Transaction).filter(Transaction.farmer_id == farmer.id).order_by(Transaction.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        txs = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).order_by(Transaction.id.desc()).all()
    else:
        txs = db.query(Transaction).order_by(Transaction.id.desc()).all()

    result = []
    for t in txs:
        result.append({
            "id": t.id,
            "transaction_code": t.transaction_code,
            "agreement_id": t.agreement_id,
            "crop_name": t.crop_name,
            "farmer_name": t.farmer.full_name if t.farmer else "Ramesh Reddy",
            "buyer_company": t.buyer.company_name if t.buyer else "Shree Foods Pvt Ltd",
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
            "created_at": t.created_at.strftime("%Y-%m-%d")
        })
    return result

# 6. FEEDBACK & GRIEVANCES
@router.post("/feedback")
def add_feedback(payload: AddFeedbackSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == payload.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    reviewee_id = tx.buyer.user_id if current_user.role == "farmer" else tx.farmer.user_id

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
        comments=payload.comments
    )
    db.add(fb)
    db.commit()

    return {"message": "Feedback submitted successfully! Thank you."}

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

# 7. NOTIFICATIONS
@router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.id.desc()).all()
    unread_count = len([n for n in notifs if not n.is_read])
    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "notification_type": n.notification_type,
                "created_at": n.created_at.strftime("%I:%M %p, %b %d") if n.created_at else None
            } for n in notifs
        ]
    }
