from fastapi import FastAPI, APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ----------------- Models -----------------
class SessionRequest(BaseModel):
    session_id: str


class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "owner"


class JobPhotos(BaseModel):
    front: Optional[str] = None  # base64 data URI
    back: Optional[str] = None
    left: Optional[str] = None
    right: Optional[str] = None


class SparePart(BaseModel):
    name: str
    quantity: int = 1
    price: Optional[float] = None
    status: Literal["pending", "ordered", "installed"] = "pending"


class JobCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    car_name: str
    car_number: str
    model_year: Optional[str] = None
    reference: Optional[str] = None
    customer_problems: str
    photos: Optional[JobPhotos] = None


class JobUpdate(BaseModel):
    status: Optional[Literal["pending", "in_progress", "completed"]] = None
    mechanic_findings: Optional[str] = None
    spare_parts: Optional[List[SparePart]] = None
    assigned_mechanic: Optional[str] = None
    estimated_cost: Optional[float] = None


class Job(BaseModel):
    job_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    car_name: str
    car_number: str
    model_year: Optional[str] = None
    reference: Optional[str] = None
    customer_problems: str
    mechanic_findings: Optional[str] = None
    spare_parts: List[SparePart] = []
    photos: JobPhotos = JobPhotos()
    status: str = "pending"
    assigned_mechanic: Optional[str] = None
    estimated_cost: Optional[float] = None
    created_by: str
    created_at: str
    updated_at: str


# ----------------- Auth helpers -----------------
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth_header.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ----------------- Auth Routes -----------------
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest):
    """Exchange Emergent session_id for an app session_token."""
    async with httpx.AsyncClient(timeout=20.0) as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = resp.json()
    email = data["email"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = existing.get("role", "owner")
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name")),
                      "picture": data.get("picture", existing.get("picture"))}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        # first user becomes owner, rest mechanic
        count = await db.users.count_documents({})
        role = "owner" if count == 0 else "mechanic"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {
        "session_token": session_token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "role": role,
        },
    }


@api_router.get("/auth/me", response_model=UserOut)
async def auth_me(request: Request):
    user = await get_current_user(request)
    return UserOut(**user)


@api_router.post("/auth/logout")
async def auth_logout(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ----------------- Job Routes -----------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@api_router.post("/jobs", response_model=Job)
async def create_job(payload: JobCreate, request: Request):
    user = await get_current_user(request)
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    now = _now_iso()
    doc = {
        "job_id": job_id,
        "customer_name": payload.customer_name,
        "customer_phone": payload.customer_phone,
        "car_name": payload.car_name,
        "car_number": payload.car_number.upper().strip(),
        "model_year": payload.model_year,
        "reference": payload.reference,
        "customer_problems": payload.customer_problems,
        "mechanic_findings": None,
        "spare_parts": [],
        "photos": (payload.photos.model_dump() if payload.photos else JobPhotos().model_dump()),
        "status": "pending",
        "assigned_mechanic": None,
        "estimated_cost": None,
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.jobs.insert_one(doc)
    doc.pop("_id", None)
    return Job(**doc)


@api_router.get("/jobs", response_model=List[Job])
async def list_jobs(
    request: Request,
    q: Optional[str] = Query(None, description="Search by car number or customer name"),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = 200,
):
    await get_current_user(request)
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if q:
        query["$or"] = [
            {"car_number": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"car_name": {"$regex": q, "$options": "i"}},
        ]
    if date_from or date_to:
        rng: dict = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to
        query["created_at"] = rng

    cursor = db.jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return [Job(**i) for i in items]


@api_router.get("/jobs/export.csv")
async def export_jobs_csv(
    request: Request,
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
):
    """Export all jobs as CSV (photos excluded, only flagged)."""
    await get_current_user(request)
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if q:
        query["$or"] = [
            {"car_number": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"car_name": {"$regex": q, "$options": "i"}},
        ]
    rows = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=10000)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "job_id", "created_at", "updated_at", "status",
        "customer_name", "customer_phone", "reference",
        "car_name", "car_number", "model_year",
        "customer_problems", "mechanic_findings",
        "spare_parts_count", "spare_parts_total_price",
        "spare_parts_detail",
        "photos_count", "photo_front", "photo_back", "photo_left", "photo_right",
    ])
    for r in rows:
        parts = r.get("spare_parts") or []
        total_price = sum(
            (p.get("price") or 0) * (p.get("quantity") or 1) for p in parts
        )
        parts_detail = " | ".join(
            f"{p.get('name')} x{p.get('quantity',1)} ({p.get('status','pending')})"
            for p in parts
        )
        photos = r.get("photos") or {}
        photo_keys = ["front", "back", "left", "right"]
        photos_count = sum(1 for k in photo_keys if photos.get(k))
        writer.writerow([
            r.get("job_id", ""),
            r.get("created_at", ""),
            r.get("updated_at", ""),
            r.get("status", ""),
            r.get("customer_name", ""),
            r.get("customer_phone", "") or "",
            r.get("reference", "") or "",
            r.get("car_name", ""),
            r.get("car_number", ""),
            r.get("model_year", "") or "",
            r.get("customer_problems", "") or "",
            r.get("mechanic_findings", "") or "",
            len(parts),
            f"{total_price:.2f}" if total_price else "",
            parts_detail,
            photos_count,
            "yes" if photos.get("front") else "",
            "yes" if photos.get("back") else "",
            "yes" if photos.get("left") else "",
            "yes" if photos.get("right") else "",
        ])

    csv_bytes = buf.getvalue().encode("utf-8")
    filename = f"workshop_jobs_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str, request: Request):
    await get_current_user(request)
    doc = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return Job(**doc)


@api_router.patch("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, payload: JobUpdate, request: Request):
    await get_current_user(request)
    update: dict = {"updated_at": _now_iso()}
    if payload.status is not None:
        update["status"] = payload.status
    if payload.mechanic_findings is not None:
        update["mechanic_findings"] = payload.mechanic_findings
    if payload.spare_parts is not None:
        update["spare_parts"] = [sp.model_dump() for sp in payload.spare_parts]
    if payload.assigned_mechanic is not None:
        update["assigned_mechanic"] = payload.assigned_mechanic
    if payload.estimated_cost is not None:
        update["estimated_cost"] = payload.estimated_cost

    res = await db.jobs.update_one({"job_id": job_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    doc = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    return Job(**doc)


@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can delete jobs")
    res = await db.jobs.delete_one({"job_id": job_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


@api_router.get("/stats")
async def get_stats(request: Request):
    await get_current_user(request)
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    rows = await db.jobs.aggregate(pipeline).to_list(length=10)
    counts = {r["_id"]: r["count"] for r in rows}
    total = sum(counts.values())
    # recent jobs (last 5)
    recent_cursor = db.jobs.find({}, {"_id": 0}).sort("created_at", -1).limit(5)
    recent = await recent_cursor.to_list(length=5)
    return {
        "total": total,
        "pending": counts.get("pending", 0),
        "in_progress": counts.get("in_progress", 0),
        "completed": counts.get("completed", 0),
        "recent": recent,
    }


@api_router.get("/")
async def root():
    return {"service": "WorkshopOps API", "status": "ok"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def setup_indexes():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.jobs.create_index("job_id", unique=True)
        await db.jobs.create_index("car_number")
        await db.jobs.create_index("status")
        await db.jobs.create_index([("created_at", -1)])
    except Exception as e:
        logger.warning(f"Index setup warning: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
