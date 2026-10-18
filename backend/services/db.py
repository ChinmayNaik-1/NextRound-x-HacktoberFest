import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "interviewai.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Named API Keys table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            api_key TEXT NOT NULL,
            is_active INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Interviews history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            company TEXT,
            role TEXT,
            difficulty TEXT,
            candidate_name TEXT,
            dob TEXT,
            status TEXT,
            selected_rounds TEXT,
            completed_rounds TEXT,
            resume_text TEXT,
            additional_context TEXT,
            scores TEXT,
            feedback TEXT,
            transcripts TEXT
        )
    """)
    # Safe column migrations
    cursor.execute("PRAGMA table_info(interviews)")
    existing_cols = [c[1] for c in cursor.fetchall()]
    if "completed_rounds" not in existing_cols:
        cursor.execute("ALTER TABLE interviews ADD COLUMN completed_rounds TEXT")
    
    conn.commit()
    conn.close()

# ----------------- Named API Keys -----------------

def add_api_key(name: str, provider: str, api_key: str, make_active: bool = True) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    key_id = str(uuid.uuid4())[:8]
    
    if make_active:
        cursor.execute("UPDATE api_keys SET is_active = 0")
        
    cursor.execute("""
        INSERT INTO api_keys (id, name, provider, api_key, is_active)
        VALUES (?, ?, ?, ?, ?)
    """, (key_id, name.strip(), provider.lower().strip(), api_key.strip(), 1 if make_active else 0))
    
    conn.commit()
    conn.close()
    return {"id": key_id, "name": name, "provider": provider}

def list_api_keys() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, provider, api_key, is_active, created_at FROM api_keys ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        raw_key = r["api_key"]
        masked = raw_key[:6] + "..." + raw_key[-4:] if len(raw_key) > 10 else "****"
        result.append({
            "id": r["id"],
            "name": r["name"],
            "provider": r["provider"],
            "masked_key": masked,
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"]
        })
    return result

def get_api_key_by_id(key_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM api_keys WHERE id = ?", (key_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def set_active_api_key(key_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE api_keys SET is_active = 0")
    cursor.execute("UPDATE api_keys SET is_active = 1 WHERE id = ?", (key_id,))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed

def get_active_api_key() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM api_keys WHERE is_active = 1 LIMIT 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT * FROM api_keys ORDER BY created_at DESC LIMIT 1")
        row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_api_key(key_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ----------------- Interviews History -----------------

def save_interview(interview_data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO interviews (
            id, company, role, difficulty, candidate_name, dob, status, 
            selected_rounds, completed_rounds, resume_text, additional_context, scores, feedback, transcripts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        interview_data.get("id"),
        interview_data.get("company"),
        interview_data.get("role"),
        interview_data.get("difficulty"),
        interview_data.get("candidate_name"),
        interview_data.get("dob"),
        interview_data.get("status", "in_progress"),
        json.dumps(interview_data.get("selected_rounds", [])),
        json.dumps(interview_data.get("completed_rounds", [])),
        interview_data.get("resume_text", ""),
        interview_data.get("additional_context", ""),
        json.dumps(interview_data.get("scores", {})),
        json.dumps(interview_data.get("feedback", {})),
        json.dumps(interview_data.get("transcripts", []))
    ))
    conn.commit()
    conn.close()

def get_interview(interview_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM interviews WHERE id = ?", (interview_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data["selected_rounds"] = json.loads(data["selected_rounds"] or "[]")
    data["completed_rounds"] = json.loads(data["completed_rounds"] or "[]")
    data["scores"] = json.loads(data["scores"] or "{}")
    data["feedback"] = json.loads(data["feedback"] or "{}")
    data["transcripts"] = json.loads(data["transcripts"] or "[]")
    return data

def list_past_interviews() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, created_at, company, role, difficulty, candidate_name, status, scores FROM interviews ORDER BY created_at DESC LIMIT 20")
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        d["scores"] = json.loads(d["scores"] or "{}")
        results.append(d)
    return results

init_db()
