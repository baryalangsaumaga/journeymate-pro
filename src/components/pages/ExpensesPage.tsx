import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, Users, PieChart, ArrowRightLeft,
  Plus, Filter, ChevronDown, Utensils, Car, Hotel, Ticket, ShoppingBag,
  MoreHorizontal, Receipt, CircleDollarSign, ArrowRight, Check, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { currencyRates, currentUser, collaborators } from "@/data/mockData";
import type { ExpenseCategory, Currency } from "@/types/travel";
import { useTrip } from "@/hooks/useTrip";
import { useAuth } from "@/auth/AuthProvider";
import { useExpenses } from "@/hooks/useExpenses";
import { useBudget } from "@/hooks/useBudget";
import { currencyApi } from "@/lib/api";

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

export default function ExpensesPage() {
  const { active: trip } = useTrip();
  const { user } = useAuth();
  
  const [displayCurrency] = useState<Currency>("PHP");
  const [convertAmount, setConvertAmount] = useState("1000");
  const [convertFrom, setConvertFrom] = useState<Currency>("PHP");
  const [convertTo, setConvertTo] = useState<Currency>("USD");
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<ExpenseCategory>("food");
  const [activeFilters, setActiveFilters] = useState<ExpenseCategory[]>([]);
  const [settledIds, setSettledIds] = useState<number[]>([]);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});

  useEffect(() => {
    currencyApi.getRates('USD')
      .then(res => {
        if (res.data && res.data.rates) {
          setLiveRates(res.data.rates);
        }
      })
      .catch(err => console.error("Failed to fetch live rates from backend", err));
  }, []);

  const { expenses, addExpense } = useExpenses(trip?.id?.toString() || "");
  const { budget } = useBudget(trip?.id?.toString() || "");
  
  // Create an empty fallback budget if none exists
  const activeBudget = budget || {
    total_budget: 0,
    currency: "USD",
    categories: []
  };
  // Use real collaborators from the active trip, mixed with user
  const allUsers = useMemo(() => {
    const users = [...(trip?.collaborators || [])];
    if (user && !users.some(u => u.id === user.id)) {
      users.push({
        id: user.id.toString(),
        name: user.name || user.email || 'You',
        avatar: "https://i.pravatar.cc/150?u=" + user.id,
        role: "owner",
        isOnline: true
      });
    }
    // Fallback to mock users if none
    if (users.length === 0) return [currentUser, ...collaborators];
    return users;
  }, [trip, user]);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = activeBudget.total_budget - totalSpent;
  const spentPercent = activeBudget.total_budget > 0 ? (totalSpent / activeBudget.total_budget) * 100 : 0;

  const balances = useMemo(() => {
    const userTotals: Record<string, number> = {};
    expenses.forEach(exp => {
      const share = exp.amount / (exp.split_among?.length || 1);
      userTotals[exp.user_id] = (userTotals[exp.user_id] || 0) + exp.amount;
      (exp.split_among || []).forEach((uid: string) => {
        userTotals[uid] = (userTotals[uid] || 0) - share;
      });
    });
    return userTotals;
  }, [expenses]);

  const filteredExpenses = activeFilters.length > 0
    ? expenses.filter(e => activeFilters.includes(e.category as ExpenseCategory))
    : expenses;

  const suggestedSettlements = useMemo(() => {
    const debtors = [];
    const creditors = [];
    for (const [id, balance] of Object.entries(balances)) {
      if (balance < -0.01) debtors.push({ id, amount: Math.abs(balance) });
      else if (balance > 0.01) creditors.push({ id, amount: balance });
    }
    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);
      const fromUser = allUsers.find(u => u.id === debtor.id)?.name || "Unknown";
      const toUser = allUsers.find(u => u.id === creditor.id)?.name || "Unknown";
      settlements.push({ from: fromUser, to: toUser, amount });
      debtor.amount -= amount;
      creditor.amount -= amount;
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    return settlements;
  }, [balances, allUsers]);

  const convertCurrency = (amount: number, from: Currency, to: Currency) => {
    if (from === to) return amount;
    if (liveRates[from] && liveRates[to]) {
      return (amount / liveRates[from]) * liveRates[to];
    }
    const rate = currencyRates.find(r => r.from === from && r.to === to);
    if (rate) return amount * rate.rate;
    const reverse = currencyRates.find(r => r.from === to && r.to === from);
    if (reverse) return amount / reverse.rate;
    return amount;
  };

  const formatCurrency = (amount: number, currency: Currency = "PHP") => {
    const sym = currencies.find(c => c.code === currency)?.symbol || "₱";
    return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: amount < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const handleAddExpense = async () => {
    if (!newDesc.trim() || !newAmount) return;
    
    try {
      await addExpense({
        category: newCategory,
        description: newDesc,
        amount: parseFloat(newAmount),
        currency: "PHP",
        date: new Date().toISOString().split('T')[0],
        split_among: trip?.collaborators?.map(c => c.id.toString()) || [],
        user_id: user?.id?.toString() || ""
      });
      toast({ title: "💰 Expense Added!", description: `${newDesc} — ${formatCurrency(parseFloat(newAmount))}` });
      setNewDesc("");
      setNewAmount("");
      setAddOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to add expense.", variant: "destructive" });
    }
  };

  const handleSettle = (index: number) => {
    setSettledIds(prev => [...prev, index]);
    toast({ title: "✅ Settlement Recorded!", description: "Payment has been marked as complete." });
  };

  const toggleFilter = (cat: ExpenseCategory) => {
    setActiveFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

  if (!trip) {
    return (
      <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
        <Receipt className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="font-display font-bold text-lg">No Active Trip</h3>
        <p className="text-sm text-muted-foreground mt-1">Select a trip in your itinerary to view expenses.</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight">Expenses</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{trip.title}</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 rounded-xl shadow-travel text-xs font-semibold" onClick={() => setAddOpen(true)}>
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
                    <p className="font-display font-bold text-2xl tracking-tight mt-0.5">{formatCurrency(activeBudget.total_budget)}</p>
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
                    <p className="font-display font-bold text-sm">{trip.collaborators?.length || 1}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Splitting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <h3 className="section-header mb-3">Budget by Category</h3>
            <div className="space-y-2.5">
              {activeBudget.categories.map((cat: any) => {
                const config = categoryConfig[cat.category as ExpenseCategory] || categoryConfig.other;
                const Icon = config.icon;
                const pct = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
                return (
                  <Card key={cat.category} className="border-0 card-interactive">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
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
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-muted-foreground rounded-lg" onClick={() => setFilterOpen(!filterOpen)}>
                <Filter className="w-3 h-3" /> Filter {activeFilters.length > 0 && `(${activeFilters.length})`}
              </Button>
            </div>
            {filterOpen && (
              <div className="flex gap-1.5 flex-wrap pb-2">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key as ExpenseCategory)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      activeFilters.includes(key as ExpenseCategory)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <config.icon className="w-3 h-3" /> {config.label}
                  </button>
                ))}
                {activeFilters.length > 0 && (
                  <button onClick={() => setActiveFilters([])} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-destructive/10 text-destructive">
                    Clear
                  </button>
                )}
              </div>
            )}
          </motion.div>
          {filteredExpenses.map((exp: any) => {
            const config = categoryConfig[exp.category as ExpenseCategory] || categoryConfig.other;
            const Icon = config.icon;
            const payer = allUsers.find(u => u.id === exp.user_id?.toString()) || currentUser;
            return (
              <motion.div key={exp.id} variants={item}>
                <Card className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{exp.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img src={payer?.avatar} className="w-3.5 h-3.5 rounded-full" />
                        <span className="text-[10px] text-muted-foreground">{payer?.name?.split(" ")[0]} paid</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">{exp.split_among?.length || 1} split</span>
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
          {filteredExpenses.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No expenses match filter</p>
            </div>
          )}
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
                  {allUsers.map(userItem => {
                    // map mock ids for demo purposes
                    const balance = balances[userItem.id] || balances[currentUser.id] || 0;
                    const isPositive = balance > 0;
                    return (
                      <div key={userItem.id} className="flex items-center gap-3">
                        <div className="relative">
                          <img src={userItem.avatar} className="w-10 h-10 rounded-xl" />
                          {userItem.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold">{userItem.name} {userItem.id === user?.id.toString() ? "(You)" : ""}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{userItem.role}</p>
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

          <motion.div variants={item}>
            <h3 className="section-header mb-3">Suggested Settlements</h3>
            <div className="space-y-2">
              {suggestedSettlements.length > 0 ? (
                suggestedSettlements.map((s, i) => (
                  <Card key={i} className={`border-0 card-interactive ${settledIds.includes(i) ? "opacity-50" : ""}`}>
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
                      <Button
                        size="sm"
                        className="h-7 text-[10px] rounded-lg gap-1"
                        disabled={settledIds.includes(i)}
                        onClick={() => handleSettle(i)}
                      >
                        <Check className="w-3 h-3" /> {settledIds.includes(i) ? "Done" : "Settle"}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">All settled up! No one owes anything.</p>
              )}
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
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted text-[11px]">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-semibold">
                    1 {convertFrom} = {convertCurrency(1, convertFrom, convertTo).toFixed(convertTo === "JPY" || convertTo === "KRW" ? 1 : 4)} {convertTo}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

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

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add Expense</DialogTitle>
            <DialogDescription>Record a new expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Lunch at Jollibee" className="mt-1.5 h-10 rounded-xl border-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount (₱)</label>
              <Input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" placeholder="0.00" className="mt-1.5 h-10 rounded-xl border-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setNewCategory(key as ExpenseCategory)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-[10px] font-semibold transition-all ${
                      newCategory === key ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <config.icon className="w-4 h-4" />
                    {config.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button className="w-full h-10 rounded-xl shadow-travel font-semibold" onClick={handleAddExpense} disabled={!newDesc.trim() || !newAmount}>
            <Plus className="w-4 h-4 mr-1" /> Add Expense
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
