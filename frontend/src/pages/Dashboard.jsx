import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, MessageSquare, FlaskConical, FileCheck, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, evalsRes, expsRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/evaluations`),
        axios.get(`${API}/experiments`)
      ]);
      setStats(statsRes.data);
      setEvaluations(evalsRes.data.evaluations);
      setExperiments(expsRes.data.experiments);
    } catch (error) {
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Chat-Anfragen",
      value: stats?.chat_count || 0,
      icon: MessageSquare,
      color: "bg-blue-100 text-blue-700",
      iconColor: "text-blue-600"
    },
    {
      title: "Experimente",
      value: stats?.experiment_count || 0,
      icon: FlaskConical,
      color: "bg-amber-100 text-amber-700",
      iconColor: "text-amber-600"
    },
    {
      title: "Evaluationen",
      value: stats?.evaluation_count || 0,
      icon: FileCheck,
      color: "bg-emerald-100 text-emerald-700",
      iconColor: "text-emerald-600"
    },
    {
      title: "Prompts",
      value: stats?.prompt_count || 0,
      icon: Activity,
      color: "bg-purple-100 text-purple-700",
      iconColor: "text-purple-600"
    }
  ];

  // Prepare chart data
  const rougeChartData = evaluations.slice(0, 10).map((ev, idx) => ({
    name: `Exp ${idx + 1}`,
    "Variante A": (ev.rouge_scores?.response_a?.rougeL || 0) * 100,
    "Variante B": (ev.rouge_scores?.response_b?.rougeL || 0) * 100
  }));

  const faithfulnessChartData = evaluations.slice(0, 10).map((ev, idx) => ({
    name: `Exp ${idx + 1}`,
    "Variante A": (ev.faithfulness_scores?.response_a || 0) * 100,
    "Variante B": (ev.faithfulness_scores?.response_b || 0) * 100
  }));

  // Aggregate metrics for radar chart
  const aggregateMetrics = () => {
    if (evaluations.length === 0) return [];
    
    const avgA = {
      rouge1: 0, rouge2: 0, rougeL: 0, faithfulness: 0, bertF1: 0
    };
    const avgB = {
      rouge1: 0, rouge2: 0, rougeL: 0, faithfulness: 0, bertF1: 0
    };
    
    evaluations.forEach(ev => {
      avgA.rouge1 += (ev.rouge_scores?.response_a?.rouge1 || 0);
      avgA.rouge2 += (ev.rouge_scores?.response_a?.rouge2 || 0);
      avgA.rougeL += (ev.rouge_scores?.response_a?.rougeL || 0);
      avgA.faithfulness += (ev.faithfulness_scores?.response_a || 0);
      avgA.bertF1 += (ev.bert_scores?.response_a?.f1 || 0);
      
      avgB.rouge1 += (ev.rouge_scores?.response_b?.rouge1 || 0);
      avgB.rouge2 += (ev.rouge_scores?.response_b?.rouge2 || 0);
      avgB.rougeL += (ev.rouge_scores?.response_b?.rougeL || 0);
      avgB.faithfulness += (ev.faithfulness_scores?.response_b || 0);
      avgB.bertF1 += (ev.bert_scores?.response_b?.f1 || 0);
    });
    
    const n = evaluations.length;
    return [
      { metric: "ROUGE-1", A: (avgA.rouge1 / n) * 100, B: (avgB.rouge1 / n) * 100 },
      { metric: "ROUGE-2", A: (avgA.rouge2 / n) * 100, B: (avgB.rouge2 / n) * 100 },
      { metric: "ROUGE-L", A: (avgA.rougeL / n) * 100, B: (avgB.rougeL / n) * 100 },
      { metric: "Faithfulness", A: (avgA.faithfulness / n) * 100, B: (avgB.faithfulness / n) * 100 },
      { metric: "BERT F1", A: (avgA.bertF1 / n) * 100, B: (avgB.bertF1 / n) * 100 }
    ];
  };

  const radarData = aggregateMetrics();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-50/50" data-testid="dashboard-page">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 font-[Manrope]">Quality Dashboard</h1>
              <p className="text-sm text-slate-500">LLM-Evaluation & Metriken</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-slate-200 hover:border-emerald-200 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">{card.title}</p>
                        <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                        <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Average Scores */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-500">Durchschn. ROUGE-L Score</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {((stats?.avg_rouge_score || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-500">Durchschn. Faithfulness</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {((stats?.avg_faithfulness || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* ROUGE Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ROUGE-L Scores</CardTitle>
                <CardDescription>Vergleich der Prompt-Varianten</CardDescription>
              </CardHeader>
              <CardContent>
                {rougeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={rougeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        formatter={(value) => `${value.toFixed(1)}%`}
                      />
                      <Legend />
                      <Bar dataKey="Variante A" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Variante B" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
                    Keine Daten verfügbar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Faithfulness Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Faithfulness Scores</CardTitle>
                <CardDescription>Treue zum Quellmaterial</CardDescription>
              </CardHeader>
              <CardContent>
                {faithfulnessChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={faithfulnessChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        formatter={(value) => `${value.toFixed(1)}%`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Variante A" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                      <Line type="monotone" dataKey="Variante B" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6" }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
                    Keine Daten verfügbar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Gesamtvergleich der Metriken</CardTitle>
                <CardDescription>Durchschnittliche Performance über alle Experimente</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Radar name="Variante A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name="Variante B" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Letzte Evaluationen</CardTitle>
              <CardDescription>Detaillierte Ergebnisse der A/B-Tests</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {evaluations.slice(0, 10).map((ev, idx) => (
                    <div key={ev.id} className="p-4 bg-slate-50 rounded-xl" data-testid={`evaluation-${idx}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700">Experiment #{idx + 1}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(ev.created_at).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">ROUGE-L</p>
                          <div className="flex justify-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700">
                              A: {((ev.rouge_scores?.response_a?.rougeL || 0) * 100).toFixed(0)}%
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-700">
                              B: {((ev.rouge_scores?.response_b?.rougeL || 0) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">BERT F1</p>
                          <div className="flex justify-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700">
                              A: {((ev.bert_scores?.response_a?.f1 || 0) * 100).toFixed(0)}%
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-700">
                              B: {((ev.bert_scores?.response_b?.f1 || 0) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Faithfulness</p>
                          <div className="flex justify-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700">
                              A: {((ev.faithfulness_scores?.response_a || 0) * 100).toFixed(0)}%
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-700">
                              B: {((ev.faithfulness_scores?.response_b || 0) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {evaluations.length === 0 && (
                    <p className="text-center text-slate-400 py-8">
                      Noch keine Evaluationen vorhanden. Führen Sie Experimente im Prompt Lab durch.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
