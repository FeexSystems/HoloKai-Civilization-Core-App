import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Hexagon,
  Shield,
  Users,
  FileText,
  Map,
  BookOpen,
  Compass,
  Globe,
  Zap,
  Layers,
  Activity,
  Cpu,
  Server,
  Lock,
} from "lucide-react";
import { HoloKaiLogo } from "@/components/HoloKaiLogo";
import { units } from "@/data/units";

const STATS = [
  { label: "Active Units", value: "08", icon: Users },
  { label: "Knowledge Nodes", value: "4.29M", icon: FileText },
  { label: "Languages", value: "2000+", icon: Globe },
  { label: "API Endpoints", value: "12", icon: Server },
  { label: "Lab Sessions", value: "1,847", icon: Cpu },
  { label: "System Uptime", value: "99.97%", icon: Activity },
];

const SECTIONS = [
  { id: "top", label: "Landing / Hero", icon: Eye, route: "/" },
  { id: "vanguard", label: "Vanguard Units", icon: Users, route: "/#vanguard" },
  { id: "anatomy", label: "Anatomy", icon: Layers, route: "/#anatomy" },
  { id: "collective", label: "Collective", icon: BookOpen, route: "/#collective" },
  { id: "intelligence", label: "Intelligence", icon: Cpu, route: "/#intelligence" },
  { label: "3D Lab Viewer", icon: Hexagon, route: "/?lab=1" },
  { label: "Unit Modal", icon: FileText, route: "/?modal=1" },
];

export default function Admin() {
  const navigate = useNavigate();
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const handleReturn = useCallback(() => {
    navigate("/");
    setTimeout(() => setShowAdmin(false), 100);
  }, [navigate]);

  useEffect(() => {
    document.title = "HoloKai · Admin Panel";
    return () => { document.title = "HoloKai — Where Civilization Remembers"; };
  }, []);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-amber-900/30 bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <HoloKaiLogo variant="icon" className="h-7 w-7" />
            <span className="text-xs font-bold tracking-[0.3em] text-amber-500">
              ADMIN PANEL
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] tracking-[0.2em] text-zinc-500">
              <Lock className="h-3 w-3 inline mr-1" />
              PRIVILEGED ACCESS
            </span>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-20 px-6">
        <div className="mx-auto max-w-[1600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="font-display text-5xl font-bold tracking-tight">
                <span className="text-amber-500">Platform</span> Overview
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Full app architecture and section navigation · Ctrl+Shift+A to toggle
              </p>
            </div>
            <button
              type="button"
              onClick={handleReturn}
              className="flex items-center gap-2 border border-white/15 px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-zinc-300 transition hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              RETURN TO LANDING
            </button>
          </div>

          {/* Stats grid */}
          <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-white/10 bg-white/[0.02] p-5 text-center"
                >
                  <Icon className="mx-auto h-5 w-5 text-amber-500/60" />
                  <p className="mt-3 font-display text-2xl font-bold text-amber-400">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Sections */}
          <h2 className="mb-6 font-display text-3xl font-bold tracking-tight text-white">
            App Sections
          </h2>
          <div className="mb-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.label}
                  type="button"
                  onClick={() => navigate(section.route)}
                  className="group flex items-center gap-4 border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-amber-500/30 hover:bg-white/5"
                >
                  <Icon className="h-5 w-5 shrink-0 text-amber-500/50 group-hover:text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-amber-200">
                      {section.label}
                    </p>
                    <p className="text-[9px] font-mono tracking-[0.1em] text-zinc-600">
                      {section.route}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vanguard units */}
          <h2 className="mb-6 font-display text-3xl font-bold tracking-tight text-white">
            Vanguard Units
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {units.map((unit) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-white/10 bg-white/[0.02] p-5 transition hover:border-amber-500/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-amber-500/50">
                    {unit.id}
                  </span>
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: unit.accent ?? "#f59e0b" }}
                  />
                </div>
                <p className="mt-3 font-display text-xl font-bold text-white">
                  {unit.name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {unit.role}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {unit.specs.map((spec) => (
                    <span
                      key={spec}
                      className="border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] tracking-wider text-zinc-500"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[9px] tracking-[0.15em] text-zinc-600">
                  <FileText className="h-3 w-3" />
                  {unit.video?.split("/").pop()}
                </div>
              </motion.div>
            ))}
          </div>

          {/* System info */}
          <div className="mt-14 border-t border-white/5 pt-10">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="border border-white/10 bg-white/[0.02] p-6">
                <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-amber-500">
                  <Zap className="h-4 w-4" />
                  SYSTEM STATUS
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ["API Server", "online", "text-green-400"],
                    ["Database", "connected", "text-green-400"],
                    ["3D Renderer", "ready", "text-green-400"],
                    ["CDN", "active", "text-green-400"],
                    ["WebSocket", "listening", "text-green-400"],
                  ].map(([service, status, color]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{service}</span>
                      <span className={`text-[9px] font-bold tracking-[0.15em] ${color}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-white/10 bg-white/[0.02] p-6">
                <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-amber-500">
                  <Shield className="h-4 w-4" />
                  ACCESS CONTROL
                </p>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  Admin panel is accessible via <strong className="text-zinc-300">Ctrl+Shift+A</strong> keyboard shortcut from the landing page. 
                  This provides a full architectural overview of every section, component, 
                  and route in the HoloKai platform.
                </p>
                <p className="mt-3 text-xs text-zinc-600">
                  Session: <span className="text-amber-500/80">PRIVILEGED</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
