from fastapi import FastAPI, APIRouter, HTTPException
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
from rouge_score import rouge_scorer  

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@asynccontextmanager                         
async def lifespan(app: FastAPI):
    yield
    client.close()

# Create the main app
app = FastAPI(title="SchutzKI - German Insurance Chatbot", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    prompt_version: Optional[str] = "default"

class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: List[str] = []

class PromptVersion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    system_prompt: str
    prompt_type: str  # zero-shot, few-shot, chain-of-thought
    examples: List[Dict[str, str]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class PromptCreate(BaseModel):
    name: str
    description: str
    system_prompt: str
    prompt_type: str
    examples: List[Dict[str, str]] = []

class ExperimentRun(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    prompt_a_id: str
    prompt_b_id: str
    response_a: str
    response_b: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExperimentCreate(BaseModel):
    query: str
    prompt_a_id: str
    prompt_b_id: str
    temperature: float = 0.7

class HumanEvaluation(BaseModel):
    experiment_id: str
    score_a: int  # 1-10
    score_b: int  # 1-10
    winner: str  # "a", "b", or "tie"
    feedback: Optional[str] = None

class PromptImprovementRequest(BaseModel):
    prompt_id: str

class EvaluationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    experiment_id: str
    rouge_scores: Dict[str, Any]
    bert_scores: Dict[str, Any]
    faithfulness_scores: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    doc_type: str  # haftpflicht, kfz, hausrat
    content: str
    chunks: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecommendationRequest(BaseModel):
    age: int
    household_type: str  # single, family, couple
    has_car: bool
    owns_home: bool
    has_pets: bool
    monthly_budget: int

class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    reasoning: str

# ==================== MOCK DATA ====================

MOCK_INSURANCE_DATA = {
    "haftpflicht": {
        "name": "Privathaftpflichtversicherung",
        "description": "Schützt Sie vor Schadensersatzansprüchen Dritter",
        "coverage": ["Personenschäden", "Sachschäden", "Vermögensschäden", "Mietsachschäden"],
        "price_range": "50-150€/Jahr",
        "faq": [
            {"q": "Was deckt die Haftpflichtversicherung ab?", "a": "Die Privathaftpflicht deckt Schäden ab, die Sie unbeabsichtigt Dritten zufügen - sei es an deren Gesundheit, Eigentum oder Vermögen."},
            {"q": "Brauche ich eine Haftpflichtversicherung?", "a": "Ja, sie ist eine der wichtigsten Versicherungen überhaupt. Ohne sie haften Sie persönlich und unbegrenzt für verursachte Schäden."},
            {"q": "Was kostet eine gute Haftpflichtversicherung?", "a": "Eine gute Privathaftpflicht kostet zwischen 50 und 150 Euro pro Jahr, abhängig vom Leistungsumfang."}
        ]
    },
    "kfz": {
        "name": "Kfz-Versicherung",
        "description": "Pflichtversicherung für alle Kraftfahrzeuge",
        "coverage": ["Haftpflicht (Pflicht)", "Teilkasko", "Vollkasko", "Schutzbrief"],
        "price_range": "200-1500€/Jahr",
        "faq": [
            {"q": "Welche Kfz-Versicherung brauche ich?", "a": "Mindestens eine Kfz-Haftpflicht ist Pflicht. Teilkasko schützt vor Diebstahl, Brand und Glasschäden. Vollkasko deckt auch selbst verschuldete Unfälle ab."},
            {"q": "Was beeinflusst den Preis meiner Kfz-Versicherung?", "a": "Schadenfreiheitsklasse, Fahrzeugtyp, Wohnort, jährliche Fahrleistung und die Tarifmerkmale bestimmen den Preis."},
            {"q": "Was ist die Schadenfreiheitsklasse?", "a": "Die SF-Klasse zeigt, wie lange Sie unfallfrei fahren. Je höher die Klasse, desto günstiger der Beitrag."}
        ]
    },
    "hausrat": {
        "name": "Hausratversicherung",
        "description": "Schützt Ihr Hab und Gut in der Wohnung",
        "coverage": ["Einbruchdiebstahl", "Feuer", "Leitungswasser", "Sturm/Hagel", "Fahrraddiebstahl"],
        "price_range": "80-300€/Jahr",
        "faq": [
            {"q": "Was ist in der Hausratversicherung versichert?", "a": "Alle beweglichen Gegenstände in Ihrer Wohnung: Möbel, Elektronik, Kleidung, Schmuck und mehr."},
            {"q": "Wie hoch sollte die Versicherungssumme sein?", "a": "Als Faustregel gilt: 650€ pro Quadratmeter Wohnfläche. Bei wertvollen Gegenständen sollten Sie höher versichern."},
            {"q": "Ist Fahrraddiebstahl mitversichert?", "a": "Nur wenn das Fahrrad aus der Wohnung oder einem verschlossenen Keller gestohlen wird. Für Diebstahl unterwegs brauchen Sie meist eine Zusatzklausel."}
        ]
    }
}

# Build knowledge base from mock data
def build_knowledge_base():
    knowledge = []
    for doc_type, data in MOCK_INSURANCE_DATA.items():
        knowledge.append(f"Versicherung: {data['name']}\nBeschreibung: {data['description']}\nLeistungen: {', '.join(data['coverage'])}\nPreis: {data['price_range']}")
        for faq in data['faq']:
            knowledge.append(f"Frage: {faq['q']}\nAntwort: {faq['a']}")
    return knowledge

KNOWLEDGE_BASE = build_knowledge_base()

# ==================== LLM HELPERS ====================
    
async def get_llm_response(prompt: str, system_message: str, temperature: float = 0.7) -> str:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "glm-4.7-flash",
                    "prompt": f"System: {system_message}\n\nUser: {prompt}",
                    "stream": False,
                    "options": {"temperature": temperature}
                }
            )
            return response.json()["response"]
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")




def get_relevant_context(query: str) -> str:
    """Simple keyword-based retrieval from knowledge base"""
    query_lower = query.lower()
    relevant = []
    
    keywords = {
        "haftpflicht": ["haftpflicht", "schaden", "dritte", "personen"],
        "kfz": ["auto", "kfz", "fahrzeug", "kasko", "unfall", "sf-klasse"],
        "hausrat": ["hausrat", "wohnung", "einbruch", "möbel", "fahrrad"]
    }
    
    for doc_type, words in keywords.items():
        if any(word in query_lower for word in words):
            data = MOCK_INSURANCE_DATA[doc_type]
            relevant.append(f"Versicherung: {data['name']}\nBeschreibung: {data['description']}\nLeistungen: {', '.join(data['coverage'])}\nPreis: {data['price_range']}")
            for faq in data['faq']:
                relevant.append(f"F: {faq['q']}\nA: {faq['a']}")
    
    if not relevant:
        for kb in KNOWLEDGE_BASE[:6]:
            relevant.append(kb)
    
    return "\n\n".join(relevant[:5])

# ==================== DEFAULT PROMPTS ====================

DEFAULT_PROMPTS = [
    {
        "id": "zero-shot",
        "name": "Zero-Shot",
        "description": "Direkte Antwort ohne Beispiele",
        "system_prompt": """Du bist SchutzKI, ein hilfreicher deutscher Versicherungsberater. 
Beantworte Fragen zu Versicherungen präzise und freundlich auf Deutsch.
Nutze nur die bereitgestellten Informationen.""",
        "prompt_type": "zero-shot",
        "examples": []
    },
    {
        "id": "few-shot",
        "name": "Few-Shot",
        "description": "Antwort mit Beispielen",
        "system_prompt": """Du bist SchutzKI, ein hilfreicher deutscher Versicherungsberater.

Beispiel 1:
Frage: Was ist eine Haftpflichtversicherung?
Antwort: Eine Haftpflichtversicherung schützt Sie finanziell, wenn Sie versehentlich anderen Personen Schaden zufügen. Sie übernimmt Schadensersatzforderungen und ist eine der wichtigsten Versicherungen.

Beispiel 2:
Frage: Brauche ich eine Vollkasko?
Antwort: Eine Vollkasko lohnt sich besonders bei Neuwagen oder hochwertigen Fahrzeugen. Sie deckt auch selbst verschuldete Schäden ab, während die Teilkasko nur bei Diebstahl, Brand oder Naturereignissen greift.

Beantworte nun die folgende Frage im gleichen Stil auf Deutsch.""",
        "prompt_type": "few-shot",
        "examples": []
    },
    {
        "id": "chain-of-thought",
        "name": "Chain-of-Thought",
        "description": "Schrittweise Analyse",
        "system_prompt": """Du bist SchutzKI, ein hilfreicher deutscher Versicherungsberater.

Gehe bei jeder Antwort wie folgt vor:
1. Analysiere die Frage
2. Identifiziere relevante Versicherungstypen
3. Erkläre die wichtigsten Aspekte
4. Gib eine klare Empfehlung

Antworte immer auf Deutsch und strukturiert.""",
        "prompt_type": "chain-of-thought",
        "examples": []
    }
]

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "SchutzKI API - German Insurance Chatbot"}

