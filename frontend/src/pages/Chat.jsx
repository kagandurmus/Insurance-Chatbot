import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, FileText, History, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { API } from "../App";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState("zero-shot");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchPrompts();
    // Add welcome message
    setMessages([{
      role: "assistant",
      content: "Guten Tag! Ich bin **SchutzKI**, Ihr KI-gestützter Versicherungsberater. Ich kann Ihnen bei Fragen zu **Haftpflicht-, KFZ- und Hausratversicherungen** helfen.\n\nWomit kann ich Ihnen heute behilflich sein?",
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchPrompts = async () => {
    try {
      const response = await axios.get(`${API}/prompts`);
      setPrompts(response.data.prompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: userMessage.content,
        session_id: sessionId,
        prompt_version: selectedPrompt
      });

      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.response,
        sources: response.data.sources,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Fehler bei der Kommunikation mit dem Server");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat wurde zurückgesetzt. Wie kann ich Ihnen helfen?",
      timestamp: new Date()
    }]);
    setSessionId(null);
    toast.success("Chat zurückgesetzt");
  };

  const quickQuestions = [
    "Was deckt eine Haftpflichtversicherung ab?",
    "Brauche ich eine Vollkasko?",
    "Wie berechnet sich die Hausratversicherung?"
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white" data-testid="chat-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 font-[Manrope]">Versicherungs-Chat</h2>
              <p className="text-xs text-slate-500">RAG-gestützte Beratung</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
              <SelectTrigger className="w-[160px] text-sm" data-testid="prompt-select">
                <SelectValue placeholder="Prompt wählen" />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-slate-500 hover:text-red-600"
              data-testid="clear-chat-btn"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.role}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-emerald-700" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                    msg.role === "user"
                      ? "bg-emerald-900 text-white rounded-tr-sm"
                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
                  }`}
                >
                  <div className={`prose prose-sm max-w-none ${msg.role === "user" ? "prose-invert" : ""}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-xs text-slate-400">
                      <FileText className="w-3 h-3" />
                      <span>Quellen: {msg.sources.join(", ")}</span>
                    </div>
                  )}
                </div>
                
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot"></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot"></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot"></span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-slate-500 mb-2 text-center">Schnellfragen:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                  data-testid={`quick-question-${idx}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-100 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Stellen Sie Ihre Versicherungsfrage..."
              className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl px-4 py-2 disabled:opacity-50"
              data-testid="send-message-btn"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
