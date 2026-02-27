"""
Custom exceptions for the repository layer.

These exceptions allow services and routes to handle database-level errors
with proper semantics, without leaking SQLAlchemy internals.
"""


class RepositoryError(Exception):
    """Base for all repository-layer errors."""


class DuplicateEntryError(RepositoryError):
    """Raised on unique constraint violations. Maps to HTTP 409 Conflict."""


class IntegrityConstraintError(RepositoryError):
    """Raised on FK or check constraint violations."""


class RecordNotFoundError(RepositoryError):
    """Raised when an expected record doesn't exist."""


class InvalidInputError(RepositoryError):
    """Raised on bad pagination params, invalid UUIDs, or other invalid inputs."""
