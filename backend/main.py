import os
import uuid
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.db import (
    init_db, save_setting, get_setting, get_all_settings,
    save_interview, get_interview, list_past_interviews
)
from services.question_bank import get_question_for_company, QUESTIONS_DB
from services.code_runner import execute_code
from services.resume_parser import parse_pdf_resume, summarize_resume
from services.ai_agent import AIAgent

app = FastAPI(title="InterviewAI Backend", version="1.0.0")

# Enable CORS for local Electron and Vite apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "InterviewAI Backend", "version": "1.0.0"}

# ==================== Settings & API Keys ====================

class SaveKeyRequest(BaseModel):
    provider: str
    api_key: str

@app.get("/api/settings/keys")
def get_saved_keys():
    settings = get_all_settings()
    masked = {}
    for k, v in settings.items():
        if k.startswith("api_key_") and v:
            # Mask key e.g. "AIzaSy...ABCD"
            if len(v) > 8:
                masked[k.replace("api_key_", "")] = v[:6] + "..." + v[-4:]
            else:
                masked[k.replace("api_key_", "")] = "****"
    last_provider = settings.get("active_provider", "gemini")
    return {"saved_keys": masked, "active_provider": last_provider}

@app.post("/api/settings/keys")
def save_key(req: SaveKeyRequest):
    provider = req.provider.lower()
    save_setting(f"api_key_{provider}", req.api_key)
    save_setting("active_provider", provider)
    return {"status": "success", "message": f"API key for {provider} saved successfully."}

@app.get("/api/settings/raw-key/{provider}")
def get_raw_key(provider: str):
    k = get_setting(f"api_key_{provider.lower()}")
    return {"provider": provider, "api_key": k or ""}

# ==================== Questions ====================

@app.get("/api/questions/company")
def get_company_question(company: str = "Google", difficulty: str = "Medium"):
    q = get_question_for_company(company, difficulty)
    return q

@app.get("/api/questions/all")
def get_all_questions():
    return QUESTIONS_DB

# ==================== Code Execution ====================

class CodeRunRequest(BaseModel):
    language: str
    code: str
    question_id: str
    test_cases: List[Dict[str, Any]]

@app.post("/api/code/run")
def run_code_endpoint(req: CodeRunRequest):
    try:
        res = execute_code(req.language, req.code, req.question_id, req.test_cases)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CodeAnalyzeRequest(BaseModel):
    question: Dict[str, Any]
    code: str
    language: str
    execution_results: Dict[str, Any]
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = None

@app.post("/api/code/analyze")
def analyze_code_endpoint(req: CodeAnalyzeRequest):
    effective_key = req.api_key or get_setting(f"api_key_{(req.provider or 'gemini').lower()}")
    agent = AIAgent(provider=req.provider, api_key=effective_key)
    analysis = agent.analyze_dsa_code(req.question, req.code, req.language, req.execution_results)
    return analysis

# ==================== Resume Parsing ====================

@app.post("/api/resume/parse-pdf")
async def parse_resume_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    result = parse_pdf_resume(contents)
    return result

class TextResumeRequest(BaseModel):
    text: str

@app.post("/api/resume/parse-text")
def parse_resume_text(req: TextResumeRequest):
    return summarize_resume(req.text)

# ==================== Interview Session & Chat ====================

class StartInterviewRequest(BaseModel):
    candidate_name: Optional[str] = "Candidate"
    dob: Optional[str] = ""
    company: str
    role: str
    difficulty: str
    selected_rounds: List[str]
    resume_text: Optional[str] = ""
    additional_context: Optional[str] = ""
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = ""

@app.post("/api/interview/start")
def start_interview_session(req: StartInterviewRequest):
    session_id = str(uuid.uuid4())
    data = {
        "id": session_id,
        "candidate_name": req.candidate_name,
        "dob": req.dob,
        "company": req.company,
        "role": req.role,
        "difficulty": req.difficulty,
        "selected_rounds": req.selected_rounds,
        "resume_text": req.resume_text,
        "additional_context": req.additional_context,
        "status": "in_progress",
        "scores": {},
        "feedback": {},
        "transcripts": []
    }
    save_interview(data)
    return {"session_id": session_id, "data": data}

class ChatTurnRequest(BaseModel):
    round_type: str
    company: str
    role: str
    messages: List[Dict[str, str]]
    resume_summary: Optional[str] = ""
    additional_context: Optional[str] = ""
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = ""

@app.post("/api/interview/chat")
def interview_chat_endpoint(req: ChatTurnRequest):
    effective_key = req.api_key or get_setting(f"api_key_{(req.provider or 'gemini').lower()}")
    agent = AIAgent(provider=req.provider, api_key=effective_key)
    ai_reply = agent.chat_interviewer(
        round_type=req.round_type,
        company=req.company,
        role=req.role,
        messages=req.messages,
        resume_summary=req.resume_summary or "",
        additional_context=req.additional_context or ""
    )
    return {"reply": ai_reply}

class FinishInterviewRequest(BaseModel):
    session_id: str
    interview_data: Dict[str, Any]
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = ""

@app.post("/api/interview/finish")
def finish_interview_session(req: FinishInterviewRequest):
    effective_key = req.api_key or get_setting(f"api_key_{(req.provider or 'gemini').lower()}")
    agent = AIAgent(provider=req.provider, api_key=effective_key)
    report = agent.generate_final_report(req.interview_data)
    
    # Save back to database
    interview_record = req.interview_data
    interview_record["id"] = req.session_id
    interview_record["status"] = "completed"
    interview_record["scores"] = report
    save_interview(interview_record)
    
    return {"status": "completed", "report": report}

@app.get("/api/interview/history")
def get_interview_history():
    return list_past_interviews()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
