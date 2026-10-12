import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./repair.db")

# SQLite needs check_same_thread=False for multithreaded FastAPI requests
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def begin_write_transaction(db):
    """Acquire SQLite's writer lock before read-check-write API operations.

    Call this before the first query in routes that enforce uniqueness or
    scheduling invariants. SQLite's deferred transactions otherwise let two
    requests both pass the check before either commits.
    """
    connection = db.connection()
    if connection.dialect.name != "sqlite":
        return

    driver_connection = connection.connection.driver_connection
    if not driver_connection.in_transaction:
        connection.exec_driver_sql("BEGIN IMMEDIATE")
