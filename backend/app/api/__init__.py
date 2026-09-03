"""
API Routes package for Trade Opportunities API.

All route modules are registered here and exported as a list for main.py.
"""
from app.api.auth_routes import router as auth_router
from app.api.user_routes import router as user_router
from app.api.analysis_routes import router as analysis_router
from app.api.favorites_routes import router as favorites_router
from app.api.compare_routes import router as compare_router
from app.api.export_routes import router as export_router
from app.api.market_data_routes import router as market_data_router
from app.api.payment_routes import router as payment_router
from app.api.ai_routes import router as ai_router
from app.api.voice_routes import router as voice_router
from app.api.watchlist_routes import router as watchlist_router
from app.api.alert_routes import router as alert_router
from app.api.contact_routes import router as contact_router
from app.api.admin_routes import router as admin_router
from app.api.info_routes import router as info_router
from app.integrations.voice_agent_server import router as voice_agent_realtime_router

all_routers = [
    auth_router,
    user_router,
    analysis_router,
    favorites_router,
    compare_router,
    export_router,
    market_data_router,
    payment_router,
    ai_router,
    voice_router,
    voice_agent_realtime_router,
    watchlist_router,
    alert_router,
    contact_router,
    admin_router,
    info_router,
]
