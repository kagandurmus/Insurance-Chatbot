import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Play, Plus, Trash2, Loader2, FlaskConical, ChevronRight, HelpCircle, AlertTriangle, Thermometer } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Alert, AlertDescription } from "../components/ui/alert";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";

// Metric explanations
const METRIC_INFO = {
  rouge: {
    title: "ROUGE-L Score",
    description: "Misst die längste gemeinsame Teilsequenz (LCS) zwischen Antwort und Referenztext. Erfasst die Satzstruktur-Ähnlichkeit.",
    interpretation: "Höher = Bessere Übereinstimmung mit dem Quellmaterial. 0% = keine Übereinstimmung, 100% = perfekte Übereinstimmung.",
    ideal: "> 30% gilt als gut für generative Aufgaben"
  },
  bert: {
    title: "BERTScore F1",
    description: "Nutzt kontextuelle Embeddings um semantische Ähnlichkeit zu messen, nicht nur Wortübereinstimmung.",
    interpretation: "Höher = Semantisch ähnlicher zum Referenztext. Berücksichtigt Synonyme und Umschreibungen.",
    ideal: "> 50% zeigt gute semantische Übereinstimmung"
  },
  faithfulness: {
    title: "Faithfulness Score",
    description: "Misst wie treu die Antwort dem Quellmaterial bleibt. Berechnet den Anteil relevanter Begriffe aus dem Kontext.",
    interpretation: "Höher = Antwort basiert stärker auf dem Quellmaterial statt zu halluzinieren.",
    ideal: "> 40% zeigt gute Quelltreue"
  }
};

