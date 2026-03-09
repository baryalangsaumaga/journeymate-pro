import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, Users, PieChart, ArrowRightLeft,
  Plus, Filter, ChevronDown, Utensils, Car, Hotel, Ticket, ShoppingBag,
  MoreHorizontal, Receipt, CircleDollarSign, ArrowRight, Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTrips, mockExpenses, mockBudget, currencyRates, currentUser, collaborators } from "@/data/mockData";
import type { ExpenseCategory, Currency } from "@/types/travel";

const categoryConfig: Record<ExpenseCategory, { icon: typeof Utensils; label: string; color: string }> = {
  food: { icon: Utensils, label: "Food & Dining", color: "text-accent" },
  transport: { icon: Car, label: "Transport", color: "text-info" },
  accommodation: { icon: Hotel, label: "Accommodation", color: "text-primary" },
  activities: { icon: Ticket, label: "Activities", color: "text-chart-4" },
  shopping: { icon: ShoppingBag, label: "Shopping", color: "text-chart-5" },
  other: { icon: MoreHorizontal, label: "Other", color: "text-muted-foreground" },
};

const currencies: { code: Currency; symbol: string; name: string }[] = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "KRW", symbol: "₩", name: "Korean Won" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

const allUsers = [currentUser, ...collaborators];

export default function ExpensesPage() {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("PHP");
  const [showConverter, setShowConverter] = useState(false);
  const [convertAmount, setConvertAmount] = useState("1000");
  const [convertFrom, setConvertFrom] = useState<Currency>("PHP");
  const [convertTo, setConvertTo] = useState<Currency>("USD");

  const trip = mockTrips[0];
  const budget = mockBudget;
  const expenses = mockExpenses;

  const totalSpent = useMemo(() => budget.categories.reduce((sum, c) => sum + c.spent, 0), []);
  const remaining = budget.totalBudget - totalSpent;
  const spentPercent = (totalSpent / budget.totalBudget) * 100;

  // Calculate who owes whom
  const balances = useMemo(() => {
    const userTotals: Record<string, number> = {};
    expenses.forEach(exp => {
      const share = exp.amount / exp.splitAmong.length;
      // Payer gets credit
      userTotals[exp.paidBy] = (userTotals[exp.paidBy] || 0) + exp.amount;
      // Everyone owes their share
      exp.splitAmong.forEach(uid => {
        userTotals[uid] = (userTotals[uid] || 0) - share;
      });
    });
    return userTotals;
  }, [expenses]);

  const convertCurrency = (amount: number, from: Currency, to: Currency) => {
    if (from === to) return amount;
    const rate = currencyRates.find(r => r.from === from && r.to === to);
    if (rate) return amount * rate.rate;
    // Try reverse
    const reverse = currencyRates.find(r => r.from === to && r.to === from);
    if (reverse) return amount / reverse.rate;
    return amount;
  };

  const formatCurrency = (amount: number, currency: Currency = "PHP") => {
    const sym = currencies.find(c => c.code === currency)?.symbol || "₱";
    return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: amount < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight">Expenses</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{trip.title}</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 rounded-xl shadow-travel text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full h-10 p-1 rounded-xl bg-muted">
          <TabsTrigger value="overview" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">History</TabsTrigger>
          <TabsTrigger value="split" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Split</TabsTrigger>
          <TabsTrigger value="convert" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Convert</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Budget Hero */}
          <motion.div variants={item}>
            <Card className="border-0 card-elevated overflow-hidden">
              <div className="h-1.5 bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(spentPercent, 100)}%` }}
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Budget</p>
                    <p className="font-display font-bold text-2xl tracking-tight mt-0.5">{formatCurrency(budget.totalBudget)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Remaining</p>
                    <p className={`font-display font-bold text-lg mt-0.5 ${remaining < 0 ? "text-destructive" : "text-success"}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2.5 rounded-xl bg-primary/5">
                    <TrendingDown className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="font-display font-bold text-sm">{formatCurrency(totalSpent)}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Spent</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-accent/5">
                    <Receipt className="w-4 h-4 mx-auto mb-1 text-accent" />
                    <p className="font-display font-bold text-sm">{expenses.length}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Transactions</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-info/5">
                    <Users className="w-4 h-4 mx-auto mb-1 text-info" />
                    <p className="font-display font-bold text-sm">{trip.collaborators.length}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Splitting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div variants={item}>
            <h3 className="section-header mb-3">Budget by Category</h3>
            <div className="space-y-2.5">
              {budget.categories.map(cat => {
                const config = categoryConfig[cat.category];
                const Icon = config.icon;
                const pct = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
                return (
                  <Card key={cat.category} className="border-0 card-interactive">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">{config.label}</span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {formatCurrency(cat.spent)} / {formatCurrency(cat.allocated)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct > 90 ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="space-y-3 mt-0">
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="section-header">Recent Expenses</h3>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-muted-foreground rounded-lg">
                <Filter className="w-3 h-3" /> Filter
              </Button>
            </div>
          </motion.div>
          {expenses.map((exp, i) => {
            const config = categoryConfig[exp.category];
            const Icon = config.icon;
            const payer = allUsers.find(u => u.id === exp.paidBy);
            return (
              <motion.div key={exp.id} variants={item}>
                <Card className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{exp.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img src={payer?.avatar} className="w-3.5 h-3.5 rounded-full" />
                        <span className="text-[10px] text-muted-foreground">{payer?.name?.split(" ")[0]} paid</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">{exp.splitAmong.length} split</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-bold">{formatCurrency(exp.amount, exp.currency)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(exp.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* SPLIT TAB */}
        <TabsContent value="split" className="space-y-4 mt-0">
          <motion.div variants={item}>
            <Card className="border-0 card-elevated">
              <CardContent className="p-4">
                <h3 className="section-header mb-3 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-primary" /> Settlement Summary
                </h3>
                <div className="space-y-3">
                  {allUsers.filter(u => trip.collaborators.some(c => c.id === u.id)).map(user => {
                    const balance = balances[user.id] || 0;
                    const isPositive = balance > 0;
                    return (
                      <div key={user.id} className="flex items-center gap-3">
                        <div className="relative">
                          <img src={user.avatar} className="w-10 h-10 rounded-xl" />
                          {user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold">{user.name} {user.id === currentUser.id ? "(You)" : ""}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[13px] font-bold ${isPositive ? "text-success" : balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {isPositive ? "+" : ""}{formatCurrency(Math.abs(balance))}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {isPositive ? "gets back" : balance < 0 ? "owes" : "settled"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Suggested Settlements */}
          <motion.div variants={item}>
            <h3 className="section-header mb-3">Suggested Settlements</h3>
            <div className="space-y-2">
              {[
                { from: "Luna Park", to: "Alex Rivera", amount: 1580 },
                { from: "Maya Chen", to: "Alex Rivera", amount: 720 },
              ].map((s, i) => (
                <Card key={i} className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-destructive">{s.from[0]}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-success">{s.to[0]}</span>
                      </div>
                      <div className="ml-1">
                        <p className="text-[11px] font-medium">{s.from} → {s.to}</p>
                        <p className="text-[13px] font-bold">{formatCurrency(s.amount)}</p>
                      </div>
                    </div>
                    <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1">
                      <Check className="w-3 h-3" /> Settle
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* CONVERTER TAB */}
        <TabsContent value="convert" className="space-y-4 mt-0">
          <motion.div variants={item}>
            <Card className="border-0 card-elevated">
              <CardContent className="p-4 space-y-4">
                <h3 className="section-header flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-primary" /> Currency Converter
                </h3>
                {/* From */}
                <div className="p-3.5 rounded-xl bg-muted">
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">From</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="number"
                      value={convertAmount}
                      onChange={e => setConvertAmount(e.target.value)}
                      className="flex-1 bg-transparent text-xl font-display font-bold outline-none"
                    />
                    <select
                      value={convertFrom}
                      onChange={e => setConvertFrom(e.target.value as Currency)}
                      className="bg-card rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-border"
                    >
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                </div>

                {/* Swap */}
                <div className="flex justify-center -my-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-2"
                    onClick={() => { setConvertFrom(convertTo); setConvertTo(convertFrom); }}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                </div>

                {/* To */}
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10">
                  <label className="text-[10px] text-primary font-semibold uppercase tracking-wider">To</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="flex-1 text-xl font-display font-bold text-primary">
                      {formatCurrency(convertCurrency(parseFloat(convertAmount) || 0, convertFrom, convertTo), convertTo)}
                    </p>
                    <select
                      value={convertTo}
                      onChange={e => setConvertTo(e.target.value as Currency)}
                      className="bg-card rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-border"
                    >
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                </div>

                {/* Rate info */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted text-[11px]">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-semibold">
                    1 {convertFrom} = {convertCurrency(1, convertFrom, convertTo).toFixed(convertTo === "JPY" || convertTo === "KRW" ? 1 : 4)} {convertTo}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Convert */}
          <motion.div variants={item}>
            <h3 className="section-header mb-3">Quick Reference</h3>
            <div className="grid grid-cols-2 gap-2">
              {[100, 500, 1000, 5000].map(amt => (
                <Card key={amt} className="border-0 card-interactive">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{formatCurrency(amt, convertFrom)}</p>
                    <p className="font-display font-bold text-sm text-primary mt-0.5">
                      {formatCurrency(convertCurrency(amt, convertFrom, convertTo), convertTo)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
