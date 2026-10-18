import sqlite3
import json
import os
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
    
    # Settings table (for saved API keys & preferences)
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
            resume_text TEXT,
            additional_context TEXT,
            scores TEXT,
            feedback TEXT,
            transcripts TEXT
        )
    """)
    
    conn.commit()
    conn.close()

def save_setting(key: str, value: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    """, (key, value))
    conn.commit()
    conn.close()

def get_setting(key: str) -> Optional[str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else None

def get_all_settings() -> Dict[str, str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {row["key"]: row["value"] for row in rows}

def save_interview(interview_data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO interviews (
            id, company, role, difficulty, candidate_name, dob, status, 
            selected_rounds, resume_text, additional_context, scores, feedback, transcripts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        interview_data.get("id"),
        interview_data.get("company"),
        interview_data.get("role"),
        interview_data.get("difficulty"),
        interview_data.get("candidate_name"),
        interview_data.get("dob"),
        interview_data.get("status", "in_progress"),
        json.dumps(interview_data.get("selected_rounds", [])),
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
