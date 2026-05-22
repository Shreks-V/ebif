"""In-memory store for refresh token JTIs (rotation pattern)."""
from __future__ import annotations

import threading
from datetime import datetime, timezone

REFRESH_TOKEN_EXPIRE_DAYS = 7


class RefreshTokenStore:
    """Thread-safe store for valid refresh token JTIs.

    On each refresh: the old JTI is consumed (deleted) and a new one is issued.
    A stolen, already-used refresh token is therefore rejected.
    """

    def __init__(self) -> None:
        self._tokens: dict[str, datetime] = {}
        self._lock = threading.Lock()

    def add(self, jti: str, expires_at: datetime) -> None:
        with self._lock:
            self._evict_expired()
            self._tokens[jti] = expires_at

    def consume(self, jti: str) -> bool:
        """Remove and return True if JTI is present and not expired."""
        with self._lock:
            expires_at = self._tokens.pop(jti, None)
            if expires_at is None:
                return False
            return datetime.now(timezone.utc) <= expires_at

    def _evict_expired(self) -> None:
        now = datetime.now(timezone.utc)
        self._tokens = {j: e for j, e in self._tokens.items() if e > now}


_store = RefreshTokenStore()


def get_refresh_store() -> RefreshTokenStore:
    return _store
