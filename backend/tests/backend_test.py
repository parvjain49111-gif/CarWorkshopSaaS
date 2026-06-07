"""WorkshopOps backend API test suite.

Covers:
- Health / root
- Auth gate (/api/auth/me, /api/auth/session invalid)
- Jobs CRUD (create, list w/ filters, get, patch status flow, delete)
- Stats
- Role-based delete (owner vs mechanic)
- Mongo ObjectId leak check
"""
import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Use frontend public backend URL (what users hit)
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

OWNER_TOKEN = "test-owner-token-001"
MECH_TOKEN = "test-mech-token-001"

OWNER_HDR = {"Authorization": f"Bearer {OWNER_TOKEN}", "Content-Type": "application/json"}
MECH_HDR = {"Authorization": f"Bearer {MECH_TOKEN}", "Content-Type": "application/json"}


# ---- holder for cross-test job id ----
@pytest.fixture(scope="module")
def state():
    return {}


# -------- Health --------
def test_root_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "ok"
    assert "service" in body


# -------- Auth gate --------
def test_auth_me_without_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_auth_me_with_invalid_token():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer wrong-token"}, timeout=15)
    assert r.status_code == 401


def test_auth_me_with_valid_token():
    r = requests.get(f"{API}/auth/me", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["email"] == "owner@test.local"
    assert me["role"] == "owner"
    assert "_id" not in me


def test_auth_session_invalid_session_id():
    r = requests.post(f"{API}/auth/session", json={"session_id": "definitely-not-valid"}, timeout=20)
    assert r.status_code == 401


# -------- Jobs CRUD --------
def test_create_job(state):
    payload = {
        "customer_name": "TEST_Ravi Kumar",
        "customer_phone": "+919900000001",
        "car_name": "Maruti Swift",
        "car_number": "ka01ab1234",  # should be upper-cased
        "model_year": "2019",
        "reference": "Walk-in",
        "customer_problems": "Brake noise, AC weak",
        "photos": {
            "front": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
            "back": None,
            "left": None,
            "right": None,
        },
    }
    r = requests.post(f"{API}/jobs", headers=OWNER_HDR, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    job = r.json()
    assert "_id" not in job
    assert job["job_id"].startswith("job_")
    assert job["status"] == "pending"
    assert job["car_number"] == "KA01AB1234"
    assert job["created_by"] == "user_test_owner"
    assert job["photos"]["front"].startswith("data:image/")
    state["job_id"] = job["job_id"]


def test_list_jobs_basic(state):
    r = requests.get(f"{API}/jobs", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 200, r.text
    jobs = r.json()
    assert isinstance(jobs, list)
    assert any(j["job_id"] == state["job_id"] for j in jobs)
    assert all("_id" not in j for j in jobs)


def test_list_jobs_search_by_car_number(state):
    r = requests.get(f"{API}/jobs", headers=OWNER_HDR, params={"q": "KA01AB"}, timeout=15)
    assert r.status_code == 200
    jobs = r.json()
    assert any(j["job_id"] == state["job_id"] for j in jobs)


def test_list_jobs_search_by_customer_name(state):
    r = requests.get(f"{API}/jobs", headers=OWNER_HDR, params={"q": "Ravi"}, timeout=15)
    assert r.status_code == 200
    jobs = r.json()
    assert any(j["job_id"] == state["job_id"] for j in jobs)


def test_list_jobs_status_filter_pending(state):
    r = requests.get(f"{API}/jobs", headers=OWNER_HDR, params={"status": "pending"}, timeout=15)
    assert r.status_code == 200
    jobs = r.json()
    assert all(j["status"] == "pending" for j in jobs)
    assert any(j["job_id"] == state["job_id"] for j in jobs)


def test_get_job(state):
    r = requests.get(f"{API}/jobs/{state['job_id']}", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["job_id"] == state["job_id"]
    assert "_id" not in job


def test_get_job_404():
    r = requests.get(f"{API}/jobs/job_doesnotexist", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 404


def test_patch_job_to_in_progress(state):
    payload = {
        "status": "in_progress",
        "mechanic_findings": "Front brake pads worn 80%, AC gas low.",
        "spare_parts": [
            {"name": "Front brake pads", "quantity": 1, "price": 1800.0, "status": "pending"},
            {"name": "AC gas refill", "quantity": 1, "price": 1200.0, "status": "ordered"},
        ],
    }
    r = requests.patch(f"{API}/jobs/{state['job_id']}", headers=OWNER_HDR, json=payload, timeout=15)
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["status"] == "in_progress"
    assert job["mechanic_findings"].startswith("Front brake")
    assert len(job["spare_parts"]) == 2

    # verify via GET
    g = requests.get(f"{API}/jobs/{state['job_id']}", headers=OWNER_HDR, timeout=15).json()
    assert g["status"] == "in_progress"
    assert len(g["spare_parts"]) == 2


def test_patch_job_to_completed(state):
    r = requests.patch(
        f"{API}/jobs/{state['job_id']}",
        headers=OWNER_HDR,
        json={"status": "completed"},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


def test_patch_job_invalid_status(state):
    r = requests.patch(
        f"{API}/jobs/{state['job_id']}",
        headers=OWNER_HDR,
        json={"status": "BOGUS"},
        timeout=15,
    )
    assert r.status_code == 422


# -------- Stats --------
def test_stats():
    r = requests.get(f"{API}/stats", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 200, r.text
    s = r.json()
    for k in ["total", "pending", "in_progress", "completed", "recent"]:
        assert k in s
    assert isinstance(s["recent"], list)
    assert all("_id" not in r for r in s["recent"])
    assert s["total"] >= 1


# -------- Role-based delete --------
def test_mechanic_cannot_delete(state):
    r = requests.delete(f"{API}/jobs/{state['job_id']}", headers=MECH_HDR, timeout=15)
    assert r.status_code == 403


def test_owner_can_delete(state):
    r = requests.delete(f"{API}/jobs/{state['job_id']}", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 200
    # verify gone
    g = requests.get(f"{API}/jobs/{state['job_id']}", headers=OWNER_HDR, timeout=15)
    assert g.status_code == 404


def test_delete_nonexistent_job():
    r = requests.delete(f"{API}/jobs/job_doesnotexist", headers=OWNER_HDR, timeout=15)
    assert r.status_code == 404


# -------- Jobs list requires auth --------
def test_list_jobs_requires_auth():
    r = requests.get(f"{API}/jobs", timeout=15)
    assert r.status_code == 401
