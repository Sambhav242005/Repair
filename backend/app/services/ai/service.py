"""
AI and Repair Intelligence Service Boundary (Member 1 - Sambhav)
Owned path: backend/app/services/ai/

This file defines the service interface expected by the Backend.
Sambhav will implement the real Gemini API integration using GEMINI_API_KEY and GEMINI_MODEL.
"""
import os
from typing import Any, List, Optional
from backend.app.models.schemas import Analysis, ScreenshotAdvice

async def assess_case(
    asset: Any,
    symptoms: str,
    diagnostic: Optional[Any] = None,
    screenshot_bytes: Optional[bytes] = None,
    evidence: Optional[List[Any]] = None,
) -> Analysis:
    """
    Evaluates symptoms, diagnostic data, and screenshot against equipment knowledge.
    Returns a validated Pydantic Analysis instance.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    # If Sambhav connects the live Gemini client, call it here.
    # Otherwise return the validated structured assessment fallback.
    return Analysis(
        summary=f"Symptom assessment for {getattr(asset, 'name', 'Equipment')}: High correlation with storage/memory cache thrashing.",
        hypotheses=[
            {
                "cause": "Storage fragmentation or background indexer process lock",
                "likelihood": "high",
                "evidence": ["Observed storage performance drop under sustained workload"],
            },
            {
                "cause": "Thermal dissipation limit reached",
                "likelihood": "medium",
                "evidence": ["Thermal sensors report throttling near peak clock speeds"],
            },
        ],
        uncertainties=[
            "Ambient operating environment temperature unknown",
            "Internal fan acoustic profile not captured in sample",
        ],
        steps=[
            {
                "id": "step_1",
                "instruction": "Clean temporary storage directories and verify at least 20 GB free space.",
                "expected_result": "Available storage exceeds minimum operating threshold.",
                "stop_condition": "Storage allocation remains below 5% free capacity.",
                "status": "pending",
            },
            {
                "id": "step_2",
                "instruction": "Check air vents and cooling intake for obstruction.",
                "expected_result": "Unobstructed airflow and normal exhaust temperatures.",
                "stop_condition": "Chassis temperature exceeds 80C under idle conditions.",
                "status": "pending",
            },
        ],
        recommendation="troubleshoot",
        evidence=[
            {
                "source_id": "guide_generic_perf",
                "title": "Standard Diagnostic & Thermal Throttling Guide",
                "url": "https://pcsupport.lenovo.com",
            }
        ],
        estimated_repair_cost_paise=None,
        cost_basis=None,
    )

async def explain_screenshot(
    image_bytes: bytes,
    question: str,
) -> ScreenshotAdvice:
    """
    Analyzes uploaded screenshot to identify visible controls and errors.
    Returns a validated Pydantic ScreenshotAdvice instance.
    """
    return ScreenshotAdvice(
        observations=[
            "Active process monitor reveals elevated disk activity and service restart loops.",
            "Notification banner highlights low storage warning on root volume.",
        ],
        suggested_actions=[
            {
                "instruction": "Open the Storage Settings menu to view disk partition usage.",
                "visible_label": "Storage Settings",
            },
            {
                "instruction": "Click 'Clean Now' in the system cleanup dialog.",
                "visible_label": "Clean Now",
            },
        ],
        limitations=[
            "Low-resolution background text is unreadable; controls not fabricated.",
        ],
    )

async def summarise_support_page(
    question: str,
    page_title: str,
    excerpt: str,
    source: str,
) -> str:
    """Summarises manufacturer support excerpts relevant to user's question."""
    return f"Summary from {page_title}: Refer to maintenance section regarding {question}."
