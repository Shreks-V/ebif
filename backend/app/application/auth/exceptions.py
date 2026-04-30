class LoginError(Exception):
    """Raised when authentication credentials are invalid."""


class UserNotFoundError(Exception):
    """Raised when the requested user cannot be found."""


class ForbiddenError(Exception):
    """Raised when the authenticated user lacks required permissions."""


class PasswordTooShortError(Exception):
    """Raised when a new password does not meet the minimum length requirement."""
