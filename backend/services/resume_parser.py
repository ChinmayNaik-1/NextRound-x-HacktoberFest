import io
import re
from typing import Any, Dict


SKILLS = [
    "Python",
    "Java",
    "C++",
    "C#",
    "Go",
    "Rust",
    "Kotlin",
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Spring Boot",
    "Django",
    "Flask",
    "FastAPI",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Kafka",
    "Git",
    "REST",
    "GraphQL",
    "gRPC",
    "Machine Learning",
    "Deep Learning",
    "PyTorch",
    "TensorFlow",
    "NLP",
    "LLM",
    "System Design",
    "Microservices",
    "CI/CD",
    "Linux",
]


def _has(
    skill: str,
    text: str,
) -> bool:

    return (
        re.search(
            r"(?<![A-Za-z0-9+#.])"
            + re.escape(skill)
            + r"(?![A-Za-z0-9+#])",
            text,
            re.I,
        )
        is not None
    )


def parse_pdf_resume(
    file_bytes: bytes,
) -> Dict[str, Any]:

    try:
        from pypdf import PdfReader

        reader = PdfReader(
            io.BytesIO(file_bytes)
        )

        text = "\n".join(
            (
                page.extract_text()
                or ""
            )
            for page in reader.pages
        )

    except Exception as e:
        raise ValueError(
            f"Could not read this PDF: {e}"
        )

    if len(text.strip()) < 30:
        raise ValueError(
            "No selectable text found. "
            "This looks like a scanned PDF; "
            "paste the text instead."
        )

    return summarize_resume(text)


def summarize_resume(
    raw_text: str,
) -> Dict[str, Any]:

    text = raw_text.strip()

    return {
        "raw_text": text,
        "char_count": len(text),
        "detected_skills": [
            s
            for s in SKILLS
            if _has(s, text)
        ],
        "summary": (
            text[:500]
            + (
                "..."
                if len(text) > 500
                else ""
            )
        ),
    }