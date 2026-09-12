from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import datetime
import random
from app.database import get_db
from app.models import Market, MarketPrice

router = APIRouter(prefix="/api/market", tags=["Market Data"])

@router.get("/prices")
def get_market_prices(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MarketPrice).join(Market)
    if crop:
        query = query.filter(MarketPrice.crop_name.ilike(f"%{crop}%"))
    if district:
        query = query.filter(Market.district.ilike(f"%{district}%"))
        
    prices = query.all()
    result = []
    for p in prices:
        market = db.query(Market).filter(Market.id == p.market_id).first()
        result.append({
            "id": p.id,
            "crop_name": p.crop_name,
            "market_name": market.name if market else "Telangana APMC Market",
            "location": f"{market.location}, {market.district}, Telangana" if market else "Telangana",
            "district": market.district if market else "Telangana",
            "min_price": p.min_price,
            "max_price": p.max_price,
            "modal_price": p.modal_price,
            "avg_price": p.avg_price,
            "price_change": p.price_change,
            "price_date": p.price_date,
            "data_source": p.data_source
        })
    return result

@router.get("/history")
def get_price_history(
    crop: str = "Tomato",
    market_name: str = "Bowenpally Market",
    timeframe: str = "30 Days" # '7 Days', '30 Days', '3 Months', '6 Months'
):
    num_days = 30
    if timeframe == "7 Days":
        num_days = 7
    elif timeframe == "3 Months":
        num_days = 90
    elif timeframe == "6 Months":
        num_days = 180

    base_prices = {
        "Tomato": 28.0,
        "Paddy": 23.5,
        "Cotton": 70.0,
        "Maize": 20.5,
        "Chilli": 190.0,
        "Turmeric": 140.0
    }
    base = base_prices.get(crop, 28.0)
    
    today = datetime.date.today()
    chart_data = []
    
    # Generate realistic historical price curve
    prices_list = []
    for i in range(num_days - 1, -1, -1):
        dt = today - datetime.timedelta(days=i)
        # Sine wave + small random fluctuation for realistic trend
        fluc = (np_sin(i * 0.15) * 3.5) + (random.uniform(-1.0, 1.0))
        price = round(max(10.0, base + fluc), 1)
        prices_list.append(price)
        chart_data.append({
            "date": dt.strftime("%b %d"),
            "price": price,
            "modal_price": price,
            "min_price": round(price * 0.88, 1),
            "max_price": round(price * 1.12, 1)
        })

    current_price = prices_list[-1]
    previous_price = prices_list[-2] if len(prices_list) > 1 else current_price
    highest_price = max(prices_list)
    lowest_price = min(prices_list)
    average_price = round(sum(prices_list) / len(prices_list), 1)
    trend = "upward" if current_price >= previous_price else "downward"

    return {
        "crop": crop,
        "market": market_name,
        "timeframe": timeframe,
        "current_price": current_price,
        "previous_price": previous_price,
        "highest_price": highest_price,
        "lowest_price": lowest_price,
        "average_price": average_price,
        "trend": trend,
        "disclaimer": "Price trends are informational and do not guarantee future prices. Source: Demo Market Data.",
        "history": chart_data
    }

def np_sin(x):
    import math
    return math.sin(x)
