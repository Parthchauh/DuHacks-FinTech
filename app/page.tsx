"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Globe, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <Navbar />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-3xl animate-[float_10s_ease-in-out_infinite_reverse]" />
      </div>

      <main className="relative pt-32 pb-16 px-6">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto flex flex-col items-center text-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 shadow-sm backdrop-blur-sm mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-slate-600">AI-Powered Portfolio Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tight text-slate-900 mb-6"
          >
            Wealth, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-secondary">
              Optimized.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-600 max-w-2xl mb-12 leading-relaxed"
          >
            Experience the power of automated rebalancing.
            Maximize returns and minimize volatility with OptiWealth's quantitative engine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-6"
          >
            <Button size="lg" className="rounded-full px-10 py-7 text-lg font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              Start Rebalancing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="glass" className="rounded-full px-10 py-7 text-lg font-semibold hover:bg-white/80">
              View Demo
            </Button>
          </motion.div>
        </section>

        {/* Floating Cards Demo */}
        <section className="max-w-7xl mx-auto mb-32 relative h-[500px] hidden md:block">
          {/* Central Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] glassware rounded-3xl z-10 p-4 border border-white/50 shadow-2xl shadow-blue-900/10 overflow-hidden bg-white/40 backdrop-blur-md"
          >
            {/* Fake UI Header */}
            <div className="flex items-center justify-between mb-6 px-4 pt-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                <div className="w-3 h-3 rounded-full bg-green-400/50" />
              </div>
              <div className="w-32 h-2 rounded-full bg-slate-100" />
            </div>
            {/* Fake Chart */}
            <div className="w-full h-full bg-gradient-to-tr from-sky-50 to-white rounded-xl p-8 flex items-end justify-between gap-2 opacity-80">
              {[40, 60, 45, 70, 50, 80, 65, 90, 75, 100].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-t-lg"
                />
              ))}
            </div>
          </motion.div>

          {/* Floating Stats Cards */}
          <Card className="absolute top-10 left-10 w-64 animate-[float_6s_ease-in-out_infinite] z-20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 text-green-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Portfolio Drift</p>
                <p className="text-lg font-bold text-slate-900">0.05%</p>
              </div>
            </div>
          </Card>

          <Card className="absolute bottom-20 right-20 w-64 animate-[float_7s_ease-in-out_infinite] delay-700 z-20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Sharpe Ratio</p>
                <p className="text-lg font-bold text-slate-900">2.84</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 mb-32">
          {[
            { title: "Smart Rebalancing", icon: <Globe className="h-6 w-6 text-blue-500" />, desc: "Automatically align your portfolio with your target allocation." },
            { title: "Risk Analytics", icon: <Shield className="h-6 w-6 text-purple-500" />, desc: "Deep dive into volatility, beta, and value-at-risk metrics." },
            { title: "Tax Efficiency", icon: <Zap className="h-6 w-6 text-amber-500" />, desc: "Minimize tax impact with intelligent harvest suggestions." },
          ].map((feature, i) => (
            <Card key={i} className="hover:border-primary/20">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
