"""
Notification tools for CrewAI - Wraps notification endpoints
"""
import httpx
from typing import Optional, Dict
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class NotificationInput(BaseModel):
    """Input for sending notifications"""
    event: str = Field(description="Event type (job_complete, job_failed, admet_ready, etc.)")
    title: str = Field(description="Notification title")
    message: str = Field(description="Notification message body")
    details: Optional[Dict] = Field(default=None, description="Additional details")


def send_notification(input: NotificationInput) -> str:
    """
    Send a notification through configured channels (Telegram, Discord, Slack, Email, WhatsApp, Feishu).
    
    Use this tool to alert the user about important events during drug discovery workflows.
    
    Args:
        event: Event type (e.g., "job_complete", "job_failed", "admet_ready", "screening_complete")
        title: Short notification title
        message: Detailed notification message
        details: Additional data as JSON (optional)
    
    Returns:
        Confirmation message with which channels received the notification
    """
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{BACKEND_URL}/notifications/send",
                json={
                    "event": input.event,
                    "title": input.title,
                    "message": input.message,
                    "details": input.details,
                }
            )
            return response.text
    except Exception as e:
        return f"Error sending notification: {str(e)}"
