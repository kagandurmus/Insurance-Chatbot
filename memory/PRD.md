# SchutzKI - German Insurance FAQ & Recommendation Chatbot PRD

## Original Problem Statement
Build a German-language insurance FAQ and recommendation chatbot demonstrating:
- RAG-powered Q&A with German insurance policy documents (Haftpflicht, KFZ, Hausrat)
- Prompt versioning system with A/B testing (zero-shot vs. few-shot vs. chain-of-thought)
- Automated quality evaluation (ROUGE, BERTScore, Faithfulness)
- Guided insurance recommendation flow

## User Choices
- **LLM**: Gemini 3 Flash via Emergent Integrations
- **Vector Store**: MongoDB (simplified keyword-based RAG)
- **Evaluation Metrics**: ROUGE + BERTScore + Faithfulness
- **Design**: Creative, professional insurance chatbot aesthetic

## User Personas
1. **Insurance Professionals** - Need to evaluate LLM quality for customer interactions
2. **InsurTech Teams** - Building conversational AI for insurance
3. **LLM Quality Engineers** - Testing prompt variants and measuring output quality
4. **German-Speaking Users** - Seeking insurance advice in their native language

## Core Requirements (Static)
- [ ] RAG-powered Q&A system
- [ ] Multiple prompt version support
- [ ] A/B testing interface
- [ ] ROUGE, BERTScore, Faithfulness evaluation
- [ ] Multi-step recommendation wizard
- [ ] German language UI

## What's Been Implemented (March 13, 2026)

### Backend (FastAPI)
- `/api/chat` - RAG-powered chat with Gemini Flash
- `/api/prompts` - CRUD for prompt versions (Zero-shot, Few-shot, Chain-of-Thought)
- `/api/experiments/run` - A/B testing with two prompt variants
- `/api/evaluate/{id}` - Quality metrics calculation
- `/api/recommend` - Insurance recommendation based on user profile
- `/api/stats` - Dashboard statistics

### Frontend (React)
1. **Chat Page** - RAG-powered Q&A with prompt selection
2. **Prompt Lab** - A/B experiment creation and evaluation
3. **Quality Dashboard** - ROUGE, BERTScore, Faithfulness visualization
4. **Recommendation Wizard** - 6-step guided insurance consultation

### Database (MongoDB)
- `chats` - Chat history
- `prompts` - Prompt versions
- `experiments` - A/B test results
- `evaluations` - Quality scores

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ RAG-powered chat
- ✅ Prompt versioning
- ✅ A/B testing
- ✅ Quality evaluation
- ✅ Recommendation wizard

### P1 (High Priority)
- [ ] Real PDF document upload and processing
- [ ] Vector embeddings with MongoDB Atlas Vector Search
- [ ] True BERTScore computation (currently simplified)

### P2 (Nice to Have)
- [ ] User authentication
- [ ] Prompt template library
- [ ] Export evaluation reports
- [ ] Comparison with external models

## Next Tasks
1. Implement real PDF upload and processing
2. Add MongoDB Atlas Vector Search for true RAG
3. Implement actual BERTScore using transformers
4. Add user feedback collection
