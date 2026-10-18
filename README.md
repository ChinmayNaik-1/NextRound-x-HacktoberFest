<div align="center">

<img width="128" alt="NextRound" src="https://github.com/user-attachments/assets/13d17d5c-6545-467f-bb3a-c34e7fc7bf0c" />
   
<h1> NextRound </h1>

</div>

### AI-Powered Open Interview Practice Platform

> **Practice. Interview. Learn. Improve. Repeat.**

NextRound is an **open-source AI-powered interview platform** that turns interview preparation into an interactive, realistic experience.

Instead of simply solving static coding problems or reading interview questions, candidates can enter a complete simulated interview where an AI interviewer asks questions, evaluates coding submissions, follows up on answers, and generates an evidence-based performance report.

The goal is simple:

**Make high-quality interview practice more accessible, reusable, and collaborative.**

---


## Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [What Makes NextRound Different?](#-what-makes-nextround-different)
- [Evidence-Based Evaluation](#-evidence-based-evaluation)
- [AI for Open Innovation](#-ai-for-open-innovation)
- [Open by Design](#-open-by-design)
- [Multi-Provider AI Architecture](#-multi-provider-ai-architecture)
- [Open Source Architecture](#-open-source-architecture)
- [Interview Question Pipeline](#-interview-question-pipeline)
- [Coding Experience](#-coding-experience)
- [Conversational Interview](#-conversational-interview)
- [Candidate Performance Report](#-candidate-performance-report)
- [What Happens at 100× Scale?](#-what-happens-at-100-scale)
- [Project Structure](#-project-structure)
- [Installation](#installation)
  - [Clone the repository](#1-clone-the-repository)
  - [Backend setup](#2-backend-setup)
  - [Frontend setup](#3-frontend-setup)
- [AI Provider Configuration](#-ai-provider-configuration)
- [API Key Handling](#-api-key-handling)
- [AI Safety & Reliability](#-ai-safety--reliability)
- [Future Roadmap](#-future-roadmap)
  - [Community Question Marketplace](#-community-question-marketplace)
  - [Community Contributions](#-community-contributions)
  - [Multilingual Interviews](#-multilingual-interviews)
  - [Campus Mode](#-campus-mode)
  - [Learning Loop](#-learning-loop)
- [Contributing](#-contributing)
- [Contribution Ideas](#-contribution-ideas)
- [Why Open Source Matters](#-why-open-source-matters)
- [Alignment with "AI for Open Innovation"](#-alignment-with-ai-for-open-innovation)
  - [Makes knowledge and opportunities more accessible](#1-makes-knowledge-and-opportunities-more-accessible)
  - [Makes AI useful for a real group of users](#2-makes-ai-useful-for-a-real-group-of-users)
  - [Easy for others to build upon](#3-easy-for-others-to-build-upon)
  - [Open and collaborative](#4-open-and-collaborative)
- [Impact](#-impact)
- [Vision](#-vision)
- [Built for Hacktoberfest](#-built-for-hacktoberfest)
- [License](#-license)
- [Team](#-team)


---

## 🌍 The Problem

Interview preparation is often fragmented.

A candidate may need to use:

- One platform for coding practice
- Another for interview questions
- YouTube for technical preparation
- Mock interviews with friends
- Separate tools for communication practice
- Manual spreadsheets to track progress

More importantly, realistic interview practice is difficult to access.

A candidate may know how to solve LeetCode problems but still struggle when an interviewer asks:

> "Why did you choose this approach?"

or

> "What is the time complexity?"

or

> "What happens if the input becomes 100× larger?"

Traditional coding platforms are excellent at evaluating whether code produces the correct answer.

They are not designed to simulate the **entire interview conversation**.

### The accessibility problem

High-quality mock interviews can also be difficult to access because they often require:

- Paid interview platforms
- Human interviewers
- Mentors
- College placement programs
- Expensive preparation services

This creates a gap between **learning a solution** and **performing in an actual interview**.

---

# 💡 Our Solution

## NextRound

NextRound provides an AI interviewer that can conduct an interview from beginning to end.

A candidate can configure:

- Target company
- Job role
- Difficulty
- Interview rounds
- Resume/context
- AI provider

The platform then guides the candidate through an interview experience containing multiple rounds such as:

```text
Candidate
   │
   ▼
Interview Setup
   │
   ├── DSA Round 1
   │
   ├── DSA Round 2
   │
   ├── Technical Round
   │
   └── HR Round
   │
   ▼
AI Evaluation
   │
   ▼
Performance Report
```

The important part is that **the candidate is not just answering predefined questions**.

The AI interviewer reacts to what the candidate actually says and can ask relevant follow-up questions.

---

# 🧠 What Makes NextRound Different?

NextRound combines several parts of interview preparation into one open platform.

### 1. AI Interviewer

The AI acts as an interviewer rather than simply answering questions.

It can:

- Ask interview questions
- Ask follow-up questions
- Probe the candidate's reasoning
- Challenge assumptions
- Discuss complexity
- Explore edge cases
- Ask about projects
- Conduct technical discussions
- Conduct HR-style conversations

The interviewer is instructed to react to the candidate's actual response rather than blindly following a fixed script.

---

### 2. Multi-Round Interviews

Real interviews rarely consist of a single question.

NextRound supports a complete interview flow:

| Round | Focus |
|---|---|
| DSA Round 1 | Problem solving & coding |
| DSA Round 2 | Advanced problem solving |
| Technical | CS fundamentals & projects |
| HR | Communication, ownership & behavioral questions |

Users can select the rounds they want to practice.

---

### 3. Real Code Evaluation

For coding rounds, candidates write actual code instead of simply explaining an answer.

The submitted solution can be evaluated against test cases.

The system can track:

- Passed test cases
- Failed test cases
- Compilation errors
- Runtime failures
- Output correctness

This provides objective evidence that complements the AI's qualitative feedback.

---

### 4. AI Code Review

After the coding submission, the AI reviews the candidate's solution.

It can analyze:

- Time complexity
- Space complexity
- Approach
- Code quality
- Strengths
- Potential improvements
- Edge cases
- Follow-up questions

This allows the candidate to understand **why** their solution performed well or poorly.

---

# 🎯 Evidence-Based Evaluation

One of the core design principles of NextRound is:

> **The AI should evaluate evidence, not invent performance.**

For coding rounds, the score can be derived from actual execution results.

For conversational rounds, the AI evaluates the available transcript.

The final report combines these signals into a structured evaluation.

Example:

```text
                    Interview
                       │
          ┌────────────┴────────────┐
          │                         │
      Code Evidence          Conversation
          │                         │
   Test Results              Transcript
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
                AI Evaluation
                       │
                       ▼
             Candidate Report
```

The final report includes:

- Overall score
- Hiring recommendation
- Round-by-round scores
- Competency metrics
- Strengths
- Weaknesses
- Actionable preparation tips
- Recommended resources

---

# 🌐 AI for Open Innovation

NextRound is built around the idea that **AI should lower the barrier to high-quality participation**.

Interview preparation is an area where access to feedback can strongly affect outcomes.

A student with access to experienced interviewers can practice:

- Explaining their thought process
- Handling follow-up questions
- Defending technical decisions
- Discussing trade-offs
- Communicating under pressure

A student without that access may only have static problem sets.

NextRound attempts to make this feedback loop available through an **open, reusable AI system**.

---

# 🔓 Open by Design

NextRound is not intended to be a closed AI product.

The project is designed as an open building block that developers, students, communities and educational organizations can extend.

Developers can modify:

- AI providers
- Interview prompts
- Interview rounds
- Question sources
- Evaluation logic
- Coding languages
- Test generation
- Scoring systems
- UI
- Proctoring behavior

The architecture separates the AI layer from the interview experience so that contributors can experiment with different models and approaches.

---

# 🔌 Multi-Provider AI Architecture

NextRound is designed around a provider abstraction rather than locking the application to one AI model.

Currently supported providers include:

- Google Gemini
- OpenAI
- Groq
- Anthropic

The application can select the configured provider and model through the AI agent layer.

Conceptually:

```text
                 NextRound
                     │
                AI Agent
                     │
       ┌─────────────┼─────────────┐
       │             │             │
    Gemini        OpenAI         Groq
       │             │             │
       └─────────────┼─────────────┘
                     │
                 AI Response
```

This makes the platform adaptable as models improve.

A contributor can also add another provider without rebuilding the entire interview system.

---

# 🧩 Open Source Architecture

NextRound uses a frontend/backend architecture.

```text
┌──────────────────────────────────────┐
│              Frontend                │
│             React + Vite             │
│                                      │
│  Landing → Setup → Interview →      │
│                    Results           │
└──────────────────┬───────────────────┘
                   │ REST API
                   ▼
┌──────────────────────────────────────┐
│               Backend                │
│              FastAPI                 │
│                                      │
│  Interview Management                │
│  AI Agent                            │
│  Question Generation                 │
│  Code Evaluation                     │
│  Session Management                  │
│  Evaluation                          │
└───────────────┬───────────┬──────────┘
                │           │
                ▼           ▼
           AI Providers   Code Sandbox
```

### Frontend

Built with:

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

### Backend

Built with:

- Python
- FastAPI
- Uvicorn

### AI Layer

The `AIAgent` abstraction provides a common interface for different LLM providers.

This keeps application logic independent from a particular model vendor.

### Code Execution

Coding submissions are processed through a sandboxed execution layer that can run candidate programs against generated test cases.

---

# 🧪 Interview Question Pipeline

NextRound can obtain interview problems and prepare them for automated evaluation.

The question pipeline is designed around verification rather than blindly trusting generated test cases.

```text
Question Source
      │
      ▼
Problem + Signature
      │
      ▼
AI-assisted Test Generation
      │
      ▼
Reference Solution
      │
      ▼
Sandbox Execution
      │
      ▼
Validation
      │
      ▼
Verified Test Set
      │
      ▼
Candidate
```

The reference implementation provides expected outputs for generated inputs.

This allows the platform to automatically construct tests instead of requiring every problem to have a manually authored test suite.

---

# 💻 Coding Experience

The DSA experience is designed to resemble an actual technical interview.

The candidate receives:

```text
Problem Statement

        ↓

Code Editor

        ↓

Run Code

        ↓

Test Results

        ↓

Submit

        ↓

AI Code Review
```

The candidate can see the result of their implementation and use the feedback to improve their reasoning.

The system can distinguish between:

- Successful execution
- Wrong answers
- Compilation errors
- Runtime errors
- Failed test cases

---

# 🎤 Conversational Interview

The technical and HR rounds are conversational.

The AI receives the conversation context and generates the next interviewer response.

For example:

```text
AI:
"Walk me through your approach."

Candidate:
"I would use a hash map to store..."

AI:
"Why is a hash map preferable here?
What is the expected time complexity?"
```

This creates a feedback loop closer to an actual interview than a static question-answer interface.

---

# 📊 Candidate Performance Report

At the end of the interview, NextRound generates a structured report.

### Overall evaluation

```text
Overall Score
     82 / 100

Recommendation
     Hire
```

### Round breakdown

```text
DSA Round 1       90
DSA Round 2       78
Technical         81
HR                76
```

### Competency metrics

The system evaluates areas such as:

- Problem solving
- System architecture
- Code quality
- Communication
- Cultural fit

The report also provides:

### Strengths

What the candidate demonstrated well.

### Weaknesses

Areas where the candidate struggled.

### Actionable Tips

Concrete preparation steps instead of generic feedback.

### Recommended Resources

The candidate receives resources relevant to improving their preparation.

---

# ♻️ Designed for Reuse

The platform is intentionally designed so that the same infrastructure can support many different use cases.

### Students

Practice placement interviews independently.

### Universities

Provide mock interview infrastructure to students.

### Open-source communities

Create contributor screening or technical evaluation workflows.

### Developer communities

Run community-driven interview preparation sessions.

### Bootcamps

Give learners unlimited AI-based mock interviews.

### Companies

Experiment with internal technical assessment workflows.

### Hackathon teams

Extend the platform with their own interview formats, models or evaluation methods.

---

# 🌍 What Happens at 100× Scale?

The system is designed with separation between the UI, API, AI layer and code execution layer.

At larger scale, these components can be independently scaled.

```text
                  Load Balancer
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Backend      Backend      Backend
          │            │            │
          └────────────┼────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
          AI Queue          Code Queue
              │                 │
              ▼                 ▼
        AI Workers        Sandbox Workers
```

Potential future scaling improvements include:

- Background job queues
- Redis-based session state
- Distributed code execution
- Worker pools
- Persistent databases
- AI response caching
- Rate limiting
- Horizontal backend scaling
- Dedicated sandbox workers

This separation allows expensive workloads such as AI inference and code execution to scale independently.

---

# 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend | FastAPI |
| Backend Language | Python |
| Server | Uvicorn |
| AI | Gemini / OpenAI / Groq / Anthropic |
| Code Execution | Sandbox |
| API | REST |
| Icons | Lucide |
| Desktop Runtime | Electron |

---

# 📁 Project Structure

```text
NextRound-x-HacktoberFest/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.*
│
├── backend/
│   ├── services/
│   │   ├── ai_agent.py
│   │   ├── code_runner.py
│   │   ├── sandbox.py
│   │   ├── signature.py
│   │   ├── leetcode_source.py
│   │   └── db.py
│   │
│   ├── main.py
│   ├── requirements.txt
│   └── venv/
│
├── electron/
│
└── README.md
```

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>

cd NextRound-x-HacktoberFest
```

---

## 2. Backend setup

```bash
cd backend

python -m venv venv
```

Activate the environment:

### Linux / macOS

```bash
source venv/bin/activate
```

### Windows

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Frontend setup

From the project root:

```bash
cd frontend
npm install
```

---

# 🔑 AI Provider Configuration

NextRound supports multiple AI providers.

You can configure an API key through the application's key management interface.

The backend uses a provider abstraction:

```python
agent = AIAgent(
    provider="gemini",
    api_key=api_key
)
```

The provider can then be changed without modifying the interview logic.

---

# ▶️ Running the Application

Start the development environment using the project's configured command:

```bash
npm run dev
```

The frontend is available at:

```text
http://127.0.0.1:5173/
```

The FastAPI backend runs at:

```text
http://127.0.0.1:8000
```

API health can be checked through:

```text
/api/health
```

---

# 🔐 API Key Handling

API keys are treated as user-provided configuration rather than hard-coded application secrets.

**Never commit API keys to GitHub.**

Use environment variables or the application's key-management flow where appropriate.

Example:

```bash
export GEMINI_API_KEY="your-key"
```

---

# 🧑‍💻 Example Interview Flow

A typical session looks like:

```text
1. Open NextRound

2. Configure interview
   ├── Company: Google
   ├── Role: Software Engineer
   ├── Difficulty: Medium
   └── Rounds: DSA + Technical + HR

3. Start interview

4. DSA Round
   ├── Receive problem
   ├── Write solution
   ├── Run code
   └── Submit

5. Technical Round
   ├── AI asks questions
   ├── Candidate responds
   └── AI follows up

6. HR Round
   ├── Behavioral questions
   └── Candidate responses

7. Evaluation

8. Final report
```

---

# 🤖 AI Safety & Reliability

LLM-generated content is treated as untrusted input.

For example, candidate code and interview transcripts are explicitly separated from system instructions.

The AI evaluation layer is instructed to:

- Evaluate only provided evidence
- Avoid inventing candidate performance
- Treat candidate content as data
- Generate structured JSON
- Follow the configured interview format

For coding problems, generated test cases are additionally executed against a reference implementation before being used for evaluation.

This creates a second verification layer rather than relying entirely on LLM output.

---

# 🔮 Future Roadmap

NextRound is intentionally built as a foundation that can grow beyond the current implementation.

### 🎙️ Voice Interviews

Allow candidates to speak naturally with the AI interviewer.

```text
Speech
  ↓
Speech-to-Text
  ↓
AI Interviewer
  ↓
Text-to-Speech
  ↓
Candidate
```

This would make the experience closer to a real interview.

---

### 🌐 Community Question Marketplace

Allow contributors to publish interview question packs.

Examples:

```text
Google Backend Interview Pack
Java Spring Boot Pack
Startup SDE Pack
Campus Placement Pack
System Design Pack
Open Source Maintainer Pack
```

Other users could reuse and improve these packs.

---

### 🧩 Community Contributions

Developers could contribute:

- Question generators
- Interview prompts
- Evaluation rubrics
- Coding languages
- AI providers
- Test generators
- UI components
- Voice providers
- Industry-specific interview flows

---

### 🌎 Multilingual Interviews

AI can potentially reduce language barriers by supporting interviews in multiple languages.

This can help candidates who are technically strong but less comfortable interviewing in English.

---

### 🏫 Campus Mode

Universities could deploy their own interview environments.

For example:

```text
University
    │
    ├── Students
    ├── Interview Templates
    ├── Question Banks
    └── Performance Analytics
```

This could provide scalable mock-interview infrastructure without requiring a human interviewer for every session.

---

### 📈 Learning Loop

A future version could turn interview results into personalized preparation plans.

```text
Interview
    ↓
Weakness Detection
    ↓
Personalized Topics
    ↓
Practice Problems
    ↓
Another Interview
    ↓
Measure Improvement
```

Instead of simply telling candidates what they did wrong, the system can help them **close the gap**.

---

# 🤝 Contributing

NextRound is an open-source project and contributions are welcome.

You can contribute by:

1. Forking the repository
2. Creating a feature branch
3. Making your changes
4. Testing locally
5. Opening a pull request

Example:

```bash
git checkout -b feature/new-interview-mode

git add .

git commit -m "Add new interview mode"

git push origin feature/new-interview-mode
```

Then open a Pull Request.

---

# 💬 Contribution Ideas

Looking for something to contribute?

Here are some areas where the project can grow:

### Beginner

- Improve UI components
- Add interview resources
- Improve error messages
- Add question categories
- Improve documentation

### Intermediate

- Add another LLM provider
- Add another programming language
- Improve test generation
- Add question caching
- Improve scoring

### Advanced

- Distributed sandbox execution
- Voice interview pipeline
- Streaming AI responses
- Retrieval-augmented interview questions
- Personalized interview generation
- Community question marketplace
- Multi-user deployments

---

# 🔍 Why Open Source Matters

The value of NextRound is not limited to the application itself.

The project provides reusable building blocks for AI-powered assessment:

```text
AI Interviewer
       +
Question Retrieval
       +
Code Execution
       +
Automated Evaluation
       +
Performance Analytics
```

Developers can take individual components and build new systems on top of them.

For example:

> A university could use the interview engine for placement preparation.

> An open-source community could use the conversational evaluator for contributor onboarding.

> A bootcamp could create its own interview curriculum.

> A developer could add a completely different AI provider.

That is the core idea behind the project:

**Build once. Open it up. Let others extend it.**

---

# 🏆 Alignment with "AI for Open Innovation"

## 1. Makes knowledge and opportunities more accessible

NextRound gives candidates access to an interactive interview experience without requiring a human interviewer for every practice session.

---

## 2. Makes AI useful for a real group of users

The primary users are:

- Students
- Job seekers
- Developers
- Open-source contributors
- Universities
- Developer communities

The system addresses a concrete problem: **lack of accessible, realistic interview practice and feedback.**

---

## 3. Easy for others to build upon

The project separates:

```text
UI
│
API
│
Interview Logic
│
AI Provider
│
Code Execution
│
Evaluation
```

This allows contributors to replace or extend individual components.

---

## 4. Open and collaborative

The project is open source and designed around community contribution.

Instead of building another closed interview platform, NextRound aims to provide an extensible foundation that others can modify for their own communities and use cases.

---

# 📊 Impact

The potential impact is not just the number of interviews completed.

The larger goal is reducing the gap between:

```text
"I know the answer."

             and

"I can explain and defend my answer in an interview."
```

NextRound focuses on the second problem.

A candidate should be able to repeatedly practice:

**Solve → Explain → Defend → Receive Feedback → Improve → Repeat**

without needing access to an interviewer every time.

---

# 🚀 Vision

We believe interview preparation should not depend on who you know, where you study, or whether you can afford repeated mock interviews.

AI can make high-quality practice more available.

Open source can make that technology reusable.

Community contributions can make it better.

NextRound brings these ideas together into one platform.

> **An open AI interviewer that anyone can run, extend, improve and build upon.**

---

# ⭐ Built for Hacktoberfest

NextRound was built with the spirit of open source at its core.

The project is intended to be more than a demonstration:

**it is a starting point for an open ecosystem around AI-powered interview preparation.**

If you are a student, developer, educator, interviewer, or open-source contributor, you can help shape what comes next.

---

## 📜 License

This project is open source.

See the repository's license for details.

---

## 👥 Team

Built by the NextRound team for Hacktoberfest.

**Let's make interview preparation more accessible, collaborative, and open.**

⭐ Star the repository if you find the project useful.

🤝 Contributions are welcome.

🚀 Let's build the next round together.
