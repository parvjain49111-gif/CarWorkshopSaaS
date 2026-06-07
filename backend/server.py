from fastapi import FastAPI, APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import re
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
    photos_dict = (payload.photos.model_dump() if payload.photos else JobPhotos().model_dump())

    # Safety check: MongoDB hard-limits single docs to 16 MB. Refuse early with a clear message.
    photos_bytes = sum(len(v or "") for v in photos_dict.values())
    if photos_bytes > 12_000_000:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Photos too large ({photos_bytes // 1024 // 1024} MB). "
                "Re-take photos using the app's camera which auto-compresses, "
                "or pick a smaller image from gallery."
            ),
        )

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
        "photos": photos_dict,
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


@api_router.get("/jobs/export.xlsx")
async def export_jobs_xlsx(
    request: Request,
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
):
    """Export all jobs as a real Excel (.xlsx) workbook."""
    await get_current_user(request)
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

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

    wb = Workbook()
    ws = wb.active
    ws.title = "Workshop Jobs"

    headers = [
        "Job ID", "Created At", "Updated At", "Status",
        "Customer Name", "Phone", "Reference",
        "Car Name", "Car Number", "Model Year",
        "Customer Problems", "Mechanic Findings",
        "Parts Count", "Parts Total ₹", "Parts Detail",
        "Photos Count", "Front", "Back", "Left", "Right",
    ]
    ws.append(headers)
    header_fill = PatternFill("solid", fgColor="FFD600")
    header_font = Font(bold=True, color="000000")
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")

    for r in rows:
        parts = r.get("spare_parts") or []
        total_price = sum((p.get("price") or 0) * (p.get("quantity") or 1) for p in parts)
        parts_detail = " | ".join(
            f"{p.get('name')} x{p.get('quantity', 1)} ({p.get('status', 'pending')})" for p in parts
        )
        photos = r.get("photos") or {}
        photo_keys = ["front", "back", "left", "right"]
        photos_count = sum(1 for k in photo_keys if photos.get(k))
        ws.append([
            r.get("job_id", ""),
            r.get("created_at", ""),
            r.get("updated_at", ""),
            (r.get("status") or "").replace("_", " ").title(),
            r.get("customer_name", ""),
            r.get("customer_phone", "") or "",
            r.get("reference", "") or "",
            r.get("car_name", ""),
            r.get("car_number", ""),
            r.get("model_year", "") or "",
            r.get("customer_problems", "") or "",
            r.get("mechanic_findings", "") or "",
            len(parts),
            round(total_price, 2) if total_price else 0,
            parts_detail,
            photos_count,
            "Yes" if photos.get("front") else "",
            "Yes" if photos.get("back") else "",
            "Yes" if photos.get("left") else "",
            "Yes" if photos.get("right") else "",
        ])

    # Auto-size columns (cap at 50)
    widths = [12, 22, 22, 14, 22, 14, 16, 22, 14, 10, 40, 40, 10, 14, 50, 10, 8, 8, 8, 8]
    for idx, w in enumerate(widths, start=1):
        ws.column_dimensions[chr(64 + idx) if idx <= 26 else f"A{chr(64 + idx - 26)}"].width = w

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"workshop_jobs_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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


@api_router.get("/analytics")
async def get_analytics(request: Request):
    """Founder-level KPIs: trends, brands, issues, references, revenue, turnaround."""
    await get_current_user(request)
    jobs = await db.jobs.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=10000)
    now = datetime.now(timezone.utc)

    # ----- Status counts
    status_counts = {"pending": 0, "in_progress": 0, "completed": 0}
    for j in jobs:
        s = j.get("status") or "pending"
        if s in status_counts:
            status_counts[s] += 1

    # ----- Time windows (7d / 30d)
    def parse_dt(s):
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    in_7d = 0
    in_30d = 0
    daily_buckets: dict = {}  # last 14 days
    for j in jobs:
        d = parse_dt(j.get("created_at", ""))
        if not d:
            continue
        delta_days = (now - d).days
        if delta_days <= 7:
            in_7d += 1
        if delta_days <= 30:
            in_30d += 1
        if delta_days <= 13:
            key = d.strftime("%Y-%m-%d")
            daily_buckets[key] = daily_buckets.get(key, 0) + 1

    # Last 14 daily series ordered ascending
    daily_series = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_series.append({"date": day, "count": daily_buckets.get(day, 0)})

    # ----- Brand breakdown (first token of car_name)
    brand_counts: dict = {}
    for j in jobs:
        car_name = (j.get("car_name") or "").strip()
        if not car_name:
            continue
        brand = car_name.split()[0].title()
        brand_counts[brand] = brand_counts.get(brand, 0) + 1
    brands = sorted(
        [{"label": k, "count": v} for k, v in brand_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    # ----- Reference (referral source) breakdown
    ref_counts: dict = {}
    for j in jobs:
        ref = (j.get("reference") or "").strip()
        if not ref:
            ref = "Walk-in"
        ref_counts[ref] = ref_counts.get(ref, 0) + 1
    references = sorted(
        [{"label": k, "count": v} for k, v in ref_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    # ----- Issue keywords (top words from customer_problems)
    STOP = {
        "the","a","an","is","it","of","to","in","on","and","or","with","my","for",
        "i","me","not","but","at","by","be","this","that","has","have","had","car",
        "from","as","so","very","when","its","while","also","please","sir","need",
        "needs","getting","got","showing","problem","problems","issue","issues",
        "vehicle","there","they","their","your","you","we","us","am","are","was",
        "were","do","does","done","just","only","than","then","into","out","up",
        "down","some","any","all","more","most","less","still","again",
    }
    word_counts: dict = {}
    for j in jobs:
        text = (j.get("customer_problems") or "").lower()
        for w in re.split(r"[^a-z]+", text):
            if len(w) < 3 or w in STOP:
                continue
            word_counts[w] = word_counts.get(w, 0) + 1
    issues = sorted(
        [{"label": k.title(), "count": v} for k, v in word_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    # ----- Revenue (sum of spare parts qty*price across all jobs)
    revenue_total = 0.0
    revenue_completed = 0.0
    parts_total = 0
    for j in jobs:
        for p in j.get("spare_parts") or []:
            price = p.get("price") or 0
            qty = p.get("quantity") or 1
            revenue_total += price * qty
            parts_total += qty
            if j.get("status") == "completed":
                revenue_completed += price * qty

    # ----- Avg turnaround for completed jobs (hours)
    durations = []
    for j in jobs:
        if j.get("status") != "completed":
            continue
        c = parse_dt(j.get("created_at", ""))
        u = parse_dt(j.get("updated_at", ""))
        if c and u and u > c:
            durations.append((u - c).total_seconds() / 3600.0)
    avg_turnaround_hours = round(sum(durations) / len(durations), 1) if durations else None

    # ----- Top returning customers (by customer_name)
    customer_counts: dict = {}
    for j in jobs:
        name = (j.get("customer_name") or "").strip()
        if not name:
            continue
        customer_counts[name] = customer_counts.get(name, 0) + 1
    top_customers = sorted(
        [{"label": k, "count": v} for k, v in customer_counts.items() if v > 1],
        key=lambda x: x["count"],
        reverse=True,
    )[:6]

    # ----- Mechanic workload (assigned_mechanic)
    mech_counts: dict = {}
    for j in jobs:
        m = (j.get("assigned_mechanic") or "").strip()
        if not m:
            continue
        mech_counts[m] = mech_counts.get(m, 0) + 1
    mechanics = sorted(
        [{"label": k, "count": v} for k, v in mech_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:6]

    # ----- Employee performance (who logged what)
    user_ids = list({j.get("created_by") for j in jobs if j.get("created_by")})
    name_map: dict = {}
    if user_ids:
        async for u in db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1}):
            name_map[u["user_id"]] = {
                "name": u.get("name") or u.get("email") or u["user_id"],
                "role": u.get("role", "mechanic"),
            }
    emp_counts: dict = {}
    for j in jobs:
        uid = j.get("created_by")
        if not uid:
            continue
        d = emp_counts.setdefault(uid, {"intake": 0, "pending": 0, "in_progress": 0, "completed": 0, "today": 0, "week": 0, "month": 0})
        d["intake"] += 1
        s = j.get("status") or "pending"
        if s in ("pending", "in_progress", "completed"):
            d[s] += 1
        cdt = parse_dt(j.get("created_at", ""))
        if cdt:
            delta = (now - cdt).days
            if delta < 1:
                d["today"] += 1
            if delta <= 7:
                d["week"] += 1
            if delta <= 30:
                d["month"] += 1
    employees = []
    for uid, d in emp_counts.items():
        info = name_map.get(uid, {"name": uid, "role": "mechanic"})
        employees.append({
            "user_id": uid,
            "name": info["name"],
            "role": info["role"],
            **d,
        })
    employees.sort(key=lambda x: x["intake"], reverse=True)

    return {
        "total_jobs": len(jobs),
        "status_counts": status_counts,
        "intake_7d": in_7d,
        "intake_30d": in_30d,
        "daily_series": daily_series,
        "brands": brands,
        "references": references,
        "issues": issues,
        "revenue_total": round(revenue_total, 2),
        "revenue_completed": round(revenue_completed, 2),
        "parts_total": parts_total,
        "avg_turnaround_hours": avg_turnaround_hours,
        "completed_count": status_counts.get("completed", 0),
        "top_customers": top_customers,
        "mechanics": mechanics,
        "employees": employees,
        "unique_customers": len({(j.get("customer_name") or "").strip() for j in jobs if j.get("customer_name")}),
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
