from sqlalchemy import Column, String, JSON, Boolean

from .base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'users'

    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False, default="user")
    last_name = Column(String, nullable=True)
    phone_number = Column(String)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    preferences = Column(JSON)

    def __repr__(self):
        return f"<User {self.email}>"