import io
import os
import requests
from typing import Dict, Any, Optional

def transcribe_audio_file(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    provider: str = "gemini",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    prov = (provider or "gemini").lower().strip()
    if not api_key:
        return {"transcript": "", "error": "No API key configured for speech transcription."}
    
    # Clean mime type (e.g. 'audio/webm;codecs=opus' -> 'audio/webm')
    clean_mime = mime_type.split(";")[0].strip() or "audio/webm"

    # 1. Gemini Multimodal Audio Transcribe
    if prov == "gemini":
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            # Models known to be responsive and supporting audio inputs
            candidate_models = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"]
            
            prompt = (
                "Transcribe this spoken audio recording accurately into clean English text. "
                "Return ONLY the exact spoken words without any introductory words, commentary, quotation marks, or markdown. "
                "If silent, return an empty string."
            )
            
            for m_name in candidate_models:
                try:
                    model = genai.GenerativeModel(m_name)
                    response = model.generate_content([
                        {"mime_type": clean_mime, "data": audio_bytes},
                        prompt
                    ])
                    if response and response.text:
                        text = response.text.strip().strip('"').strip("'")
                        if text == "(Silence)" or text.lower() == "silence":
                            text = ""
                        return {"transcript": text, "status": "success", "model": m_name}
                except Exception as inner_ex:
                    print(f"[Gemini Transcribe {m_name} Error]: {inner_ex}")
                    continue
            return {"transcript": "", "error": "Gemini models were unable to process audio stream."}
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
                text = res.json().get("text", "").strip()
                return {"transcript": text, "status": "success"}
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
                text = res.json().get("text", "").strip()
                return {"transcript": text, "status": "success"}
            return {"transcript": "", "error": f"OpenAI Whisper Error: {res.text}"}
        except Exception as e:
            return {"transcript": "", "error": f"OpenAI Audio Error: {str(e)}"}

    return {"transcript": "", "error": f"Unsupported speech provider: {provider}"}
