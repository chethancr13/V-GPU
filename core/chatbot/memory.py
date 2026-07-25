import sqlite3
import os
import time
from typing import List, Dict, Any, Optional

DB_PATH = "data/chatbot_history.db"

class ChatMemory:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                sender TEXT,
                message TEXT,
                citations TEXT,
                timestamp REAL
            )
            """)
            conn.commit()

    def add_message(self, session_id: str, sender: str, message: str, citations: Optional[List[Dict[str, Any]]] = None):
        import json
        cit_json = json.dumps(citations) if citations else None
        with self._get_conn() as conn:
            conn.execute("""
            INSERT INTO chat_history (session_id, sender, message, citations, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """, (session_id, sender, message, cit_json, time.time()))
            conn.commit()

    def get_history(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        import json
        with self._get_conn() as conn:
            rows = conn.execute("""
            SELECT sender, message, citations, timestamp FROM chat_history
            WHERE session_id = ?
            ORDER BY id ASC
            LIMIT ?
            """, (session_id, limit)).fetchall()
            
            history = []
            for row in rows:
                cit = json.loads(row["citations"]) if row["citations"] else []
                history.append({
                    "sender": row["sender"],
                    "message": row["message"],
                    "citations": cit,
                    "timestamp": row["timestamp"]
                })
            return history

    def clear_history(self, session_id: str):
        with self._get_conn() as conn:
            conn.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
            conn.commit()
