import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, HTTPException, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.middleware.trustedhost import TrustedHostMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from services import db  # noqa: E402
from services.ai_agent import AIAgent, LLMError, verify_provider_api_key  # noqa: E402
from services.code_runner import execute_code  # noqa: E402
from services.question_bank import get_question  # noqa: E402
from services.resume_parser import parse_pdf_resume, summarize_resume  # noqa: E402
from services.sandbox import MODE, docker_available  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="InterviewAI Backend",
    version="2.0.0",
    lifespan=lifespan,
)

origins = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

# Blocks DNS-rebinding attacks against the local server
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1"],
)


def agent_for(key_id: Optional[str] = None) -> AIAgent:
    """Provider and key always come from the same record, so they can never mismatch."""

    rec = (
        db.get_api_key_by_id(key_id)
        if key_id
        else None
    )

    if key_id and not rec:
        raise HTTPException(
            404,
            "That API key no longer exists. Pick another in Settings.",
        )

    rec = rec or db.get_active_api_key()

    try:
        if rec:
            return AIAgent(
                rec["provider"],
                rec["api_key"],
            )

        prov = os.environ.get(
            "DEFAULT_LLM_PROVIDER"
        )
        key = os.environ.get(
            "DEFAULT_LLM_API_KEY"
        )

        if prov and key:
            return AIAgent(
                prov,
                key,
            )

    except LLMError as e:
        raise HTTPException(
            400,
            str(e),
        )

    raise HTTPException(
        400,
        "No API key configured. Add one in Settings.",
    )


def llm_call(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except LLMError as e:
        raise HTTPException(
            502,
            str(e),
        )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "sandbox": MODE,
        "sandbox_ready": docker_available(),
        "default_key_configured": bool(
            os.environ.get(
                "DEFAULT_LLM_API_KEY"
            )
        ),
    }


# ---------------- API keys ----------------

class AddKeyRequest(BaseModel):
    name: str
    provider: str
    api_key: str
    verify: bool = True


class VerifyKeyRequest(BaseModel):
    provider: str
    api_key: str


@app.get("/api/keys")
def get_all_keys():
    active = db.get_active_api_key()

    return {
        "keys": db.list_api_keys(),
        "active_key_id": (
            active["id"]
            if active
            else None
        ),
    }


@app.post("/api/keys")
def create_key(req: AddKeyRequest):

    if (
        not req.name.strip()
        or not req.api_key.strip()
    ):
        raise HTTPException(
            400,
            "Name and API key are required.",
        )

    if req.verify:
        v = verify_provider_api_key(
            req.provider,
            req.api_key,
        )

        if not v["valid"]:
            raise HTTPException(
                400,
                v["message"],
            )

    rec = db.add_api_key(
        req.name,
        req.provider,
        req.api_key,
        make_active=True,
    )

    return {
        "status": "success",
        "key": rec,
        "message": f"Key '{req.name}' saved.",
    }


@app.post("/api/keys/verify")
def verify_key(req: VerifyKeyRequest):
    return verify_provider_api_key(
        req.provider,
        req.api_key,
    )


@app.post("/api/keys/{key_id}/activate")
def activate_key(key_id: str):

    if not db.set_active_api_key(key_id):
        raise HTTPException(
            404,
            "Key not found",
        )

    return {
        "status": "success"
    }


@app.delete("/api/keys/{key_id}")
def remove_key(key_id: str):

    if not db.delete_api_key(key_id):
        raise HTTPException(
            404,
            "Key not found",
        )

    return {
        "status": "success"
    }


# ---------------- Questions & code ----------------

@app.get("/api/questions/company")
def company_question(
    company: str = "Google",
    difficulty: str = "Medium",
    exclude: str = "",
    key_id: str = "",
):

    agent = agent_for(
        key_id or None
    )

    ids = [
        x
        for x in exclude.split(",")
        if x
    ]

    try:
        return get_question(
            agent,
            company,
            difficulty,
            ids,
        )

    except LLMError as e:
        raise HTTPException(
            502,
            str(e),
        )

    except RuntimeError as e:
        raise HTTPException(
            503,
            str(e),
        )

    except Exception as e:
        # network errors talking to LeetCode, etc.
        raise HTTPException(
            502,
            f"Could not fetch a question: {e}",
        )


class CodeRunRequest(BaseModel):
    session_id: Optional[str] = None
    round: Optional[str] = None
    question_id: str
    language: Literal[
        "python",
        "cpp",
        "java",
    ]
    code: str
    mode: Literal[
        "run",
        "submit",
    ] = "run"


