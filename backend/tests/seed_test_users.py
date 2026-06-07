"""Seed test users + sessions in MongoDB for backend testing.
Per /app/memory/test_credentials.md.
"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=7)

    # Owner user
    await db.users.update_one(
        {"user_id": "user_test_owner"},
        {"$set": {
            "user_id": "user_test_owner",
            "email": "owner@test.local",
            "name": "Test Owner",
            "picture": "",
            "role": "owner",
            "created_at": now.isoformat(),
        }},
        upsert=True,
    )
    await db.user_sessions.update_one(
        {"session_token": "test-owner-token-001"},
        {"$set": {
            "session_token": "test-owner-token-001",
            "user_id": "user_test_owner",
            "expires_at": expires,
            "created_at": now,
        }},
        upsert=True,
    )

    # Mechanic user
    await db.users.update_one(
        {"user_id": "user_test_mechanic"},
        {"$set": {
            "user_id": "user_test_mechanic",
            "email": "mech@test.local",
            "name": "Test Mechanic",
            "picture": "",
            "role": "mechanic",
            "created_at": now.isoformat(),
        }},
        upsert=True,
    )
    await db.user_sessions.update_one(
        {"session_token": "test-mech-token-001"},
        {"$set": {
            "session_token": "test-mech-token-001",
            "user_id": "user_test_mechanic",
            "expires_at": expires,
            "created_at": now,
        }},
        upsert=True,
    )

    print("Seed complete")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
