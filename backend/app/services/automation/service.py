"""Legacy browser boundary; native sessions are exposed by desktop.py."""
from backend.app.services.ai.provider import ProviderError

async def run_browser(asset_id: str, source_id: str, question: str):
    raise ProviderError("Browser automation was replaced by native desktop sessions; use the local desktop runner.")