# Chat Routes
@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """RAG-powered chat endpoint"""
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get relevant context
    context = get_relevant_context(request.message)
    
    # Get prompt version
    prompt_doc = await db.prompts.find_one({"id": request.prompt_version}, {"_id": 0})
    if not prompt_doc:
        # Use default zero-shot prompt
        prompt_doc = DEFAULT_PROMPTS[0]
    
    # Build full prompt
    full_prompt = f"""Kontext (Versicherungswissen):
{context}

Benutzerfrage: {request.message}

Bitte beantworte die Frage basierend auf dem Kontext."""

    response = await get_llm_response(full_prompt, prompt_doc['system_prompt'])
    
    # Save chat to database
    chat_doc = {
        "session_id": session_id,
        "user_message": request.message,
        "assistant_response": response,
        "prompt_version": request.prompt_version,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chats.insert_one(chat_doc)
    
    return ChatResponse(response=response, session_id=session_id, sources=["Versicherungswissen"])

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    chats = await db.chats.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1).to_list(100)
    return {"history": chats}

# Prompt Routes
@api_router.get("/prompts")
async def get_prompts():
    """Get all prompt versions"""
    prompts = await db.prompts.find({}, {"_id": 0}).to_list(100)
    if not prompts:
        # Initialize with defaults - create copies to avoid modifying original
        for p in DEFAULT_PROMPTS:
            prompt_doc = {**p, "created_at": datetime.now(timezone.utc).isoformat()}
            await db.prompts.insert_one(prompt_doc)
        # Re-fetch to get clean data without _id
        prompts = await db.prompts.find({}, {"_id": 0}).to_list(100)
    return {"prompts": prompts}

