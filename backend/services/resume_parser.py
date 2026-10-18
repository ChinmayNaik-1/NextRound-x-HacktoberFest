import io
from typing import Dict, Any, List

def parse_pdf_resume(file_bytes: bytes) -> Dict[str, Any]:
    text_content = ""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_content += t + "\n"
    except Exception as e:
        text_content = f"Error parsing PDF: {str(e)}"
        
    return summarize_resume(text_content)

def summarize_resume(raw_text: str) -> Dict[str, Any]:
    # Extract common sections and skills
    common_skills = [
        "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js", "Docker",
        "Kubernetes", "AWS", "SQL", "PostgreSQL", "MongoDB", "Git", "REST APIs", "FastAPI",
        "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "NLP", "LLM", "System Design"
    ]
    detected_skills = [s for s in common_skills if s.lower() in raw_text.lower()]
    
    return {
        "raw_text": raw_text.strip(),
        "char_count": len(raw_text),
        "detected_skills": detected_skills,
        "summary": raw_text[:500] + ("..." if len(raw_text) > 500 else "")
    }
