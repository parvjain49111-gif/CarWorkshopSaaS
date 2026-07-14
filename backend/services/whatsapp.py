"""
WhatsApp notification module — provider-agnostic.

Business logic calls `send_notification(event, job, settings, extras)` and this
module dispatches through a `Notifier` protocol. Real providers (Twilio, MSG91,
AiSensy, Interakt, Gupshup, Meta Cloud API) can be plugged in by creating a class
that implements `Notifier.send()` and setting `WhatsAppService.provider = ...`
via `configure_notifier()`. The default provider is `ConsoleNotifier` which logs
outgoing messages to stdout so business logic can be developed and tested
end-to-end without provider credentials.

All calls are safe (never raise) — a failed send only logs a warning.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Protocol

logger = logging.getLogger("whatsapp")


# ------------ Event catalog ------------
EVENTS = {
    "job_card_created": "Job card {job_card_no} created for {car_number}. We'll keep you posted!",
    "vehicle_received": "We've received your {car_name} ({car_number}) at {workshop}. Inspection begins shortly.",
    "inspection_done": "Inspection complete for {car_number}. Findings shared for approval.",
    "approval_pending": "Estimate ready for {car_number}. Please approve to start repair.",
    "repair_started": "Great — repair work has begun on your {car_name} ({car_number}).",
    "quality_check": "Repair complete. Your {car_number} is undergoing final quality check.",
    "ready_for_delivery": "🎉 Your {car_name} ({car_number}) is ready for pickup. Total: ₹{total_amount}.",
    "invoice_generated": "Invoice for {car_number}: ₹{total_amount}. Paid via UPI: {upi_id}",
    "payment_received": "Payment received for {car_number} — ₹{total_amount}. Thank you!",
    "vehicle_delivered": "Thank you for choosing {workshop}. See you at your next service! — {car_number}",
    "service_reminder_time": "Hi {customer_name}, your {car_name} ({car_number}) is due for service. Book: {phone}",
    "service_reminder_km": "Your {car_name} ({car_number}) has crossed {odometer_km} km — recommended for service.",
    "insurance_expiry": "Reminder: insurance for {car_number} is expiring soon.",
    "puc_expiry": "Reminder: PUC certificate for {car_number} is expiring soon.",
}


class Notifier(Protocol):
    def send(self, to_phone: str, message: str, meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        ...


@dataclass
class SendResult:
    provider: str
    to: str
    ok: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class ConsoleNotifier:
    """Default no-op notifier — logs the outgoing message so the flow is auditable."""
    name = "console"

    def send(self, to_phone: str, message: str, meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        logger.info(
            "[WhatsApp:console] → %s | %s | meta=%s",
            to_phone, message.replace("\n", " ")[:200], meta or {},
        )
        return {"provider": self.name, "ok": True, "message_id": "console-" + str(id(message))}


# ---- Global provider — swap this at boot to plug in a real provider ----
_provider: Notifier = ConsoleNotifier()


def configure_notifier(provider: Notifier) -> None:
    """Register a real provider. Called at boot from settings."""
    global _provider
    _provider = provider
    logger.info("WhatsApp provider configured: %s", getattr(provider, "name", provider.__class__.__name__))


def render(event: str, ctx: Dict[str, Any]) -> str:
    template = EVENTS.get(event, "")
    if not template:
        return ""
    safe_ctx = {k: (v if v is not None else "") for k, v in ctx.items()}
    try:
        return template.format(**safe_ctx)
    except KeyError:
        return template


def send_notification(
    event: str,
    to_phone: Optional[str],
    context: Dict[str, Any],
) -> Optional[SendResult]:
    """Central entry point. Returns None if phone missing or event unknown."""
    if not to_phone:
        return None
    message = render(event, context)
    if not message:
        return None
    try:
        res = _provider.send(to_phone, message, {"event": event})
        return SendResult(
            provider=res.get("provider", getattr(_provider, "name", "unknown")),
            to=to_phone,
            ok=bool(res.get("ok")),
            message_id=res.get("message_id"),
            error=res.get("error"),
        )
    except Exception as e:
        logger.warning("WhatsApp send failed (event=%s to=%s): %s", event, to_phone, e)
        return SendResult(
            provider=getattr(_provider, "name", "unknown"),
            to=to_phone,
            ok=False,
            error=str(e),
        )


# ---- Trigger helpers wired to Job Card lifecycle events ----
STATUS_EVENT_MAP: Dict[str, str] = {
    "vehicle_received": "vehicle_received",
    "inspection": "inspection_done",
    "approval_pending": "approval_pending",
    "repair_started": "repair_started",
    "quality_check": "quality_check",
    "ready_for_delivery": "ready_for_delivery",
    "delivered": "vehicle_delivered",
}


def notify_status_change(job: Dict[str, Any], settings: Dict[str, Any]) -> Optional[SendResult]:
    event = STATUS_EVENT_MAP.get(job.get("status") or "", None)
    if not event:
        return None
    return send_notification(
        event,
        job.get("customer_phone"),
        {
            **job,
            "workshop": settings.get("workshop_name") or "our workshop",
            "phone": settings.get("phone") or "",
            "upi_id": settings.get("upi_id") or "",
        },
    )


def notify_invoice(job: Dict[str, Any], settings: Dict[str, Any]) -> Optional[SendResult]:
    return send_notification(
        "invoice_generated",
        job.get("customer_phone"),
        {**job, "workshop": settings.get("workshop_name"), "upi_id": settings.get("upi_id") or ""},
    )


def notify_payment(job: Dict[str, Any], settings: Dict[str, Any]) -> Optional[SendResult]:
    return send_notification(
        "payment_received",
        job.get("customer_phone"),
        {**job, "workshop": settings.get("workshop_name")},
    )