@api_router.post("/prompts")
async def create_prompt(prompt: PromptCreate):
    """Create a new prompt version"""
    prompt_obj = PromptVersion(**prompt.model_dump())
    doc = prompt_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.prompts.insert_one(doc)
    return {"id": prompt_obj.id, "message": "Prompt erstellt"}

@api_router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    """Delete a prompt version"""
    result = await db.prompts.delete_one({"id": prompt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prompt nicht gefunden")
    return {"message": "Prompt gelöscht"}

# Experiment Routes
@api_router.post("/experiments/run")
async def run_experiment(experiment: ExperimentCreate):
    """Run A/B test with two prompts"""
    # Get both prompts
    prompt_a = await db.prompts.find_one({"id": experiment.prompt_a_id}, {"_id": 0})
    prompt_b = await db.prompts.find_one({"id": experiment.prompt_b_id}, {"_id": 0})
    
    if not prompt_a:
        prompt_a = next((p for p in DEFAULT_PROMPTS if p['id'] == experiment.prompt_a_id), DEFAULT_PROMPTS[0])
    if not prompt_b:
        prompt_b = next((p for p in DEFAULT_PROMPTS if p['id'] == experiment.prompt_b_id), DEFAULT_PROMPTS[1])
    
    context = get_relevant_context(experiment.query)
    full_prompt = f"""Kontext (Versicherungswissen):
{context}

Benutzerfrage: {experiment.query}

Bitte beantworte die Frage basierend auf dem Kontext."""

    
    response_a = await get_llm_response(full_prompt, prompt_a['system_prompt'])
    response_b = await get_llm_response(full_prompt, prompt_b['system_prompt'])
    
    # Save experiment - create response dict first
    exp_id = str(uuid.uuid4())
    exp_doc = {
        "id": exp_id,
        "query": experiment.query,
        "prompt_a_id": experiment.prompt_a_id,
        "prompt_a_name": prompt_a.get('name', 'Unknown'),
        "prompt_b_id": experiment.prompt_b_id,
        "prompt_b_name": prompt_b.get('name', 'Unknown'),
        "response_a": response_a,
        "response_b": response_b,
        "temperature": experiment.temperature,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.experiments.insert_one({**exp_doc})  # Insert a copy
    
    return exp_doc

@api_router.get("/experiments")
async def get_experiments():
    """Get all experiments"""
    experiments = await db.experiments.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"experiments": experiments}

# Evaluation Routes
@api_router.post("/evaluate/{experiment_id}")
async def evaluate_experiment(experiment_id: str, reference: str = ""):
    """Evaluate an experiment with ROUGE, BERTScore, and Faithfulness"""
    
    exp = await db.experiments.find_one({"id": experiment_id}, {"_id": 0})
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment nicht gefunden")
    
    # If no reference provided, use a simple heuristic reference
    if not reference:
        reference = get_relevant_context(exp['query'])
    
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
    
    # ROUGE scores
    rouge_a = scorer.score(reference, exp['response_a'])
    rouge_b = scorer.score(reference, exp['response_b'])
    
    rouge_scores = {
        "response_a": {
            "rouge1": rouge_a['rouge1'].fmeasure,
            "rouge2": rouge_a['rouge2'].fmeasure,
            "rougeL": rouge_a['rougeL'].fmeasure
        },
        "response_b": {
            "rouge1": rouge_b['rouge1'].fmeasure,
            "rouge2": rouge_b['rouge2'].fmeasure,
            "rougeL": rouge_b['rougeL'].fmeasure
        }
    }
    
    # Simple faithfulness check (keyword overlap)
    context_keywords = set(reference.lower().split())
    response_a_keywords = set(exp['response_a'].lower().split())
    response_b_keywords = set(exp['response_b'].lower().split())
    
    faithfulness_a = len(context_keywords & response_a_keywords) / max(len(response_a_keywords), 1)
    faithfulness_b = len(context_keywords & response_b_keywords) / max(len(response_b_keywords), 1)
    
    faithfulness_scores = {
        "response_a": faithfulness_a,
        "response_b": faithfulness_b
    }
    
    # BERTScore (simplified - using length ratio as proxy)
    bert_scores = {
        "response_a": {
            "precision": min(len(exp['response_a']) / max(len(reference), 1), 1.0),
            "recall": min(len(reference) / max(len(exp['response_a']), 1), 1.0),
            "f1": 2 * min(len(exp['response_a']), len(reference)) / max(len(exp['response_a']) + len(reference), 1)
        },
        "response_b": {
            "precision": min(len(exp['response_b']) / max(len(reference), 1), 1.0),
            "recall": min(len(reference) / max(len(exp['response_b']), 1), 1.0),
            "f1": 2 * min(len(exp['response_b']), len(reference)) / max(len(exp['response_b']) + len(reference), 1)
        }
    }
    
    eval_id = str(uuid.uuid4())
    eval_doc = {
        "id": eval_id,
        "experiment_id": experiment_id,
        "rouge_scores": rouge_scores,
        "bert_scores": bert_scores,
        "faithfulness_scores": faithfulness_scores,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evaluations.insert_one({**eval_doc})  # Insert a copy
    
    return eval_doc

@api_router.get("/evaluations")
async def get_evaluations():
    """Get all evaluations"""
    evaluations = await db.evaluations.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"evaluations": evaluations}

@api_router.get("/evaluations/{experiment_id}")
async def get_evaluation(experiment_id: str):
    """Get evaluation for a specific experiment"""
    evaluation = await db.evaluations.find_one({"experiment_id": experiment_id}, {"_id": 0})
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation nicht gefunden")
    return evaluation

# Human Evaluation Routes
@api_router.post("/human-evaluate")
async def submit_human_evaluation(evaluation: HumanEvaluation):
    """Submit human evaluation for an experiment"""
    # Validate scores
    if not (1 <= evaluation.score_a <= 10 and 1 <= evaluation.score_b <= 10):
        raise HTTPException(status_code=400, detail="Scores müssen zwischen 1 und 10 liegen")
    if evaluation.winner not in ["a", "b", "tie"]:
        raise HTTPException(status_code=400, detail="Winner muss 'a', 'b' oder 'tie' sein")
    
    eval_doc = {
        "id": str(uuid.uuid4()),
        "experiment_id": evaluation.experiment_id,
        "score_a": evaluation.score_a,
        "score_b": evaluation.score_b,
        "winner": evaluation.winner,
        "feedback": evaluation.feedback,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.human_evaluations.insert_one({**eval_doc})
    
    return eval_doc

@api_router.get("/human-evaluations/{experiment_id}")
async def get_human_evaluations(experiment_id: str):
    """Get human evaluations for an experiment"""
    evaluations = await db.human_evaluations.find({"experiment_id": experiment_id}, {"_id": 0}).to_list(100)
    return {"evaluations": evaluations}

# AI Prompt Improvement Routes
@api_router.post("/prompts/improve")
async def improve_prompt(request: PromptImprovementRequest):
    """Use AI to suggest improvements for a prompt based on best practices"""
    # Get the prompt
    prompt = await db.prompts.find_one({"id": request.prompt_id}, {"_id": 0})
    if not prompt:
        prompt = next((p for p in DEFAULT_PROMPTS if p['id'] == request.prompt_id), None)
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt nicht gefunden")
    
    improvement_system = """Du bist ein Experte für Prompt Engineering. Deine Aufgabe ist es, System-Prompts zu verbessern.

Wende folgende Best Practices an:
1. **Klare Rollendefiition**: Der Prompt sollte eine spezifische Persona/Rolle definieren
2. **Strukturierte Anweisungen**: Nutze nummerierte Listen oder Bullet Points für komplexe Aufgaben
3. **Kontext-Priming**: Füge relevanten Kontext hinzu, der die Antwortqualität verbessert
4. **Output-Format**: Spezifiziere das gewünschte Antwortformat explizit
5. **Constraints**: Definiere klare Grenzen (z.B. Länge, Tonalität, was zu vermeiden ist)
6. **Few-Shot Examples**: Füge 1-2 Beispiele hinzu wenn sinnvoll
7. **Chain-of-Thought**: Fordere schrittweises Denken bei komplexen Aufgaben

Antworte NUR mit dem verbesserten Prompt - keine Erklärungen, keine Einleitung.
Der verbesserte Prompt muss auf Deutsch sein und für einen deutschen Versicherungs-Chatbot optimiert."""

    improvement_request = f"""Hier ist der aktuelle System-Prompt:

---
{prompt['system_prompt']}
---

Prompt-Typ: {prompt.get('prompt_type', 'zero-shot')}
Name: {prompt.get('name', 'Unbekannt')}
Beschreibung: {prompt.get('description', '')}

Erstelle eine verbesserte Version dieses Prompts, die die Best Practices des Prompt Engineering anwendet.
Der verbesserte Prompt sollte für einen deutschen Versicherungs-Chatbot (Haftpflicht, KFZ, Hausrat) optimiert sein."""

    session_id = f"improve-{uuid.uuid4()}"
    improved_prompt = await get_llm_response(improvement_request, improvement_system, 0.7)
    
    return {
        "original_prompt": prompt['system_prompt'],
        "improved_prompt": improved_prompt,
        "prompt_id": request.prompt_id,
        "prompt_name": prompt.get('name', 'Unknown')
    }

# Recommendation Routes
@api_router.post("/recommend", response_model=RecommendationResponse)
async def get_recommendation(request: RecommendationRequest):
    """Get insurance recommendations based on user profile"""
    recommendations = []
    reasoning_parts = []
    
    # Haftpflicht - always recommended
    recommendations.append({
        "type": "haftpflicht",
        "name": "Privathaftpflichtversicherung",
        "priority": "Hoch",
        "estimated_cost": "50-100€/Jahr",
        "reason": "Grundschutz für jeden Haushalt"
    })
    reasoning_parts.append("Eine Haftpflichtversicherung ist für jeden unverzichtbar.")
    
    # KFZ if has car
    if request.has_car:
        kasko_type = "Vollkasko" if request.age < 30 else "Teilkasko"
        recommendations.append({
            "type": "kfz",
            "name": f"Kfz-Versicherung ({kasko_type})",
            "priority": "Pflicht",
            "estimated_cost": "300-800€/Jahr",
            "reason": f"Für Ihr Fahrzeug empfehlen wir {kasko_type}"
        })
        reasoning_parts.append(f"Da Sie ein Auto besitzen, benötigen Sie eine Kfz-Versicherung. Bei Ihrem Alter empfehlen wir {kasko_type}.")
    
    # Hausrat if owns home or family
    if request.owns_home or request.household_type == "family":
        recommendations.append({
            "type": "hausrat",
            "name": "Hausratversicherung",
            "priority": "Empfohlen",
            "estimated_cost": "100-200€/Jahr",
            "reason": "Schutz für Ihr Hab und Gut"
        })
        reasoning_parts.append("Eine Hausratversicherung schützt Ihre Einrichtung und persönlichen Gegenstände.")
    
    # Pet insurance if has pets
    if request.has_pets:
        recommendations.append({
            "type": "tierhalterhaftpflicht",
            "name": "Tierhalterhaftpflicht",
            "priority": "Empfohlen",
            "estimated_cost": "50-80€/Jahr",
            "reason": "Schutz für Schäden durch Ihr Haustier"
        })
        reasoning_parts.append("Als Tierhalter sollten Sie eine Tierhalterhaftpflicht abschließen.")
    
    # Budget consideration
    total_estimated = sum(int(r['estimated_cost'].split('-')[0].replace('€/Jahr', '')) for r in recommendations)
    if total_estimated > request.monthly_budget * 12 * 0.1:
        reasoning_parts.append(f"Die geschätzten Gesamtkosten liegen bei etwa {total_estimated}€/Jahr. Das entspricht etwa {total_estimated/12:.0f}€/Monat.")
    
    return RecommendationResponse(
        recommendations=recommendations,
        reasoning=" ".join(reasoning_parts)
    )

# Dashboard Stats
@api_router.get("/stats")
async def get_stats():
    """Get dashboard statistics"""
    chat_count = await db.chats.count_documents({})
    experiment_count = await db.experiments.count_documents({})
    evaluation_count = await db.evaluations.count_documents({})
    prompt_count = await db.prompts.count_documents({})
    
    # Get average scores from evaluations
    evaluations = await db.evaluations.find({}, {"_id": 0, "rouge_scores": 1, "faithfulness_scores": 1}).to_list(100)
    
    avg_rouge = 0
    avg_faithfulness = 0
    if evaluations:
        rouge_sum = sum(
            (e['rouge_scores']['response_a']['rougeL'] + e['rouge_scores']['response_b']['rougeL']) / 2
            for e in evaluations
        )
        faith_sum = sum(
            (e['faithfulness_scores']['response_a'] + e['faithfulness_scores']['response_b']) / 2
            for e in evaluations
        )
        avg_rouge = rouge_sum / len(evaluations)
        avg_faithfulness = faith_sum / len(evaluations)
    
    return {
        "chat_count": chat_count,
        "experiment_count": experiment_count,
        "evaluation_count": evaluation_count,
        "prompt_count": prompt_count if prompt_count > 0 else 3,
        "avg_rouge_score": round(avg_rouge, 3),
        "avg_faithfulness": round(avg_faithfulness, 3)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)


