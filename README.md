# 🚀 NextRound — Local AI Mock Interview Platform

> A local, open-source AI mock interview desktop application built with **Electron + React** (frontend) and **FastAPI** (backend), designed with the visual aesthetics and design language of **[Google Antigravity](https://antigravity.google/)**.

---

## ✨ Features

- **🎨 Google Antigravity Theme**: Clean white canvas, bold Google Sans Flex typography, Google Sans Code for Monaco editor, multicolor floating confetti particles, and dark pill CTA buttons.
- **🛡️ Fullscreen Anti-Cheat / Proctoring Guard**:
  - Monitors tab-switching, escaping fullscreen, and window blur.
  - **Warning 1 / 3**: Yellow focus lost notification.
  - **Warning 2 / 3**: Orange second violation warning.
  - **Warning 3 / 3**: Auto-terminates interview session and locks submission into evaluation.
- **💻 Round 1 — DSA Coding (25 Minutes)**:
  - 2-minute greeting and problem intro by the AI agent.
  - LeetCode-style problem display tailored to target company (Google, Amazon, Meta, Microsoft, Apple, Uber, Netflix).
  - Embedded **Monaco Editor** with language support for **Python, C++, and Java**.
  - **10 Test Cases**: 5 Open (visible input/output) + 5 Hidden test cases.
  - **Live Code Execution**: Local fast execution engine with execution time in ms, memory checks, and syntax error tracing.
  - **AI Approach Analysis**: Evaluates time complexity ($O(N)$), space complexity, edge cases, and asks verbal follow-up questions about candidate's code.
- **⚙️ Extra DSA Round 2 (Optional)**:
  - Configurable second algorithmic coding round.
- **🧠 Round 2 — Technical Deep-Dive (40 Minutes)**:
  - Voice-based 1-to-1 interview with live webcam preview PiP.
  - Tailored specifically to the candidate's uploaded resume (PDF or text) and target role (SDE or AI/ML).
  - Probes system design, database indexing, concurrency, and CS/AI fundamentals.
  - Candidate can skip or conclude the round anytime.
- **🤝 Round 3 — HR & Behavioral (20 Minutes)**:
  - 1-to-1 voice interview evaluating STAR method (Situation, Task, Action, Result), conflict resolution, culture fit, and leadership principles.
- **🎙️ Real-Time Voice Pipeline**:
  - Centered animated **AI Voice Orb** (pulsing when speaking, breathing when listening).
  - Integrated with Web Speech API (continuous SpeechRecognition + SpeechSynthesis) and backend LLM reasoning.
- **🔑 Flexible LLM Intelligence**:
  - **Default: Google Gemma / Gemini 2.0**.
  - Also supports OpenAI, Claude, and Groq.
  - **Local Key Storage**: Remembers previously used API keys securely in local SQLite database.
  - **Intelligent Offline Fallback**: Works seamlessly out of the box even without an API key!
- **📊 Comprehensive Scorecard & Assessment**:
  - Overall score (0-100) with animated Antigravity circular progress ring.
  - Per-round breakdown and feedback cards.
  - Competency radar breakdown (Problem Solving, System Architecture, Code Quality, Verbal Communication, Cultural Fit).
  - Observed Strengths & Areas for Improvement.
  - Actionable improvement tips and curated practice resources (NeetCode 150, System Design Primer, Books).
  - Full interview transcript viewer & printable PDF export.

---

## 🏗️ Architecture

```
interviewai/
├── backend/
│   ├── main.py                  # FastAPI server (port 8000)
│   ├── venv/                    # Dedicated Python virtual environment
│   ├── services/
│   │   ├── ai_agent.py          # Gemini / Gemma / OpenAI agent & report generator
│   │   ├── code_runner.py       # Python, C++, Java execution against test cases
│   │   ├── db.py                # Local SQLite persistence (interviewai.db)
│   │   ├── question_bank.py     # LeetCode-style company questions (10 test cases)
│   │   └── resume_parser.py     # PDF & text resume extraction
│   └── requirements.txt
│
├── frontend/
│   ├── electron/
│   │   ├── main.cjs             # Window management & proctoring blur detection
│   │   └── preload.cjs          # Secure context bridge
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraFeed.tsx   # Live candidate webcam PiP
│   │   │   ├── FullscreenGuard.tsx # Anti-cheat 3-warning enforcement
│   │   │   ├── Header.tsx       # Antigravity logo & status bar
│   │   │   ├── ParticleCanvas.tsx # Google Antigravity confetti particles
│   │   │   └── VoiceOrb.tsx     # Animated speech visualizer orb
│   │   ├── screens/
│   │   │   ├── SetupScreen.tsx  # Initial candidate, company & LLM setup
│   │   │   ├── DSARoundScreen.tsx # 25-min Monaco editor + test cases + AI Q&A
│   │   │   ├── TechnicalRoundScreen.tsx # 40-min voice deep-dive
│   │   │   ├── HRRoundScreen.tsx # 20-min behavioral interview
│   │   │   └── ResultsScreen.tsx # Comprehensive score card & roadmap
│   │   ├── services/
│   │   │   └── api.ts           # FastAPI client & speech synthesis
│   │   ├── App.tsx              # State machine router
│   │   ├── main.tsx             # React entry point
│   │   └── index.css            # Antigravity theme variables & fonts
│   ├── package.json
│   └── vite.config.ts
│
├── run.bat                      # One-click Windows launcher
└── run.ps1                      # One-click PowerShell launcher
```

---

## 🚀 Quick Start

### 1. Launch with One Click
Double click:
```bash
run.bat
```
Or in PowerShell:
```powershell
.\run.ps1
```

### 2. Manual Launch

#### Start Backend:
```powershell
cd d:\hacktoberfest\backend
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

#### Start Frontend (Electron App):
```powershell
cd d:\hacktoberfest\frontend
npm run electron:dev
```

---

## 🧪 Testing Backend Services

Run the included integration test suite:
```powershell
cd d:\hacktoberfest\backend
.\venv\Scripts\python.exe test_integration.py
```
Expected output:
```
Testing Question Bank...
[PASS] Found question with 10 test cases.
Testing Code Runner (Python Two Sum)...
[PASS] Execution Report: 10/10 Passed! All passed: True
Testing AI Agent...
[PASS] Approach Analysis: O(N) estimated
[PASS] Follow-up Question: Can you explain your thought process?
[PASS] Generated Score Card: Overall Score = 84 (Strong Hire)

ALL BACKEND INTEGRATION TESTS PASSED 100%!
```
>>>>>>> 9722910 (Initial commit: InterviewAI desktop application end-to-end)
