from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import logging
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import requests
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from emergentintegrations.llm.chat import LlmChat, UserMessage

# ------------------------------------------------------------------ setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

app = FastAPI(title="OMNIS Earth Intelligence")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("omnis")


# ------------------------------------------------------------------ auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ------------------------------------------------------------------ models
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = ""


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class LocationInput(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: Optional[str] = ""


class AnalyzeInput(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: Optional[str] = ""


# ------------------------------------------------------------------ auth endpoints
@api_router.post("/auth/register")
async def register(data: RegisterInput):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "password_hash": hash_password(data.password),
           "name": data.name or email.split("@")[0], "role": "user",
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    return {"token": token, "user": {"id": uid, "email": email, "name": doc["name"], "role": "user"}}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    return {"token": token, "user": {"id": uid, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")}}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ------------------------------------------------------------------ geocoding
@api_router.get("/geocode")
async def geocode(q: str):
    if not q or len(q.strip()) < 2:
        return {"results": []}

    def _fetch():
        r = requests.get("https://geocoding-api.open-meteo.com/v1/search",
                         params={"name": q, "count": 8, "language": "en", "format": "json"}, timeout=15)
        r.raise_for_status()
        return r.json()

    try:
        data = await asyncio.to_thread(_fetch)
    except Exception as e:
        logger.error(f"geocode error: {e}")
        raise HTTPException(status_code=502, detail="Geocoding service unavailable")
    results = []
    for it in data.get("results", []):
        results.append({
            "name": it.get("name"),
            "latitude": it.get("latitude"),
            "longitude": it.get("longitude"),
            "country": it.get("country", ""),
            "admin1": it.get("admin1", ""),
            "population": it.get("population"),
        })
    return {"results": results}


# ------------------------------------------------------------------ data fusion (Open-Meteo)
WEATHER_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
    55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Heavy freezing rain", 71: "Slight snow", 73: "Moderate snow",
    75: "Heavy snow", 80: "Slight rain showers", 81: "Moderate rain showers",
    82: "Violent rain showers", 95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm w/ hail",
}


def fetch_fusion(lat: float, lon: float) -> dict:
    weather = requests.get("https://api.open-meteo.com/v1/forecast", params={
        "latitude": lat, "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure,cloud_cover",
        "hourly": "precipitation,precipitation_probability",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
        "past_days": 7, "forecast_days": 7, "timezone": "auto",
    }, timeout=20).json()

    air = requests.get("https://air-quality-api.open-meteo.com/v1/air-quality", params={
        "latitude": lat, "longitude": lon,
        "current": "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide",
        "timezone": "auto",
    }, timeout=20).json()

    daily = weather.get("daily", {})
    dates = daily.get("time", [])
    precip = daily.get("precipitation_sum", []) or []
    # split past 7 vs next 7 around "today" index
    today = weather.get("current", {}).get("time", "")[:10]
    idx = dates.index(today) if today in dates else 7
    past_rain = [p for p in precip[:idx] if p is not None]
    future_rain = [p for p in precip[idx:] if p is not None]

    cur = weather.get("current", {})
    code = cur.get("weather_code")
    return {
        "elevation_m": weather.get("elevation"),
        "timezone": weather.get("timezone"),
        "current": {
            "time": cur.get("time"),
            "temperature_c": cur.get("temperature_2m"),
            "apparent_temperature_c": cur.get("apparent_temperature"),
            "humidity_pct": cur.get("relative_humidity_2m"),
            "precipitation_mm": cur.get("precipitation"),
            "weather": WEATHER_CODES.get(code, "Unknown"),
            "wind_speed_kmh": cur.get("wind_speed_10m"),
            "surface_pressure_hpa": cur.get("surface_pressure"),
            "cloud_cover_pct": cur.get("cloud_cover"),
        },
        "rainfall": {
            "past_7d_total_mm": round(sum(past_rain), 1),
            "next_7d_total_mm": round(sum(future_rain), 1),
            "next_max_daily_prob_pct": max([x for x in (daily.get("precipitation_probability_max") or [])[idx:] if x is not None], default=None),
            "daily_dates": dates,
            "daily_precip_mm": precip,
        },
        "temperature_trend": {
            "daily_max_c": daily.get("temperature_2m_max", []),
            "daily_min_c": daily.get("temperature_2m_min", []),
        },
        "air_quality": {
            "us_aqi": air.get("current", {}).get("us_aqi"),
            "pm2_5": air.get("current", {}).get("pm2_5"),
            "pm10": air.get("current", {}).get("pm10"),
            "ozone": air.get("current", {}).get("ozone"),
            "no2": air.get("current", {}).get("nitrogen_dioxide"),
            "time": air.get("current", {}).get("time"),
        },
    }


def env_score(fusion: dict) -> dict:
    """Composite 0-100 environmental score (higher = better)."""
    aqi = fusion["air_quality"].get("us_aqi")
    temp = fusion["current"].get("apparent_temperature_c")
    flood = fusion["rainfall"].get("next_7d_total_mm") or 0
    score = 100.0
    if aqi is not None:
        score -= min(aqi, 300) / 300 * 45
    if temp is not None:
        if temp > 32:
            score -= min((temp - 32) * 2.5, 25)
        elif temp < 0:
            score -= min((0 - temp) * 1.5, 15)
    score -= min(flood / 150 * 30, 30)
    score = max(0, min(100, round(score)))
    if score >= 75:
        band = "Good"
    elif score >= 50:
        band = "Moderate"
    elif score >= 30:
        band = "Poor"
    else:
        band = "Severe"
    return {"score": score, "band": band}


# ------------------------------------------------------------------ AI reasoning
REASONING_SYSTEM = """You are OMNIS, an Earth Intelligence reasoning engine. You receive fused, timestamped open environmental data for a geographic location (weather, rainfall history + forecast, air quality, elevation/terrain). Your job is to turn raw data into understandable, evidence-backed decisions for researchers, engineers, disaster-management teams, businesses and ordinary people.

You MUST reason strictly from the provided data. Never invent numbers. Every prediction must cite the concrete data signals that support it. Assign an honest confidence (0-100) reflecting data strength and ambiguity.

Return ONLY valid minified JSON (no markdown, no prose outside JSON) with EXACTLY this schema:
{
  "what_is_happening": "2-3 sentence plain-language description of the current situation using the data.",
  "what_changed": "2-3 sentences on notable recent change vs the past 7 days (rainfall, temp, air quality).",
  "why_changed": "2-3 sentences of plausible physical/meteorological explanation grounded in the signals.",
  "predictions": [
     {"title": "short label e.g. Flood risk", "outlook": "one clear sentence prediction",
      "risk_level": "Low|Moderate|High|Severe", "confidence": 0-100,
      "evidence": ["signal 1 with value", "signal 2 with value"],
      "sources": ["Open-Meteo Forecast API", "Open-Meteo Air Quality API"]}
  ],
  "headline": "one punchy sentence summarizing the location's state"
}
Include 2 to 4 predictions. Always include a flood/rainfall risk prediction and an air-quality/health prediction when data exists."""


async def run_reasoning(location: dict, fusion: dict, score: dict) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"omnis-{location['latitude']}-{location['longitude']}",
        system_message=REASONING_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-6")

    payload = {"location": location, "environmental_score": score, "fused_data": fusion}
    msg = UserMessage(text="Analyze this location and return the JSON report.\n\nDATA:\n" + json.dumps(payload, default=str))
    resp = await chat.send_message(msg)
    text = resp if isinstance(resp, str) else str(resp)
    # extract JSON
    m = re.search(r"\{.*\}", text, re.DOTALL)
    raw = m.group(0) if m else text
    try:
        return json.loads(raw)
    except Exception as e:
        logger.error(f"reasoning parse error: {e} :: {text[:400]}")
        return {
            "what_is_happening": "Live data was fused but the reasoning layer returned an unstructured response.",
            "what_changed": "", "why_changed": "",
            "predictions": [], "headline": "Analysis incomplete", "_raw": text[:1000],
        }


@api_router.post("/analyze")
async def analyze(data: AnalyzeInput):
    location = {"name": data.name, "latitude": data.latitude, "longitude": data.longitude, "country": data.country}
    try:
        fusion = await asyncio.to_thread(fetch_fusion, data.latitude, data.longitude)
    except Exception as e:
        logger.error(f"fusion error: {e}")
        raise HTTPException(status_code=502, detail="Environmental data sources unavailable")
    score = env_score(fusion)
    report = await run_reasoning(location, fusion, score)
    return {
        "location": location,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_timestamp": fusion["current"].get("time"),
        "environmental_score": score,
        "fusion": fusion,
        "report": report,
        "sources": ["Open-Meteo Forecast API", "Open-Meteo Air Quality API", "Anthropic Claude Sonnet 4.6"],
    }


# ------------------------------------------------------------------ saved locations
@api_router.get("/locations")
async def list_locations(user: dict = Depends(get_current_user)):
    docs = await db.locations.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [{"id": str(d["_id"]), "name": d["name"], "latitude": d["latitude"],
             "longitude": d["longitude"], "country": d.get("country", "")} for d in docs]


@api_router.post("/locations")
async def add_location(data: LocationInput, user: dict = Depends(get_current_user)):
    doc = {"user_id": user["id"], "name": data.name, "latitude": data.latitude,
           "longitude": data.longitude, "country": data.country,
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.locations.insert_one(doc)
    return {"id": str(res.inserted_id), **{k: doc[k] for k in ("name", "latitude", "longitude", "country")}}


@api_router.delete("/locations/{loc_id}")
async def delete_location(loc_id: str, user: dict = Depends(get_current_user)):
    await db.locations.delete_one({"_id": ObjectId(loc_id), "user_id": user["id"]})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "OMNIS Earth Intelligence API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@omnis.earth").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "omnis123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_pw),
                                   "name": "OMNIS Admin", "role": "admin",
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
