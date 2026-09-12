from pydantic import BaseModel
from typing import Optional, List
import datetime

# Auth Schemas
class FarmerRegisterSchema(BaseModel):
    full_name: str
    mobile_number: str
    username: str
    email: str
    password: str
    confirm_password: str
    address: Optional[str] = None
    village: str
    mandal: str
    district: str
    state: str = "Telangana"
    pincode: str
    aadhaar_number: str
    preferred_language: str = "en"
    crops_grown: Optional[str] = None
    farm_size: Optional[str] = None

class BuyerRegisterSchema(BaseModel):
    company_name: str
    company_id: str
    contact_person: str
    mobile_number: str
    email: str
    password: str
    confirm_password: str
    address: Optional[str] = None
    city: str
    district: str
    state: str = "Telangana"
    pincode: str
    gstin: str
    pan: str
    udyam_number: Optional[str] = None
    buyer_category: str
    procurement_categories: Optional[str] = None

class LoginSchema(BaseModel):
    identifier: str # Email / Mobile / Username
    password: str
    role: str # 'farmer', 'buyer', 'admin'

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    status: Optional[str] = "ACTIVE"

class VerifyOTPSchema(BaseModel):
    mobile_number: str
    otp: str

class SendOTPSchema(BaseModel):
    mobile_number: str

class ForgotPasswordSchema(BaseModel):
    identifier: str # Mobile or Email

class ResetPasswordSchema(BaseModel):
    identifier: str
    otp: str
    new_password: str
    confirm_password: str

# Produce Schemas
class AddProduceSchema(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    quantity: float
    unit: str = "kg"
    quality: str = "Grade A"
    expected_price: float
    harvest_date: str
    available_from: str
    state: str = "Telangana"
    district: str
    mandal: str
    village: str
    pincode: str
    description: Optional[str] = None
    images: Optional[str] = None

# Requirement Schemas
class AddRequirementSchema(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    required_quantity: float
    quality: str = "Grade A"
    max_price: float
    preferred_district: str
    preferred_mandal: Optional[str] = None
    required_by_date: str
    pickup_delivery: str = "Pickup"
    additional_reqs: Optional[str] = None

# Offer & Negotiation Schemas
class SendOfferSchema(BaseModel):
    produce_id: Optional[int] = None
    requirement_id: Optional[int] = None
    farmer_id: int
    buyer_id: int
    crop_name: str
    quantity: float
    price_per_kg: float
    pickup_date: str
    delivery_location: str
    payment_terms: str = "100% on Quality Confirmation"
    message: Optional[str] = None

class CounterOfferSchema(BaseModel):
    offer_id: int
    price_per_kg: float
    quantity: float
    message: Optional[str] = None

# Agreement Sign Schema
class SignAgreementSchema(BaseModel):
    accepted_tc: bool

# Slot Booking Schema
class BookSlotSchema(BaseModel):
    agreement_id: int
    slot_date: str
    time_window: str

# Quality Confirmation Schema
class QualityConfirmSchema(BaseModel):
    procurement_id: int
    received_quantity: float
    quality_received: str
    status: str # 'Accepted', 'Accepted with Adjustment', 'Rejected'
    adjustment_reason: Optional[str] = None

# Payment Schema
class ProcessPaymentSchema(BaseModel):
    procurement_id: int
    payment_method: str = "Direct Bank Transfer (Prototype Sandbox)"

# Rating Feedback Schema
class AddFeedbackSchema(BaseModel):
    transaction_id: int
    rating: int
    communication_rating: int = 5
    payment_reliability: int = 5
    quality_accuracy: int = 5
    pickup_reliability: int = 5
    professionalism: int = 5
    comments: Optional[str] = None

# Grievance Schema
class AddGrievanceSchema(BaseModel):
    category: str
    title: str
    description: str

# Assistant Schema
class AssistantQuerySchema(BaseModel):
    query: str
    language: str = "en"