@app.post("/api/code/run")
def run_code(req: CodeRunRequest):

    if len(req.code) > 50_000:
        raise HTTPException(
            413,
            "Code is too long.",
        )

    q = db.get_question(
        req.question_id
    )

    if not q:
        raise HTTPException(
            404,
            "Unknown question.",
        )

    report = execute_code(
        req.language,
        req.code,
        q,
        req.mode,
    )

    if (
        req.mode == "submit"
        and req.session_id
        and req.round
    ):
        db.add_submission(
            req.session_id,
            {
                "round": req.round,
                "question_id": q["id"],
                "title": q["title"],
                "language": req.language,
                "code": req.code,
                "report": report,
            },
        )

    return report


class CodeAnalyzeRequest(BaseModel):
    question_id: str
    code: str
    language: str
    execution_results: Dict[str, Any]
    key_id: Optional[str] = None


@app.post("/api/code/analyze")
def analyze_code(
    req: CodeAnalyzeRequest,
):

    q = db.get_question(
        req.question_id
    )

    if not q:
        raise HTTPException(
            404,
            "Unknown question.",
        )

    agent = agent_for(
        req.key_id
    )

    return llm_call(
        agent.analyze_dsa_code,
        q["title"],
        q["difficulty"],
        req.code,
        req.language,
        req.execution_results,
    )


# ---------------- Resume ----------------

class TextResumeRequest(BaseModel):
    text: str


@app.post("/api/resume/parse-pdf")
async def parse_resume_pdf(
    file: UploadFile = File(...),
):

    data = await file.read(
        5 * 1024 * 1024 + 1
    )

    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(
            413,
            "PDF is larger than 5 MB.",
        )

    try:
        return parse_pdf_resume(data)

    except ValueError as e:
        raise HTTPException(
            422,
            str(e),
        )


@app.post("/api/resume/parse-text")
def parse_resume_text(
    req: TextResumeRequest,
):

    return summarize_resume(
        req.text
    )


# ---------------- Interview session ----------------

class StartInterviewRequest(BaseModel):
    candidate_name: str = "Candidate"
    company: str
    role: str
    difficulty: str
    selected_rounds: List[str]
    resume_text: str = ""
    additional_context: str = ""


@app.post("/api/interview/start")
def start_interview(
    req: StartInterviewRequest,
):

    sid = str(
        uuid.uuid4()
    )

    db.create_interview(
        {
            "id": sid,
            **req.model_dump(),
        }
    )

    return {
        "session_id": sid
    }


class ChatTurnRequest(BaseModel):
    round_type: str
    company: str
    role: str
    messages: List[Dict[str, str]]
    resume_summary: str = ""
    additional_context: str = ""
    key_id: Optional[str] = None
    extra_instruction: str = ""


@app.post("/api/interview/chat")
def interview_chat(
    req: ChatTurnRequest,
):

    agent = agent_for(
        req.key_id
    )

    reply = llm_call(
        agent.chat_interviewer,
        req.round_type,
        req.company,
        req.role,
        req.messages,
        req.resume_summary,
        req.additional_context,
        req.extra_instruction,
    )

    return {
        "reply": reply
    }


class FinishInterviewRequest(BaseModel):
    session_id: str
    completed_rounds: List[str]
    round_transcripts: Dict[
        str,
        List[Dict[str, str]]
    ] = {}
    warnings_count: int = 0
    key_id: Optional[str] = None


@app.post("/api/interview/finish")
def finish_interview(
    req: FinishInterviewRequest,
):

    rec = db.get_interview(
        req.session_id
    )

    if not rec:
        raise HTTPException(
            404,
            "Interview session not found.",
        )

    agent = agent_for(
        req.key_id
    )

    data = {
        "company": rec["company"],
        "role": rec["role"],
        "difficulty": rec["difficulty"],
        "completed_rounds": req.completed_rounds,
        "round_transcripts": req.round_transcripts,
        "submissions": rec["submissions"],
        # scored from server-side results,
        # never from the browser
    }

    try:
        report = agent.generate_final_report(
            data
        )

    except LLMError as e:
        raise HTTPException(
            502,
            str(e),
        )

    except ValueError as e:
        raise HTTPException(
            422,
            str(e),
        )

    flat = [
        m
        for r in req.round_transcripts.values()
        for m in r
    ]

    db.finish_interview(
        req.session_id,
        req.completed_rounds,
        report,
        flat,
    )

    return {
        "status": "completed",
        "report": report,
    }


@app.get("/api/interview/history")
def history():
    return db.list_past_interviews()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )