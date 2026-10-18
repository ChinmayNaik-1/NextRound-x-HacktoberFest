import os
import uuid
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.db import (
    init_db, add_api_key, list_api_keys, get_api_key_by_id,
    set_active_api_key, get_active_api_key, delete_api_key,
    save_interview, get_interview, list_past_interviews
)
from services.question_bank import get_question_for_company, QUESTIONS_DB
from services.code_runner import execute_code
from services.resume_parser import parse_pdf_resume, summarize_resume
from services.ai_agent import AIAgent, verify_provider_api_key

app = FastAPI(title="InterviewAI Backend", version="1.0.0")

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

# ==================== Named API Keys Endpoints ====================

class AddKeyRequest(BaseModel):
    name: str
    provider: str
    api_key: str
    verify: Optional[bool] = True

@app.get("/api/keys")
def get_all_keys():
    keys = list_api_keys()
    active = get_active_api_key()
    return {"keys": keys, "active_key_id": active["id"] if active else None}

@app.post("/api/keys")
def create_key(req: AddKeyRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Key name is required.")
    if not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required.")
        
    # Optional verification
    if req.verify:
        v_res = verify_provider_api_key(req.provider, req.api_key)
        if not v_res["valid"]:
            raise HTTPException(status_code=400, detail=v_res["message"])

    key_record = add_api_key(req.name, req.provider, req.api_key, make_active=True)
    return {"status": "success", "key": key_record, "message": f"API key '{req.name}' added successfully."}

class VerifyKeyRequest(BaseModel):
    provider: str
    api_key: str

@app.post("/api/keys/verify")
def verify_key_endpoint(req: VerifyKeyRequest):
    res = verify_provider_api_key(req.provider, req.api_key)
    return res

@app.post("/api/keys/{key_id}/activate")
def activate_key(key_id: str):
    ok = set_active_api_key(key_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"status": "success", "message": "Key activated."}

@app.delete("/api/keys/{key_id}")
def remove_key(key_id: str):
    ok = delete_api_key(key_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"status": "success", "message": "Key deleted."}

# ==================== Questions ====================

@app.get("/api/questions/company")
def get_company_question(company: str = "Google", difficulty: str = "Medium"):
    q = get_question_for_company(company, difficulty)
    return q

# ==================== Real Code Execution ====================

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
    key_id: Optional[str] = None

@app.post("/api/code/analyze")
def analyze_code_endpoint(req: CodeAnalyzeRequest):
    key = req.api_key
    if not key and req.key_id:
        k_record = get_api_key_by_id(req.key_id)
        if k_record:
            key = k_record["api_key"]
    if not key:
        active = get_active_api_key()
        if active:
            key = active["api_key"]

    agent = AIAgent(provider=req.provider, api_key=key)
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
    key_id: Optional[str] = ""

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
        "completed_rounds": [],
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
    key_id: Optional[str] = ""

@app.post("/api/interview/chat")
def interview_chat_endpoint(req: ChatTurnRequest):
    key = req.api_key
    if not key and req.key_id:
        k_record = get_api_key_by_id(req.key_id)
        if k_record:
            key = k_record["api_key"]
    if not key:
        active = get_active_api_key()
        if active:
            key = active["api_key"]

    agent = AIAgent(provider=req.provider, api_key=key)
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
    key_id: Optional[str] = ""

@app.post("/api/interview/finish")
def finish_interview_session(req: FinishInterviewRequest):
    key = req.api_key
    if not key and req.key_id:
        k_record = get_api_key_by_id(req.key_id)
        if k_record:
            key = k_record["api_key"]
    if not key:
        active = get_active_api_key()
        if active:
            key = active["api_key"]

    agent = AIAgent(provider=req.provider, api_key=key)
    report = agent.generate_final_report(req.interview_data)
    
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
