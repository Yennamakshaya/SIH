from fastapi import APIRouter
from app.schemas import AssistantQuerySchema

router = APIRouter(prefix="/api/assistant", tags=["Kisan Assistant"])

@router.post("/query")
def kisan_assistant_query(payload: AssistantQuerySchema):
    q = payload.query.lower().strip()
    lang = payload.language.lower()

    # Intent 1: Price Check
    if "price" in q or "ధర" in q or "ભાવ" in q or "भाव" in q or "rate" in q or "tomato" in q or "టమాటా" in q or "टमाटर" in q:
        if lang == "te" or "ధర" in q:
            ans = "ఈ రోజు బోవెన్‌పల్లి మార్కెట్‌లో టమాటా ధర ₹25/కిలో నుండి ₹31/కిలో వరకు ఉంది. సగటు ధర ₹28/కిలో."
        elif lang == "hi" or "भाव" in q:
            ans = "आज बोवेनपल्ली मंडी में टमाटर का भाव ₹25/किग्रा से ₹31/किग्रा है। औसत भाव ₹28/किग्रा है।"
        else:
            ans = "Today's Tomato price in Bowenpally Market ranges from ₹25/kg to ₹31/kg. Modal market rate is ₹28/kg."
        
        return {"answer": ans, "intent": "market_price", "label": "Kisan Assistant — Prototype"}

    # Intent 2: Best Buyer / Smart Recommendation
    if "buyer" in q or "కొనుగోలుదారు" in q or "खरीदार" in q or "best" in q or "మంచి" in q or "अच्छा" in q:
        if lang == "te" or "కొనుగోలుదారు" in q:
            ans = "హైదరాబాద్‌కు చెందిన 'శ్రీ ఫుడ్స్ ప్రైవేట్ లిమిటెడ్' (విశ్వసనీయత 94%) టమాటాకు అత్యధిక నికర ఆదాయం ₹14,000 (₹31/కిలో) అందిస్తోంది. AI స్కోర్: 91/100."
        elif lang == "hi" or "खरीदार" in q:
            ans = "हैदराबाद के 'श्री फूड्स प्राइवेट लिमिटेड' (विश्वसनीयता 94%) टमाटर के लिए परिवहन के बाद उच्चतम शुद्ध आय ₹14,000 (₹31/किग्रा) दे रहे हैं। AI स्कोर: 91/100।"
        else:
            ans = "Shree Foods Pvt Ltd (Hyderabad, Reliability 94%) is recommended for Tomatoes. Offered price ₹31/kg with highest estimated net realisation of ₹14,000 (AI Score: 91/100)."

        return {"answer": ans, "intent": "best_buyer", "label": "Kisan Assistant — Prototype"}

    # Intent 3: Net Realisation Calculation
    if "net" in q or "income" in q or "నికర" in q or "शुद्ध" in q or "realisation" in q:
        if lang == "te":
            ans = "నికర ఆదాయం లెక్క: అమ్మకపు ధర × పరిమాణం - (రవాణా ఖర్చు + నిల్వ ఖర్చు). ఉదాహరణకు: 500 కిలోలు × ₹31 = ₹15,500 గారస్, రవాణా ₹1,500 తీసివేస్తే నికర ఆదాయం = ₹14,000 (₹28/కిలో)."
        elif lang == "hi":
            ans = "शुद्ध आय गणना: बिक्री मूल्य × मात्रा - (परिवहन लागत + भंडारण लागत)। उदाहरण: 500 किग्रा × ₹31 = ₹15,500 सकल मूल्य, ₹1,500 परिवहन घटाकर शुद्ध आय = ₹14,000 (₹28/किग्रा)।"
        else:
            ans = "Net Realisation = Gross Value - (Transport + Storage Costs). Example: 500 kg × ₹31/kg = ₹15,500 Gross. Minus ₹1,500 Transport = ₹14,000 Net Realisation (Net ₹28/kg)."

        return {"answer": ans, "intent": "net_realisation", "label": "Kisan Assistant — Prototype"}

    # Intent 4: How to Add Produce
    if "add produce" in q or "సరుకు" in q or "फसल" in q or "how to" in q:
        if lang == "te":
            ans = "సరుకు జోడించడానికి: Farmer Dashboard -> 'My Produce' -> 'Add Produce' బటన్ క్లిక్ చేయండి. పంట పేరు, పరిమాణం, రకం, గ్రేడ్ మరియు ఫోటో అప్‌లోడ్ చేసి సేవ్ చేయండి."
        elif lang == "hi":
            ans = "फसल जोड़ने के लिए: Farmer Dashboard -> 'My Produce' -> 'Add Produce' बटन पर क्लिक करें। फसल का नाम, मात्रा, ग्रेड और फोटो अपलोड करके सेव करें।"
        else:
            ans = "To add produce: Go to Farmer Dashboard -> Click 'My Produce' -> Click 'Add Produce'. Fill crop details, quality grade, expected price, upload crop image and click Save."

        return {"answer": ans, "intent": "add_produce_guide", "label": "Kisan Assistant — Prototype"}

    # Intent 5: How to Book Slot
    if "slot" in q or "book" in q or "స్లాట్" in q or "स्लॉट" in q:
        if lang == "te":
            ans = "స్లాట్ బుకింగ్: అగ్రిమెంట్ సంతకం పూర్తయిన తర్వాత 'Book Procurement Slot' స్క్రీన్ తెరుచుకుంటుంది. మీకు వీలైన తేదీ మరియు సమయం ఎంచుకుని స్లాట్ బుక్ చేయండి."
        elif lang == "hi":
            ans = "स्लॉट बुकिंग: एग्रीमेंट साइन होने के बाद 'Book Procurement Slot' स्क्रीन पर जाएं। अपनी सुविधा अनुसार तारीख और समय चुनकर स्लॉट बुक करें।"
        else:
            ans = "To book a procurement slot: Once the digital agreement is signed, open 'Book Procurement Slot', pick your preferred date and time window (e.g. 10:00 AM - 12:00 PM), and click Confirm."

        return {"answer": ans, "intent": "slot_booking_guide", "label": "Kisan Assistant — Prototype"}

    # Default fallback
    if lang == "te":
        ans = "నేను కిసాన్ అసిస్టెంట్. నేను మీకు మార్కెట్ ధరలు, కొనుగోలుదారుల వివరాలు, నికర ఆదాయం మరియు స్లాట్ బుకింగ్‌లో సహాయపడగలను."
    elif lang == "hi":
        ans = "मैं किसान असिस्टेंट हूँ। मैं आपको बाजार भाव, खरीदार जानकारी, शुद्ध आय और स्लॉट बुकिंग में मदद कर सकता हूँ।"
    else:
        ans = "I am Kisan Assistant! Ask me about today's crop market prices, recommended buyers, net realisation calculations, or how to book procurement slots."

    return {"answer": ans, "intent": "general", "label": "Kisan Assistant — Prototype"}
