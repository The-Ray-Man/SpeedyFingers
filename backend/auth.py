"""
Authentication based on headers set by the trusted upstream proxy.

Every request reaching the backend has passed through the proxy, which sets:
  - X-User-Id:   unique, stable identifier of the user
  - X-User-Name: display name of the user

Configuration (environment variables):
  - TRUSTED_USER_IDS:        comma-separated user ids allowed to manage gestures
  - USE_MOCK_AUTHENTICATION: if "true", requests without proxy headers are treated
                             as a local mock user (for local development only)
"""

import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status

USER_ID_HEADER = "X-User-Id"
USER_NAME_HEADER = "X-User-Name"

MOCK_USER_ID = "mock-user"
MOCK_USER_NAME = "Mock User"


def _parse_id_list(raw: str) -> frozenset[str]:
    return frozenset(part.strip() for part in raw.split(",") if part.strip())


TRUSTED_USER_IDS = _parse_id_list(os.getenv("TRUSTED_USER_IDS", ""))
USE_MOCK_AUTHENTICATION = os.getenv("USE_MOCK_AUTHENTICATION", "false").strip().lower() == "true"


@dataclass(frozen=True)
class User:
    id: str
    name: str

    @property
    def is_trusted(self) -> bool:
        return self.id in TRUSTED_USER_IDS


def get_current_user(request: Request) -> User:
    """Resolve the current user from the proxy headers."""
    user_id = (request.headers.get(USER_ID_HEADER) or "").strip()
    user_name = (request.headers.get(USER_NAME_HEADER) or "").strip()

    if not user_id:
        if not USE_MOCK_AUTHENTICATION:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing user identity",
            )
        user_id = MOCK_USER_ID
        user_name = user_name or MOCK_USER_NAME

    return User(id=user_id, name=user_name or user_id)


def require_trusted_user(user: User = Depends(get_current_user)) -> User:
    """Only allow users whose id is listed in TRUSTED_USER_IDS."""
    if not user.is_trusted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to manage gestures",
        )
    return user
