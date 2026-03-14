# SchutzKI 🛡️ – KI-Versicherungsberater

![versicherungs-chat](docs/screenshots/versicherungs-chat.png)

**SchutzKI** ist ein voll funktionsfähiger deutscher Versicherungs-Chatbot mit **RAG**, **Prompt Engineering Tools**, **A/B-Testing** und **automatisierten Evaluationsmetriken** (ROUGE, Faithfulness). Gebaut mit **FastAPI**, **MongoDB**, **Ollama** (GLM-4.7-Flash) und **React**.

## 🚀 Demo Screenshots

| Feature | Screenshot |
|---------|------------|
| **RAG-Chatbot**<br>Versicherungsberatung zu Haftpflicht, KFZ, Hausrat | ![Chat](docs/screenshots/versicherungs-chat.png) |
| **Persönliche Empfehlungen**<br>Intelligente Versicherungsempfehlungen | ![Empfehlung](docs/screenshots/persönliche-empfehlung.png) |
| **Prompt Lab**<br>A/B-Tests verschiedener System-Prompts | ![A/B-Test](docs/screenshots/a:b-experiment.png) |
| **Auto-Evaluation**<br>ROUGE-Scores, Keyword-Faithfulness | ![Evaluation](docs/screenshots/promptlab_auto-evaluation.png) |
| **Quality Dashboard**<br>Live-Metriken & Performance | ![Dashboard](docs/screenshots/quality-dashboard.png) |

## 🏗️ Tech Stack

Frontend: React + Tailwind + shadcn/ui
Backend: FastAPI + Motor (async MongoDB) + Pydantic v2
LLM: Google Gemini OR Ollama + GLM-4.7-Flash (lokal auf M4 Pro)
Evaluation: ROUGE, Faithfulness
Database: MongoDB Atlas 


## 🛠️ Quick Start

```bash
# Terminal 1 - Backend
cd backend && source ../Downloads/.venv/bin/activate
uvicorn server:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && npm start

# Terminal 3 - Ollama
ollama serve

📊 Ergebnisse
ROUGE-L: 0.45–0.62 (Few-Shot vs Chain-of-Thought)

Faithfulness: 78% Keyword-Overlap

Response Time: <3s auf M4 Pro Mac mini

4 Prompt-Strategien evaluiert
```
⭐ Star this repo if you like production-grade LLM engineering!
🔗 Portfolio https://kagandurmus.vercel.app