const MetricInfoButton = ({ metricKey }) => {
  const info = METRIC_INFO[metricKey];
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button className="ml-1 text-slate-400 hover:text-slate-600 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-4 bg-white border shadow-lg">
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">{info.title}</p>
            <p className="text-sm text-slate-600">{info.description}</p>
            <div className="pt-2 border-t">
              <p className="text-xs text-emerald-700 font-medium">Interpretation:</p>
              <p className="text-xs text-slate-500">{info.interpretation}</p>
            </div>
            <p className="text-xs text-blue-600 font-medium">{info.ideal}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const PromptLab = () => {
  const [prompts, setPrompts] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [selectedPromptA, setSelectedPromptA] = useState("");
  const [selectedPromptB, setSelectedPromptB] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentExperiment, setCurrentExperiment] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    name: "",
    description: "",
    system_prompt: "",
    prompt_type: "zero-shot"
  });

  useEffect(() => {
    fetchPrompts();
    fetchExperiments();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await axios.get(`${API}/prompts`);
      setPrompts(response.data.prompts);
      if (response.data.prompts.length >= 2) {
        setSelectedPromptA(response.data.prompts[0].id);
        setSelectedPromptB(response.data.prompts[1].id);
      }
    } catch (error) {
      toast.error("Fehler beim Laden der Prompts");
    }
  };

  const fetchExperiments = async () => {
    try {
      const response = await axios.get(`${API}/experiments`);
      setExperiments(response.data.experiments);
    } catch (error) {
      console.error("Error fetching experiments:", error);
    }
  };

  const runExperiment = async () => {
    if (!testQuery.trim() || !selectedPromptA || !selectedPromptB) {
      toast.error("Bitte wählen Sie zwei Prompts und geben Sie eine Testfrage ein");
      return;
    }

    setIsRunning(true);
    setCurrentExperiment(null);
    setEvaluationResult(null);

    try {
      const response = await axios.post(`${API}/experiments/run`, {
        query: testQuery,
        prompt_a_id: selectedPromptA,
        prompt_b_id: selectedPromptB
      });
      setCurrentExperiment(response.data);
      fetchExperiments();
      toast.success("Experiment erfolgreich durchgeführt!");
    } catch (error) {
      toast.error("Fehler beim Ausführen des Experiments");
    } finally {
      setIsRunning(false);
    }
  };

  const evaluateExperiment = async (experimentId) => {
    setIsEvaluating(true);
    try {
      const response = await axios.post(`${API}/evaluate/${experimentId}`);
      setEvaluationResult(response.data);
      toast.success("Evaluation abgeschlossen!");
    } catch (error) {
      toast.error("Fehler bei der Evaluation");
    } finally {
      setIsEvaluating(false);
    }
  };

  const createPrompt = async () => {
    if (!newPrompt.name || !newPrompt.system_prompt) {
      toast.error("Name und System-Prompt sind erforderlich");
      return;
    }

    try {
      await axios.post(`${API}/prompts`, newPrompt);
      toast.success("Prompt erstellt!");
      setShowNewPrompt(false);
      setNewPrompt({ name: "", description: "", system_prompt: "", prompt_type: "zero-shot" });
      fetchPrompts();
    } catch (error) {
      toast.error("Fehler beim Erstellen des Prompts");
    }
  };

  const deletePrompt = async (promptId) => {
    try {
      await axios.delete(`${API}/prompts/${promptId}`);
      toast.success("Prompt gelöscht!");
      fetchPrompts();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  // Get prompt details by ID
  const getPromptById = (id) => prompts.find(p => p.id === id);
  const promptA = getPromptById(selectedPromptA);
  const promptB = getPromptById(selectedPromptB);
  const isSamePrompt = selectedPromptA === selectedPromptB;

  const promptTypeColors = {
    "zero-shot": "bg-blue-100 text-blue-700",
    "few-shot": "bg-purple-100 text-purple-700",
    "chain-of-thought": "bg-amber-100 text-amber-700"
  };

  const testQueries = [
    "Was ist der Unterschied zwischen Teilkasko und Vollkasko?",
    "Brauche ich als Mieter eine Haftpflichtversicherung?",
    "Wie hoch sollte die Versicherungssumme bei der Hausrat sein?"
  ];

  return (
    <div className="h-full overflow-auto bg-slate-50/50" data-testid="prompt-lab-page">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-[Manrope]">Prompt Lab</h1>
                <p className="text-sm text-slate-500">A/B-Tests für Prompt-Optimierung</p>
              </div>
            </div>
            
            <Dialog open={showNewPrompt} onOpenChange={setShowNewPrompt}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-900 hover:bg-emerald-800 rounded-full" data-testid="new-prompt-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Neuen Prompt erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newPrompt.name}
                        onChange={(e) => setNewPrompt({...newPrompt, name: e.target.value})}
                        placeholder="z.B. Expert Mode"
                        data-testid="new-prompt-name"
                      />
                    </div>
                    <div>
                      <Label>Typ</Label>
                      <Select value={newPrompt.prompt_type} onValueChange={(v) => setNewPrompt({...newPrompt, prompt_type: v})}>
                        <SelectTrigger data-testid="new-prompt-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zero-shot">Zero-Shot</SelectItem>
                          <SelectItem value="few-shot">Few-Shot</SelectItem>
                          <SelectItem value="chain-of-thought">Chain-of-Thought</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Beschreibung</Label>
                    <Input
                      value={newPrompt.description}
                      onChange={(e) => setNewPrompt({...newPrompt, description: e.target.value})}
                      placeholder="Kurze Beschreibung des Prompts"
                      data-testid="new-prompt-description"
                    />
                  </div>
                  <div>
                    <Label>System-Prompt</Label>
                    <Textarea
                      value={newPrompt.system_prompt}
                      onChange={(e) => setNewPrompt({...newPrompt, system_prompt: e.target.value})}
                      placeholder="Du bist ein hilfreicher Versicherungsberater..."
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="new-prompt-system"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewPrompt(false)}>Abbrechen</Button>
                  <Button onClick={createPrompt} className="bg-emerald-900 hover:bg-emerald-800" data-testid="create-prompt-btn">
                    Erstellen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="experiment" className="space-y-6">
            <TabsList className="bg-white border">
              <TabsTrigger value="experiment" className="data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                A/B Experiment
              </TabsTrigger>
              <TabsTrigger value="prompts" className="data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                Prompt-Bibliothek
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                Verlauf
              </TabsTrigger>
            </TabsList>

            <TabsContent value="experiment" className="space-y-6">
              {/* Experiment Setup */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Experiment konfigurieren</CardTitle>
                  <CardDescription>Vergleichen Sie zwei Prompt-Varianten nebeneinander</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Prompt Selection */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block">Variante A</Label>
                      <Select value={selectedPromptA} onValueChange={setSelectedPromptA}>
                        <SelectTrigger data-testid="select-prompt-a" className="h-auto py-3">
                          <SelectValue placeholder="Prompt A wählen">
                            {promptA && (
                              <div className="flex items-center gap-2">
                                <span>{promptA.name}</span>
                                <Badge variant="outline" className={promptTypeColors[promptA.prompt_type]}>
                                  {promptA.prompt_type}
                                </Badge>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {prompts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <Badge variant="outline" className={promptTypeColors[p.prompt_type]}>
                                  {p.prompt_type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Variante B</Label>
                      <Select value={selectedPromptB} onValueChange={setSelectedPromptB}>
                        <SelectTrigger data-testid="select-prompt-b" className="h-auto py-3">
                          <SelectValue placeholder="Prompt B wählen">
                            {promptB && (
                              <div className="flex items-center gap-2">
                                <span>{promptB.name}</span>
                                <Badge variant="outline" className={promptTypeColors[promptB.prompt_type]}>
                                  {promptB.prompt_type}
                                </Badge>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {prompts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <Badge variant="outline" className={promptTypeColors[p.prompt_type]}>
                                  {p.prompt_type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Same Prompt Warning */}
                  {isSamePrompt && selectedPromptA && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <span className="font-medium">Hinweis:</span> Sie vergleichen denselben Prompt. 
                        Unterschiede in den Antworten entstehen durch die inhärente Zufälligkeit (Temperature) des LLM.
                        Dies kann nützlich sein, um die Konsistenz eines Prompts zu testen.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Test Query */}
                  <div>
                    <Label className="mb-2 block">Testfrage</Label>
                    <div className="flex gap-3">
                      <Textarea
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        placeholder="Geben Sie eine Testfrage ein..."
                        className="min-h-[80px]"
                        data-testid="test-query-input"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {testQueries.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTestQuery(q)}
                          className="text-xs px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                        >
                          {q.substring(0, 40)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={runExperiment}
                    disabled={isRunning || !testQuery || !selectedPromptA || !selectedPromptB}
                    className="w-full bg-emerald-900 hover:bg-emerald-800 rounded-xl py-6"
                    data-testid="run-experiment-btn"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Experiment läuft...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Experiment starten
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              {currentExperiment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Ergebnisse</CardTitle>
                        <Button
                          onClick={() => evaluateExperiment(currentExperiment.id)}
                          disabled={isEvaluating}
                          variant="outline"
                          size="sm"
                          data-testid="evaluate-btn"
                        >
                          {isEvaluating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Evaluieren
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-blue-100 text-blue-700">A</Badge>
                            <span className="font-medium text-sm">{currentExperiment.prompt_a_name}</span>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{currentExperiment.response_a}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-purple-100 text-purple-700">B</Badge>
                            <span className="font-medium text-sm">{currentExperiment.prompt_b_name}</span>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{currentExperiment.response_b}</p>
                        </div>
                      </div>

                      {/* Evaluation Results */}
                      {evaluationResult && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 grid md:grid-cols-3 gap-4"
                        >
                          <div className="bg-white rounded-xl p-4 border">
                            <div className="flex items-center mb-2">
                              <h4 className="font-medium text-sm text-slate-500">ROUGE-L Score</h4>
                              <MetricInfoButton metricKey="rouge" />
                            </div>
                            <div className="flex items-end gap-4">
                              <div>
                                <span className="text-xs text-slate-400">A:</span>
                                <p className="text-2xl font-bold text-blue-600">
                                  {(evaluationResult.rouge_scores.response_a.rougeL * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400">B:</span>
                                <p className="text-2xl font-bold text-purple-600">
                                  {(evaluationResult.rouge_scores.response_b.rougeL * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-4 border">
                            <div className="flex items-center mb-2">
                              <h4 className="font-medium text-sm text-slate-500">BERTScore F1</h4>
                              <MetricInfoButton metricKey="bert" />
                            </div>
                            <div className="flex items-end gap-4">
                              <div>
                                <span className="text-xs text-slate-400">A:</span>
                                <p className="text-2xl font-bold text-blue-600">
                                  {(evaluationResult.bert_scores.response_a.f1 * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400">B:</span>
                                <p className="text-2xl font-bold text-purple-600">
                                  {(evaluationResult.bert_scores.response_b.f1 * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-4 border">
                            <div className="flex items-center mb-2">
                              <h4 className="font-medium text-sm text-slate-500">Faithfulness</h4>
                              <MetricInfoButton metricKey="faithfulness" />
                            </div>
                            <div className="flex items-end gap-4">
                              <div>
                                <span className="text-xs text-slate-400">A:</span>
                                <p className="text-2xl font-bold text-blue-600">
                                  {(evaluationResult.faithfulness_scores.response_a * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400">B:</span>
                                <p className="text-2xl font-bold text-purple-600">
                                  {(evaluationResult.faithfulness_scores.response_b * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="prompts">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="border-slate-200 hover:border-emerald-200 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge className={promptTypeColors[prompt.prompt_type]}>{prompt.prompt_type}</Badge>
                        {!["zero-shot", "few-shot", "chain-of-thought"].includes(prompt.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => deletePrompt(prompt.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      <CardDescription>{prompt.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-hidden text-slate-600 max-h-[120px] overflow-y-auto">
                        {prompt.system_prompt.substring(0, 200)}...
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Experiment-Verlauf</CardTitle>
                  <CardDescription>Alle durchgeführten A/B-Tests</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {experiments.map((exp) => (
                        <div
                          key={exp.id}
                          className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => setCurrentExperiment(exp)}
                          data-testid={`experiment-${exp.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50">{exp.prompt_a_name}</Badge>
                              <span className="text-slate-400">vs</span>
                              <Badge variant="outline" className="bg-purple-50">{exp.prompt_b_name}</Badge>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-600 truncate">{exp.query}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(exp.created_at).toLocaleString('de-DE')}
                          </p>
                        </div>
                      ))}
                      {experiments.length === 0 && (
                        <p className="text-center text-slate-400 py-8">Noch keine Experimente durchgeführt</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Improvement Suggestions */}
          <Card className="mt-8 border-dashed border-2 border-slate-300 bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-slate-500" />
                Verbesserungsvorschläge
              </CardTitle>
              <CardDescription>Ideen zur Weiterentwicklung des Prompt Labs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-medium text-slate-700">🎛️ Temperature-Kontrolle</p>
                    <p className="text-slate-500 text-xs mt-1">Slider für LLM-Temperature (0.0-1.0) um Kreativität vs. Determinismus zu steuern</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-medium text-slate-700">📊 Mehrfach-Durchläufe</p>
                    <p className="text-slate-500 text-xs mt-1">N-mal gleiche Anfrage ausführen und statistische Varianz anzeigen</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-medium text-slate-700">👥 Human Evaluation</p>
                    <p className="text-slate-500 text-xs mt-1">Nutzer können Antworten A/B bewerten für qualitative Feedback</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-medium text-slate-700">📈 Trend-Analyse</p>
                    <p className="text-slate-500 text-xs mt-1">Zeitliche Entwicklung der Metriken pro Prompt visualisieren</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-medium text-slate-700">🔄 Auto-Iteration</p>
                    <p className="text-slate-500 text-xs mt-1">LLM automatisch Prompts verbessern lassen basierend auf Metriken</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-medium text-slate-700">📝 Referenz-Antworten</p>
                    <p className="text-slate-500 text-xs mt-1">Gold-Standard Antworten definieren für präzisere Evaluation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PromptLab;
