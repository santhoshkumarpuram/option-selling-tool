"""SQLite Database layer using aiosqlite."""

import json
import aiosqlite
from pathlib import Path
from typing import Optional, Dict, Any, List
from config import settings


DB_FILE = Path(settings.db_path)
DB_FILE.parent.mkdir(parents=True, exist_ok=True)


def get_db():
    """Return an aiosqlite connect context manager."""
    return aiosqlite.connect(settings.db_path)


async def init_db():
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                broker TEXT NOT NULL UNIQUE,
                client_id TEXT,
                access_token TEXT,
                app_id TEXT,
                consumer_key TEXT,
                consumer_secret TEXT,
                is_active INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                strategy_type TEXT NOT NULL,
                expiry TEXT NOT NULL,
                legs_json TEXT NOT NULL,
                lots INTEGER DEFAULT 1,
                lot_size INTEGER DEFAULT 1,
                entry_date TEXT,
                entry_stock_price REAL,
                is_paper INTEGER DEFAULT 1,
                status TEXT DEFAULT 'open',
                net_credit REAL,
                max_profit REAL,
                max_loss REAL,
                pop_at_entry REAL,
                stop_loss_rule TEXT DEFAULT '1:2',
                current_pnl REAL DEFAULT 0.0,
                closed_at TEXT
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS scan_cache (
                symbol TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.commit()


# Credential queries
async def save_credentials(data: Dict[str, Any]):
    async with get_db() as db:
        await db.execute("""
            INSERT INTO credentials (broker, client_id, access_token, app_id, consumer_key, consumer_secret, is_active, updated_at)
            VALUES (:broker, :client_id, :access_token, :app_id, :consumer_key, :consumer_secret, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(broker) DO UPDATE SET
                client_id=excluded.client_id,
                access_token=excluded.access_token,
                app_id=excluded.app_id,
                consumer_key=excluded.consumer_key,
                consumer_secret=excluded.consumer_secret,
                is_active=1,
                updated_at=CURRENT_TIMESTAMP
        """, data)
        await db.commit()


async def get_active_credentials() -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM credentials WHERE is_active=1 ORDER BY updated_at DESC LIMIT 1") as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None


async def get_all_credentials() -> List[Dict[str, Any]]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT broker, client_id, app_id, is_active, updated_at FROM credentials") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


# Position queries
async def create_position(pos: Dict[str, Any]) -> int:
    async with get_db() as db:
        cursor = await db.execute("""
            INSERT INTO positions (
                symbol, strategy_type, expiry, legs_json, lots, lot_size,
                entry_date, entry_stock_price, is_paper, status, net_credit,
                max_profit, max_loss, pop_at_entry, stop_loss_rule, current_pnl
            ) VALUES (
                :symbol, :strategy_type, :expiry, :legs_json, :lots, :lot_size,
                :entry_date, :entry_stock_price, :is_paper, :status, :net_credit,
                :max_profit, :max_loss, :pop_at_entry, :stop_loss_rule, :current_pnl
            )
        """, pos)
        await db.commit()
        return cursor.lastrowid


async def get_positions(status: Optional[str] = None) -> List[Dict[str, Any]]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        if status:
            cursor = await db.execute("SELECT * FROM positions WHERE status=? ORDER BY id DESC", (status,))
        else:
            cursor = await db.execute("SELECT * FROM positions ORDER BY id DESC")
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["legs"] = json.loads(d["legs_json"]) if d.get("legs_json") else []
            result.append(d)
        return result


async def close_position_db(position_id: int, final_pnl: Optional[float] = None):
    async with get_db() as db:
        await db.execute("""
            UPDATE positions 
            SET status='closed', closed_at=CURRENT_TIMESTAMP, current_pnl=COALESCE(?, current_pnl)
            WHERE id=?
        """, (final_pnl, position_id))
        await db.commit()


# Settings queries
async def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT value FROM app_settings WHERE key=?", (key,)) as cursor:
            row = await cursor.fetchone()
            return row["value"] if row else default


async def set_setting(key: str, value: str):
    async with get_db() as db:
        await db.execute("""
            INSERT INTO app_settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """, (key, value))
        await db.commit()
