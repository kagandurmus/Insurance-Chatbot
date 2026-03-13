import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, MessageSquare, Zap, BarChart3, Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import Chat from "./pages/Chat";
import PromptLab from "./pages/PromptLab";
import Dashboard from "./pages/Dashboard";
import Recommendation from "./pages/Recommendation";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const navItems = [
  { path: "/", icon: MessageSquare, label: "Chat", description: "KI-Assistent" },
  { path: "/prompt-lab", icon: Zap, label: "Prompt Lab", description: "A/B Tests" },
  { path: "/dashboard", icon: BarChart3, label: "Dashboard", description: "Metriken" },
  { path: "/recommend", icon: Sparkles, label: "Beratung", description: "Empfehlung" },
];

const NavItem = ({ item, isActive, onClick }) => (
  <NavLink
    to={item.path}
    onClick={onClick}
    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      isActive
        ? "bg-emerald-900 text-white shadow-lg shadow-emerald-900/20"
        : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
    }`}
  >
    <item.icon className={`w-5 h-5 ${isActive ? "text-emerald-300" : "text-slate-400 group-hover:text-emerald-600"}`} />
    <div className="flex flex-col">
      <span className="font-medium text-sm">{item.label}</span>
      <span className={`text-xs ${isActive ? "text-emerald-300" : "text-slate-400"}`}>{item.description}</span>
    </div>
  </NavLink>
);

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-emerald-900 font-[Manrope]">SchutzKI</h1>
              <p className="text-xs text-slate-500">Versicherungsberater</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => setIsOpen(false)}
            />
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-emerald-800 font-medium mb-1">Powered by</p>
            <p className="text-sm text-emerald-900 font-semibold">Gemini 3 Flash</p>
            <p className="text-xs text-slate-500 mt-2">RAG + LLM Evaluation</p>
          </div>
        </div>
      </aside>
    </>
  );
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="h-full"
  >
    {children}
  </motion.div>
);

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="App min-h-screen bg-slate-50">
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
          
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header */}
            <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                data-testid="mobile-menu-toggle"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
                <span className="font-bold text-emerald-900 font-[Manrope]">SchutzKI</span>
              </div>
            </header>
            
            <div className="flex-1 overflow-auto">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<PageWrapper><Chat /></PageWrapper>} />
                  <Route path="/prompt-lab" element={<PageWrapper><PromptLab /></PageWrapper>} />
                  <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
                  <Route path="/recommend" element={<PageWrapper><Recommendation /></PageWrapper>} />
                </Routes>
              </AnimatePresence>
            </div>
          </main>
        </div>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
