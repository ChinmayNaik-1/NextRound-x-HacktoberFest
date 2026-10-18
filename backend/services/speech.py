import io
import os
import re
import requests
from typing import Dict, Any, Optional

def clean_transcript_text(raw_text: str) -> str:
    if not raw_text:
        return ""
    text = raw_text.strip().strip('"').strip("'").strip("`")
    # Filter common Gemini hallucinations on silent/empty audio (e.g. '00:00', '0000', '00:01')
    if re.match(r"^[0-9:\s\.\-_]+$", text) and len(text) <= 8:
        return ""
    if text.lower() in [
        "silence", "(silence)", "none", "(none)", "(no speech)",
        "(no speech detected)", "no audio", "empty", "subtitles by",
        "thank you for watching", "transcript", ""
    ]:
        return ""
    return text

def transcribe_audio_file(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    provider: str = "gemini",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    if not audio_bytes or len(audio_bytes) < 100:
        return {"transcript": "", "status": "success", "note": "Empty audio stream"}

    prov = (provider or "gemini").lower().strip()
    if not api_key:
        return {"transcript": "", "error": "No API key configured for speech transcription. Please save your API key on the home screen."}
    
    clean_mime = mime_type.split(";")[0].strip() or "audio/webm"

    # 1. Gemini Multimodal Audio Transcribe
    if prov == "gemini":
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            # Prioritize fast, active models
            candidate_models = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"]
            
            prompt = (
                "You are an accurate speech-to-text transcriber for a live software engineering interview. "
                "Transcribe all spoken English words in this audio exactly as uttered. "
                "Do NOT output timestamps (e.g. 00:00). "
                "Do NOT add quotes, markdown, introduction, or commentary. "
                "If the audio contains only silence, background noise, or no recognizable words, return an empty string."
            )
            
            for m_name in candidate_models:
                try:
                    model = genai.GenerativeModel(m_name)
                    response = model.generate_content([
                        {"mime_type": clean_mime, "data": audio_bytes},
                        prompt
                    ])
                    # Safely extract text without relying on response.text quick accessor
                    raw_text = ""
                    if response and hasattr(response, "candidates") and response.candidates:
                        for cand in response.candidates:
                            if hasattr(cand, "content") and hasattr(cand.content, "parts"):
                                for part in cand.content.parts:
                                    if hasattr(part, "text") and part.text:
                                        raw_text += part.text + " "
                    elif response:
                        try:
                            raw_text = getattr(response, "text", "") or ""
                        except Exception:
                            raw_text = ""

                    cleaned = clean_transcript_text(raw_text)
                    return {"transcript": cleaned, "status": "success", "model": m_name}
                except Exception as inner_ex:
                    print(f"[Gemini Transcribe {m_name} Error]: {inner_ex}")
                    continue
            return {"transcript": "", "error": "Gemini models were unable to transcribe audio."}
        except Exception as e:
            return {"transcript": "", "error": f"Gemini Transcription Error: {str(e)}"}
            
    # 2. Groq Whisper (Whisper-large-v3, sub-second transcription)
    elif prov == "groq":
        try:
            files = {"file": ("audio.webm", audio_bytes, clean_mime)}
            data = {"model": "whisper-large-v3", "language": "en"}
            headers = {"Authorization": f"Bearer {api_key}"}
            res = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data,
                timeout=15
            )
            if res.status_code == 200:
                raw_text = res.json().get("text", "")
                return {"transcript": clean_transcript_text(raw_text), "status": "success"}
            return {"transcript": "", "error": f"Groq Whisper Error: {res.text}"}
        except Exception as e:
            return {"transcript": "", "error": f"Groq Audio Error: {str(e)}"}

    # 3. OpenAI Whisper
    elif prov == "openai":
        try:
            files = {"file": ("audio.webm", audio_bytes, clean_mime)}
            data = {"model": "whisper-1", "language": "en"}
            headers = {"Authorization": f"Bearer {api_key}"}
            res = requests.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data,
                timeout=15
            )
            if res.status_code == 200:
                raw_text = res.json().get("text", "")
                return {"transcript": clean_transcript_text(raw_text), "status": "success"}
            return {"transcript": "", "error": f"OpenAI Whisper Error: {res.text}"}
        except Exception as e:
            return {"transcript": "", "error": f"OpenAI Audio Error: {str(e)}"}

    return {"transcript": "", "error": f"Unsupported speech provider: {provider}"}
