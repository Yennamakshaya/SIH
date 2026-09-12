import numpy as np

def calculate_net_realisation(quantity: float, price_per_kg: float, transport_cost: float = 1500.0, storage_cost: float = 0.0, other_costs: float = 0.0):
    gross_value = quantity * price_per_kg
    total_deductions = transport_cost + storage_cost + other_costs
    net_realisation = max(0.0, gross_value - total_deductions)
    net_price_per_kg = net_realisation / quantity if quantity > 0 else 0.0
    return {
        "gross_value": round(gross_value, 2),
        "total_deductions": round(total_deductions, 2),
        "transport_cost": round(transport_cost, 2),
        "storage_cost": round(storage_cost, 2),
        "other_costs": round(other_costs, 2),
        "net_realisation": round(net_realisation, 2),
        "net_price_per_kg": round(net_price_per_kg, 2)
    }

def score_buyer_for_farmer(buyer_data: dict, produce_data: dict, distance_km: float = 45.0) -> dict:
    """
    Ranks buyer based on:
    - Net Realisation (40%)
    - Offered Price (20%)
    - Buyer Reliability (15%)
    - Distance (10%)
    - Demand (10%)
    - Transaction History (5%)
    """
    qty = produce_data.get("quantity", 500.0)
    offered_price = buyer_data.get("offered_price", 31.0)
    
    # Calculate transport cost dynamically (e.g. ₹30/km base estimate)
    transport_cost = distance_km * 30.0
    net = calculate_net_realisation(qty, offered_price, transport_cost=transport_cost)
    
    # Normalize components (0 to 100)
    # Net realisation score relative to ₹30/kg baseline
    benchmark_gross = qty * 30.0
    net_score = min(100.0, (net["net_realisation"] / benchmark_gross) * 100.0 if benchmark_gross > 0 else 50.0)
    
    price_score = min(100.0, (offered_price / 35.0) * 100.0)
    reliability_score = buyer_data.get("reliability_score", 94.0)
    
    # Distance score: closer is higher score (100km max scale)
    distance_score = max(0.0, 100.0 - (distance_km * 0.8))
    
    demand_score = buyer_data.get("demand_score", 90.0)
    tx_history_score = min(100.0, buyer_data.get("completed_transactions", 20) * 4.0)
    
    composite_score = (
        (net_score * 0.40) +
        (price_score * 0.20) +
        (reliability_score * 0.15) +
        (distance_score * 0.10) +
        (demand_score * 0.10) +
        (tx_history_score * 0.05)
    )
    
    score_int = int(round(composite_score))
    
    explanation_en = f"Recommended score {score_int}/100 because this buyer offers ₹{offered_price}/kg yielding high estimated net realisation of ₹{net['net_realisation']:,} after transport costs."
    explanation_te = f"ఈ కొనుగోలుదారు ₹{offered_price}/కిలో ఆఫర్ చేస్తున్నారు, రవాణా ఖర్చుల తర్వాత నికర ఆదాయం ₹{net['net_realisation']:,} ఇస్తారు (స్కోరు {score_int}/100)."
    explanation_hi = f"यह खरीददार ₹{offered_price}/किग्रा का प्रस्ताव दे रहा है, जिससे परिवहन लागत के बाद ₹{net['net_realisation']:,} की शुद्ध आय प्राप्त होती है (स्कोर {score_int}/100)।"
    
    return {
        "score": score_int,
        "offered_price": offered_price,
        "estimated_net_realisation": net["net_realisation"],
        "net_price_per_kg": net["net_price_per_kg"],
        "transport_cost": net["transport_cost"],
        "distance_km": distance_km,
        "reliability_score": reliability_score,
        "explanation": {
            "en": explanation_en,
            "te": explanation_te,
            "hi": explanation_hi
        },
        "badge": "Prototype AI Recommendation"
    }

def score_farmer_for_buyer(farmer_data: dict, req_data: dict, distance_km: float = 45.0) -> dict:
    """
    Ranks farmer for buyers based on crop match, quality, quantity, price, distance, and reliability.
    """
    qty = farmer_data.get("quantity", 500.0)
    price = farmer_data.get("price", 30.0)
    quality = farmer_data.get("quality", "Grade A")
    reliability = farmer_data.get("reliability_score", 95.0)
    
    quality_mult = 1.0 if quality == "Premium" else (0.95 if quality == "Grade A" else 0.85)
    match_score = int(round(min(100.0, (reliability * 0.4) + (quality_mult * 50.0) + (10.0 if distance_km < 50 else 5.0))))
    
    return {
        "match_score": match_score,
        "available_quantity": qty,
        "quality": quality,
        "expected_price": price,
        "distance_km": distance_km,
        "reliability": reliability,
        "explanation": f"High match ({match_score}%): {quality} quality available at ₹{price}/kg within {distance_km} km."
    }
