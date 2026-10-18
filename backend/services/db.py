import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

DATA_DIR = os.environ.get("NEXTROUND_DATA_DIR")
DB_PATH = os.path.join(DATA_DIR, "interviewai.db") if DATA_DIR else os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "interviewai.db"
)

def get_connection():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
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
    # Resumes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            candidate_name TEXT,
            file_name TEXT,
            raw_text TEXT NOT NULL,
            detected_skills TEXT,
            is_active INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

def delete_interview(interview_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM interviews WHERE id = ?", (interview_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ----------------- Resumes Management -----------------

def add_resume(title: str, raw_text: str, candidate_name: str = "", file_name: str = "", detected_skills: Optional[List[str]] = None, make_active: bool = True) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    resume_id = str(uuid.uuid4())[:8]
    
    if make_active:
        cursor.execute("UPDATE resumes SET is_active = 0")
        
    cursor.execute("""
        INSERT INTO resumes (id, title, candidate_name, file_name, raw_text, detected_skills, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        resume_id,
        title.strip(),
        (candidate_name or "").strip(),
        (file_name or "").strip(),
        raw_text.strip(),
        json.dumps(detected_skills or []),
        1 if make_active else 0
    ))
    conn.commit()
    conn.close()
    return {
        "id": resume_id,
        "title": title,
        "candidate_name": candidate_name,
        "file_name": file_name,
        "raw_text": raw_text,
        "detected_skills": detected_skills or [],
        "is_active": make_active
    }

def update_resume(resume_id: str, title: Optional[str] = None, raw_text: Optional[str] = None, candidate_name: Optional[str] = None, file_name: Optional[str] = None, detected_skills: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    current = dict(row)
    new_title = title if title is not None else current["title"]
    new_raw_text = raw_text if raw_text is not None else current["raw_text"]
    new_cand = candidate_name if candidate_name is not None else current["candidate_name"]
    new_file = file_name if file_name is not None else current["file_name"]
    new_skills = json.dumps(detected_skills) if detected_skills is not None else current["detected_skills"]
    
    cursor.execute("""
        UPDATE resumes
        SET title = ?, raw_text = ?, candidate_name = ?, file_name = ?, detected_skills = ?
        WHERE id = ?
    """, (new_title.strip(), new_raw_text.strip(), (new_cand or "").strip(), (new_file or "").strip(), new_skills, resume_id))
    conn.commit()
    conn.close()
    return {
        "id": resume_id,
        "title": new_title,
        "candidate_name": new_cand,
        "file_name": new_file,
        "raw_text": new_raw_text,
        "detected_skills": detected_skills if detected_skills is not None else json.loads(current["detected_skills"] or "[]"),
        "is_active": bool(current["is_active"])
    }


def list_resumes() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, candidate_name, file_name, raw_text, detected_skills, is_active, created_at FROM resumes ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "title": r["title"],
            "candidate_name": r["candidate_name"] or "",
            "file_name": r["file_name"] or "",
            "raw_text": r["raw_text"],
            "detected_skills": json.loads(r["detected_skills"] or "[]"),
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"]
        })
    return result

def get_active_resume() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, candidate_name, file_name, raw_text, detected_skills, is_active, created_at FROM resumes WHERE is_active = 1 LIMIT 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT id, title, candidate_name, file_name, raw_text, detected_skills, is_active, created_at FROM resumes ORDER BY created_at DESC LIMIT 1")
        row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["detected_skills"] = json.loads(d["detected_skills"] or "[]")
    d["is_active"] = bool(d["is_active"])
    return d

def set_active_resume(resume_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE resumes SET is_active = 0")
    cursor.execute("UPDATE resumes SET is_active = 1 WHERE id = ?", (resume_id,))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed

def delete_resume(resume_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ----------------- Settings / Credentials -----------------

def save_setting(key: str, value: Any):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (
        key,
        json.dumps(value) if not isinstance(value, str) else value
    ))
    conn.commit()
    conn.close()

def get_setting(key: str, default: Any = None) -> Any:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return default
    val = row["value"]
    try:
        return json.loads(val)
    except:
        return val

init_db()
