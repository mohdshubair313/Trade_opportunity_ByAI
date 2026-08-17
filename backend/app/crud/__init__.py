"""
CRUD operations package for Trade Opportunities API.

All CRUD classes are defined here and re-exported for convenience.
Import CRUDs from this package:
    from app.crud import UserCRUD, AnalysisCRUD, ...
"""
from app.crud.user_crud import UserCRUD
from app.crud.analysis_crud import AnalysisCRUD
from app.crud.favorite_crud import FavoriteCRUD
from app.crud.watchlist_crud import WatchlistCRUD
from app.crud.alert_crud import AlertCRUD
from app.crud.contact_crud import ContactCRUD
from app.crud.auth_crud import RefreshTokenCRUD, OTPCrud
from app.crud.inventory_crud import InventoryCRUD
from app.crud.order_crud import OrderCRUD
from app.crud.payment_crud import PaymentTransactionCRUD

__all__ = [
    "UserCRUD",
    "AnalysisCRUD",
    "FavoriteCRUD",
    "WatchlistCRUD",
    "AlertCRUD",
    "ContactCRUD",
    "RefreshTokenCRUD",
    "OTPCrud",
    "InventoryCRUD",
    "OrderCRUD",
    "PaymentTransactionCRUD",
]
