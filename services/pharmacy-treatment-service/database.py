import os
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://root:root@db:3306/florion_pharmacy"
)

# Pembuatan database hanya relevan untuk MySQL. Test memakai SQLite in-memory
# sehingga blok pymysql ini tidak boleh dijalankan.
if DATABASE_URL.startswith("mysql"):
    import pymysql

    _u = urlparse(DATABASE_URL.replace("mysql+pymysql://", "mysql://"))
    _conn = pymysql.connect(
        host=_u.hostname,
        port=_u.port or 3306,
        user=_u.username,
        password=_u.password,
    )
    with _conn.cursor() as _cur:
        _cur.execute(f"CREATE DATABASE IF NOT EXISTS `{_u.path.lstrip('/')}`")
    _conn.commit()
    _conn.close()

if DATABASE_URL.startswith("sqlite"):
    # StaticPool membuat seluruh sesi test berbagi satu koneksi in-memory.
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
