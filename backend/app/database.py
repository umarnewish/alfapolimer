import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.environ.get("DATABASE_PATH", "./data/catalog.db")
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
