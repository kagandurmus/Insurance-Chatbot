import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, ChevronLeft, Check, User, Home, Car, PawPrint, Wallet, ShieldCheck, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";

const steps = [
  { id: "age", title: "Alter", icon: User, question: "Wie alt sind Sie?" },
  { id: "household", title: "Haushalt", icon: Home, question: "In welcher Lebenssituation befinden Sie sich?" },
  { id: "car", title: "Fahrzeug", icon: Car, question: "Besitzen Sie ein Auto?" },
  { id: "home", title: "Wohnung", icon: Home, question: "Besitzen Sie eine Immobilie?" },
  { id: "pets", title: "Haustiere", icon: PawPrint, question: "Haben Sie Haustiere?" },
  { id: "budget", title: "Budget", icon: Wallet, question: "Wie hoch ist Ihr monatliches Budget für Versicherungen?" }
];

const Recommendation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    age: 30,
    household_type: "single",
    has_car: false,
    owns_home: false,
    has_pets: false,
    monthly_budget: 100
  });
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitRecommendation();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitRecommendation = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/recommend`, formData);
      setRecommendation(response.data);
      toast.success("Empfehlung erstellt!");
    } catch (error) {
      toast.error("Fehler bei der Empfehlung");
    } finally {
      setIsLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setRecommendation(null);
    setFormData({
      age: 30,
      household_type: "single",
      has_car: false,
      owns_home: false,
      has_pets: false,
      monthly_budget: 100
    });
  };

  const priorityColors = {
    "Hoch": "bg-red-100 text-red-700 border-red-200",
    "Pflicht": "bg-amber-100 text-amber-700 border-amber-200",
    "Empfohlen": "bg-emerald-100 text-emerald-700 border-emerald-200"
  };

  const typeIcons = {
    haftpflicht: ShieldCheck,
    kfz: Car,
    hausrat: Home,
    tierhalterhaftpflicht: PawPrint
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case "age":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-5xl font-bold text-emerald-700">{formData.age}</span>
              <span className="text-2xl text-slate-400 ml-2">Jahre</span>
            </div>
            <Slider
              value={[formData.age]}
              onValueChange={(value) => setFormData({ ...formData, age: value[0] })}
              min={18}
              max={80}
              step={1}
              className="w-full"
              data-testid="age-slider"
            />
            <div className="flex justify-between text-sm text-slate-400">
              <span>18</span>
              <span>80</span>
            </div>
          </div>
        );

      case "household":
        return (
          <RadioGroup
            value={formData.household_type}
            onValueChange={(value) => setFormData({ ...formData, household_type: value })}
            className="space-y-3"
            data-testid="household-radio"
          >
            {[
              { value: "single", label: "Single", desc: "Alleinlebend" },
              { value: "couple", label: "Paar", desc: "Zusammenlebend ohne Kinder" },
              { value: "family", label: "Familie", desc: "Mit Kindern im Haushalt" }
            ].map((option) => (
              <Label
                key={option.value}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.household_type === option.value
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.household_type === option.value ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                }`}>
                  {formData.household_type === option.value && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{option.label}</p>
                  <p className="text-sm text-slate-500">{option.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        );

      case "car":
        return (
          <div className="flex flex-col items-center gap-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              formData.has_car ? "bg-emerald-100" : "bg-slate-100"
            }`}>
              <Car className={`w-12 h-12 ${formData.has_car ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-lg ${!formData.has_car ? "font-medium text-slate-800" : "text-slate-400"}`}>Nein</span>
              <Switch
                checked={formData.has_car}
                onCheckedChange={(checked) => setFormData({ ...formData, has_car: checked })}
                data-testid="car-switch"
              />
              <span className={`text-lg ${formData.has_car ? "font-medium text-slate-800" : "text-slate-400"}`}>Ja</span>
            </div>
          </div>
        );

      case "home":
        return (
          <div className="flex flex-col items-center gap-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              formData.owns_home ? "bg-emerald-100" : "bg-slate-100"
            }`}>
              <Home className={`w-12 h-12 ${formData.owns_home ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-lg ${!formData.owns_home ? "font-medium text-slate-800" : "text-slate-400"}`}>Miete</span>
              <Switch
                checked={formData.owns_home}
                onCheckedChange={(checked) => setFormData({ ...formData, owns_home: checked })}
                data-testid="home-switch"
              />
              <span className={`text-lg ${formData.owns_home ? "font-medium text-slate-800" : "text-slate-400"}`}>Eigentum</span>
            </div>
          </div>
        );

      case "pets":
        return (
          <div className="flex flex-col items-center gap-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              formData.has_pets ? "bg-emerald-100" : "bg-slate-100"
            }`}>
              <PawPrint className={`w-12 h-12 ${formData.has_pets ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-lg ${!formData.has_pets ? "font-medium text-slate-800" : "text-slate-400"}`}>Nein</span>
              <Switch
                checked={formData.has_pets}
                onCheckedChange={(checked) => setFormData({ ...formData, has_pets: checked })}
                data-testid="pets-switch"
              />
              <span className={`text-lg ${formData.has_pets ? "font-medium text-slate-800" : "text-slate-400"}`}>Ja</span>
            </div>
          </div>
        );

      case "budget":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-5xl font-bold text-emerald-700">{formData.monthly_budget}</span>
              <span className="text-2xl text-slate-400 ml-2">€/Monat</span>
            </div>
            <Slider
              value={[formData.monthly_budget]}
              onValueChange={(value) => setFormData({ ...formData, monthly_budget: value[0] })}
              min={20}
              max={500}
              step={10}
              className="w-full"
              data-testid="budget-slider"
            />
            <div className="flex justify-between text-sm text-slate-400">
              <span>20€</span>
              <span>500€</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Recommendation Result View
  if (recommendation) {
    return (
      <div className="h-full overflow-auto bg-slate-50/50" data-testid="recommendation-result">
        <div className="p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 font-[Manrope] mb-2">
                Ihre persönliche Empfehlung
              </h1>
              <p className="text-slate-500">{recommendation.reasoning}</p>
            </motion.div>

            {/* Recommendations */}
            <div className="space-y-4 mb-8">
              {recommendation.recommendations.map((rec, idx) => {
                const IconComponent = typeIcons[rec.type] || ShieldCheck;
                return (
                  <motion.div
                    key={rec.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="border-slate-200 hover:border-emerald-200 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-emerald-700" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-slate-800">{rec.name}</h3>
                              <Badge className={priorityColors[rec.priority]}>{rec.priority}</Badge>
                            </div>
                            <p className="text-slate-500 mb-3">{rec.reason}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <Wallet className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-emerald-700">{rec.estimated_cost}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={resetWizard}
                className="rounded-full px-6"
                data-testid="restart-wizard-btn"
              >
                Neu starten
              </Button>
              <Button
                className="bg-emerald-900 hover:bg-emerald-800 rounded-full px-6"
                onClick={() => window.location.href = '/'}
                data-testid="go-to-chat-btn"
              >
                <FileText className="w-4 h-4 mr-2" />
                Im Chat beraten lassen
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wizard View
  return (
    <div className="h-full overflow-auto bg-slate-50/50" data-testid="recommendation-page">
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 font-[Manrope]">Versicherungsberatung</h1>
              <p className="text-sm text-slate-500">Personalisierte Empfehlungen in 6 Schritten</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Schritt {currentStep + 1} von {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    idx < currentStep
                      ? "bg-emerald-500 text-white"
                      : idx === currentStep
                      ? "bg-emerald-900 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {idx < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Question Card */}
          <Card className="border-slate-200 mb-8">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{steps[currentStep].question}</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="rounded-full px-6"
              data-testid="prev-step-btn"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="bg-emerald-900 hover:bg-emerald-800 rounded-full px-6"
              data-testid="next-step-btn"
            >
              {isLoading ? (
                "Wird geladen..."
              ) : currentStep === steps.length - 1 ? (
                <>
                  Empfehlung erhalten
                  <Sparkles className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Weiter
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recommendation;
