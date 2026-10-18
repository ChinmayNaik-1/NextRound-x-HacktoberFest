import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet, InvalidToken

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE, "interviewai.db")
SECRET_PATH = os.path.join(BASE, ".secret")

_fernet: Optional[Fernet] = None


def _f() -> Fernet:
    global _fernet

    if _fernet is None:
        key = os.environ.get("APP_SECRET")

        if not key:
            if os.path.exists(SECRET_PATH):
                key = open(SECRET_PATH).read().strip()
            else:
                key = Fernet.generate_key().decode()

                with open(SECRET_PATH, "w") as fh:
                    fh.write(key)

                try:
                    os.chmod(SECRET_PATH, 0o600)
                except OSError:
                    pass

        _fernet = Fernet(key.encode())

    return _fernet


def _enc(s: str) -> str:
    return _f().encrypt(s.encode()).decode()


def _dec(s: str) -> str:
    try:
        return _f().decrypt(s.encode()).decode()
    except InvalidToken:
        return s  # legacy plaintext row


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                api_key TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        )

        c.execute(
            """CREATE TABLE IF NOT EXISTS interviews (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                company TEXT,
                role TEXT,
                difficulty TEXT,
                candidate_name TEXT,
                status TEXT,
                selected_rounds TEXT,
                completed_rounds TEXT,
                resume_text TEXT,
                additional_context TEXT,
                scores TEXT,
                feedback TEXT,
                transcripts TEXT,
                submissions TEXT
            )"""
        )

        c.execute(
            """CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                slug TEXT UNIQUE,
                title TEXT,
                difficulty TEXT,
                spec TEXT NOT NULL,
                tests TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        )

        cols = [
            r[1]
            for r in c.execute("PRAGMA table_info(interviews)").fetchall()
        ]

        for col in ("completed_rounds", "submissions"):
            if col not in cols:
                c.execute(
                    f"ALTER TABLE interviews ADD COLUMN {col} TEXT"
                )


# ---------------- API keys ----------------

def add_api_key(
    name: str,
    provider: str,
    api_key: str,
    make_active: bool = True
) -> Dict[str, Any]:

    kid = uuid.uuid4().hex[:8]

    with db() as c:
        if make_active:
            c.execute("UPDATE api_keys SET is_active = 0")

        c.execute(
            """
            INSERT INTO api_keys
            (id, name, provider, api_key, is_active)
            VALUES (?,?,?,?,?)
            """,
            (
                kid,
                name.strip(),
                provider.lower().strip(),
                _enc(api_key.strip()),
                1 if make_active else 0,
            ),
        )

    return {
        "id": kid,
        "name": name,
        "provider": provider,
    }


def list_api_keys() -> List[Dict[str, Any]]:
    with db() as c:
        rows = c.execute(
            "SELECT * FROM api_keys ORDER BY created_at DESC"
        ).fetchall()

    out = []

    for r in rows:
        raw = _dec(r["api_key"])

        out.append(
            {
                "id": r["id"],
                "name": r["name"],
                "provider": r["provider"],
                "masked_key": ("…" + raw[-4:])
                if len(raw) > 8
                else "****",
                "is_active": bool(r["is_active"]),
                "created_at": r["created_at"],
            }
        )

    return out


def _row_to_key(row) -> Optional[Dict[str, Any]]:
    if not row:
        return None

    d = dict(row)
    d["api_key"] = _dec(d["api_key"])

    return d


def get_api_key_by_id(
    key_id: str
) -> Optional[Dict[str, Any]]:

    with db() as c:
        return _row_to_key(
            c.execute(
                "SELECT * FROM api_keys WHERE id = ?",
                (key_id,),
            ).fetchone()
        )


def get_active_api_key() -> Optional[Dict[str, Any]]:
    with db() as c:
        return _row_to_key(
            c.execute(
                "SELECT * FROM api_keys WHERE is_active = 1 LIMIT 1"
            ).fetchone()
        )


def set_active_api_key(key_id: str) -> bool:
    with db() as c:
        if not c.execute(
            "SELECT 1 FROM api_keys WHERE id = ?",
            (key_id,),
        ).fetchone():
            return False

        c.execute("UPDATE api_keys SET is_active = 0")

        c.execute(
            "UPDATE api_keys SET is_active = 1 WHERE id = ?",
            (key_id,),
        )

    return True


def delete_api_key(key_id: str) -> bool:
    with db() as c:
        return (
            c.execute(
                "DELETE FROM api_keys WHERE id = ?",
                (key_id,),
            ).rowcount
            > 0
        )


# ---------------- Interviews ----------------

def create_interview(d: Dict[str, Any]) -> None:
    with db() as c:
        c.execute(
            """INSERT INTO interviews
            (
                id,
                company,
                role,
                difficulty,
                candidate_name,
                status,
                selected_rounds,
                completed_rounds,
                resume_text,
                additional_context,
                scores,
                feedback,
                transcripts,
                submissions
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO NOTHING""",
            (
                d["id"],
                d["company"],
                d["role"],
                d["difficulty"],
                d.get("candidate_name", ""),
                "in_progress",
                json.dumps(d.get("selected_rounds", [])),
                "[]",
                d.get("resume_text", ""),
                d.get("additional_context", ""),
                "{}",
                "{}",
                "[]",
                "[]",
            ),
        )


def get_interview(
    iid: str
) -> Optional[Dict[str, Any]]:

    with db() as c:
        row = c.execute(
            "SELECT * FROM interviews WHERE id = ?",
            (iid,),
        ).fetchone()

    if not row:
        return None

    d = dict(row)

    for k, default in (
        ("selected_rounds", []),
        ("completed_rounds", []),
        ("scores", {}),
        ("feedback", {}),
        ("transcripts", []),
        ("submissions", []),
    ):
        d[k] = json.loads(
            d.get(k) or json.dumps(default)
        )

    return d


def add_submission(
    iid: str,
    sub: Dict[str, Any]
) -> None:
    """Server-side record of a DSA submission (latest one per round wins)."""

    with db() as c:
        row = c.execute(
            "SELECT submissions FROM interviews WHERE id = ?",
            (iid,),
        ).fetchone()

        if not row:
            return

        subs = [
            s
            for s in json.loads(
                row["submissions"] or "[]"
            )
            if s["round"] != sub["round"]
        ]

        subs.append(sub)

        c.execute(
            "UPDATE interviews SET submissions = ? WHERE id = ?",
            (
                json.dumps(subs),
                iid,
            ),
        )


def finish_interview(
    iid: str,
    completed: List[str],
    report: Dict[str, Any],
    transcripts: List[Any],
) -> None:

    with db() as c:
        c.execute(
            """UPDATE interviews
            SET
                status='completed',
                completed_rounds=?,
                scores=?,
                transcripts=?
            WHERE id = ?""",
            (
                json.dumps(completed),
                json.dumps(report),
                json.dumps(transcripts),
                iid,
            ),
        )


def list_past_interviews() -> List[Dict[str, Any]]:
    with db() as c:
        rows = c.execute(
            """SELECT
                id,
                created_at,
                company,
                role,
                difficulty,
                candidate_name,
                status,
                scores
            FROM interviews
            ORDER BY created_at DESC
            LIMIT 20"""
        ).fetchall()

    out = []

    for r in rows:
        d = dict(r)
        d["scores"] = json.loads(
            d["scores"] or "{}"
        )
        out.append(d)

    return out


# ---------------- Questions ----------------

def save_question(
    qid: str,
    slug: str,
    title: str,
    difficulty: str,
    spec: Dict,
    tests: List[Dict],
) -> None:

    with db() as c:
        c.execute(
            """INSERT INTO questions
            (
                id,
                slug,
                title,
                difficulty,
                spec,
                tests
            )
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(slug) DO NOTHING""",
            (
                qid,
                slug,
                title,
                difficulty,
                json.dumps(spec),
                json.dumps(tests),
            ),
        )


def _q(row) -> Optional[Dict[str, Any]]:
    if not row:
        return None

    return {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "difficulty": row["difficulty"],
        "spec": json.loads(row["spec"]),
        "tests": json.loads(row["tests"]),
    }


def get_question(
    qid: str
) -> Optional[Dict[str, Any]]:

    with db() as c:
        return _q(
            c.execute(
                "SELECT * FROM questions WHERE id = ?",
                (qid,),
            ).fetchone()
        )


def get_question_by_slug(
    slug: str
) -> Optional[Dict[str, Any]]:

    with db() as c:
        return _q(
            c.execute(
                "SELECT * FROM questions WHERE slug = ?",
                (slug,),
            ).fetchone()
        )


init_db()