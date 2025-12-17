
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, PlusCircle, History, TrendingUp, TrendingDown, Wallet, Sparkles, X, Trash2, 
  Stethoscope, ChevronRight, ArrowUpRight, ArrowDownLeft, Calendar, Filter, MoreHorizontal, Search, RotateCcw
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Transaction, TransactionType, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './types';
import { analyzeBudget } from './services/geminiService';

interface FilterState {
  type: string;
  category: string;
  startDate: string;
  endDate: string;
  search: string;
}

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isApiMode, setIsApiMode] = useState(true);
  
  const [filters, setFilters] = useState<FilterState>({
    type: '', category: '', startDate: '', endDate: '', search: ''
  });

  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'INCOME',
    date: new Date().toISOString().split('T')[0],
    category: INCOME_CATEGORIES[0]
  });

  // Fetch data with hybrid strategy
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions');
      
      // Controllo se la risposta è effettivamente JSON
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setTransactions(data);
        setIsApiMode(true);
      } else {
        throw new Error("API non disponibile o risposta non JSON");
      }
    } catch (err) {
      console.warn("Backend non rilevato, passaggio a LocalStorage fallback.");
      setIsApiMode(false);
      const saved = localStorage.getItem('clinica_transactions_fallback');
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync with localStorage if in fallback mode
  useEffect(() => {
    if (!isApiMode && transactions.length > 0) {
      localStorage.setItem('clinica_transactions_fallback', JSON.stringify(transactions));
    }
  }, [transactions, isApiMode]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesType = !filters.type || tx.type === filters.type;
      const matchesCategory = !filters.category || tx.category === filters.category;
      const matchesStartDate = !filters.startDate || new Date(tx.date) >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || new Date(tx.date) <= new Date(filters.endDate);
      const matchesSearch = !filters.search || 
        tx.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        tx.category.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesType && matchesCategory && matchesStartDate && matchesEndDate && matchesSearch;
    });
  }, [transactions, filters]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
      ratio: expense > 0 ? ((income / expense) * 100).toFixed(0) : '100'
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    return [...transactions].reverse().slice(0, 10).map(t => ({
      date: t.date.split('-').slice(1).join('/'),
      amount: t.amount,
      type: t.type
    }));
  }, [transactions]);

  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;

    const txToSave = {
      date: newTx.date || new Date().toISOString().split('T')[0],
      amount: Number(newTx.amount),
      description: newTx.description!,
      type: newTx.type as TransactionType,
      category: newTx.category!
    };

    if (isApiMode) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(txToSave)
        });
        if (res.ok) await fetchTransactions();
      } catch (err) {
        console.error("API Error:", err);
      }
    } else {
      const newLocalTx = { ...txToSave, id: Date.now().toString() } as Transaction;
      setTransactions([newLocalTx, ...transactions]);
    }
    
    setIsModalOpen(false);
    setNewTx({ type: 'INCOME', date: new Date().toISOString().split('T')[0], category: INCOME_CATEGORIES[0] });
  };

  const deleteTransaction = async (id: string) => {
    if (isApiMode) {
      try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) setTransactions(transactions.filter(t => t.id !== id));
      } catch (err) {
        console.error("API Error:", err);
      }
    } else {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeBudget(transactions);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const resetFilters = () => {
    setFilters({ type: '', category: '', startDate: '', endDate: '', search: '' });
  };

  const allUniqueCategories = useMemo(() => {
    const cats = new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]);
    return Array.from(cats).sort();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fdfdff] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-slate-950 text-white p-8 flex flex-col gap-10 shadow-2xl z-20 shrink-0">
        <div className="flex items-center gap-4 group">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <Stethoscope size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ClinicaFinance</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Management AI</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'transactions', icon: History, label: 'Transazioni' },
            { id: 'analytics', icon: TrendingUp, label: 'Analisi' },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <div className="flex items-center gap-3.5">
                <item.icon size={20} className={activeTab === item.id ? 'text-indigo-400' : ''} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {activeTab === item.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </button>
          ))}
        </nav>

        {!isApiMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
            <p className="text-[10px] text-amber-500 font-bold uppercase mb-1">Preview Mode</p>
            <p className="text-[10px] text-slate-400">Salvataggio locale attivo. I dati non saranno persistenti dopo la cancellazione della cache.</p>
          </div>
        )}

        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] p-6 shadow-xl shadow-indigo-500/10 mt-auto">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-indigo-200 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Intelligenza Artificiale</span>
            </div>
            <p className="text-xs text-indigo-100/80 mb-5 leading-relaxed">Analisi predittiva basata sulle tue operazioni reali.</p>
            <button onClick={runAnalysis} disabled={isAnalyzing} className="w-full py-3 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
              {isAnalyzing ? <div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" /> : <>Esegui Analisi <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard Studio</h2>
            <p className="text-slate-500 mt-1 font-medium">Panoramica finanziaria e gestione transazioni.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2.5 shadow-lg shadow-indigo-600/20 active:translate-y-0.5">
              <PlusCircle size={20} /> Nuova Operazione
            </button>
          </div>
        </header>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { label: 'Entrate Totali', value: stats.income, color: 'emerald', icon: ArrowUpRight },
            { label: 'Uscite Totali', value: stats.expense, color: 'rose', icon: ArrowDownLeft },
            { label: 'Bilancio Netto', value: stats.balance, color: 'indigo', icon: Wallet }
          ].map((stat, i) => (
            <div key={i} className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
               <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 rounded-full -mr-16 -mt-16 blur-3xl`} />
               <div className="flex items-start justify-between mb-6">
                <div className={`p-3.5 bg-${stat.color}-50 text-${stat.color}-600 rounded-[1.2rem]`}>
                  <stat.icon size={26} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">€ {stat.value.toLocaleString('it-IT')}</h3>
              </div>
            </div>
          ))}
        </section>

        {/* AI Insight Box */}
        {aiAnalysis && (
          <section className="group relative bg-white p-1 rounded-[3rem] mb-12 shadow-2xl overflow-hidden border border-indigo-100">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-x" />
            <div className="relative bg-white rounded-[2.8rem] p-10 m-0.5 shadow-inner">
              <button onClick={() => setAiAnalysis(null)} className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={18} /></button>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 text-white rounded-[1.2rem] shadow-lg shadow-indigo-600/30"><Sparkles size={24} className="animate-spin-slow" /></div>
                <h4 className="text-2xl font-black text-slate-900">Insight Strategico AI</h4>
              </div>
              <div className="prose prose-slate max-w-none grid grid-cols-1 md:grid-cols-2 gap-8">
                {aiAnalysis.split('\n\n').map((block, i) => (
                  <div key={i} className={`p-6 rounded-3xl ${i % 2 === 0 ? 'bg-indigo-50/50 border border-indigo-100/50' : 'bg-slate-50 border border-slate-100'}`}>
                    {block.split('\n').map((line, j) => <p key={j} className={`${j === 0 ? 'font-bold text-slate-900 mb-2 text-lg' : 'text-sm leading-relaxed text-slate-600'}`}>{line.replace(/^[#*-]+\s*/, '')}</p>)}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Transactions Table */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-8 border-b border-slate-50 flex flex-col gap-6 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-black text-slate-900">Operazioni Recenti</h4>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}><Filter size={14} /> Filtri</button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-in slide-in-from-top-4 duration-300">
                <input type="text" placeholder="Cerca..." className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}><option value="">Tutti i tipi</option><option value="INCOME">Entrate</option><option value="EXPENSE">Uscite</option></select>
                <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}><option value="">Tutte le categorie</option>{allUniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <div className="flex gap-2 col-span-1 md:col-span-2">
                  <input type="date" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                  <input type="date" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                  <button onClick={resetFilters} className="px-4 bg-slate-200 rounded-xl"><RotateCcw size={14} /></button>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-left">
              <thead><tr className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]"><th className="px-6 py-5">Data</th><th className="px-6 py-5">Dettaglio</th><th className="px-6 py-5">Categoria</th><th className="px-6 py-5 text-right">Importo</th><th className="px-6 py-5"></th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-6 text-xs font-bold text-slate-400">{new Date(tx.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-6 py-6"><p className="text-sm font-bold text-slate-800">{tx.description}</p></td>
                    <td className="px-6 py-6"><span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase">{tx.category}</span></td>
                    <td className={`px-6 py-6 text-sm font-black text-right ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.type === 'INCOME' ? '+' : '-'} € {tx.amount.toLocaleString('it-IT')}</td>
                    <td className="px-6 py-6 text-right"><button onClick={() => deleteTransaction(tx.id)} className="p-2.5 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-3xl font-black text-slate-900 mb-8">Nuova Voce</h3>
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-[1.5rem]">
                <button type="button" onClick={() => setNewTx({ ...newTx, type: 'INCOME', category: INCOME_CATEGORIES[0] })} className={`py-3.5 rounded-[1.2rem] text-xs font-black uppercase ${newTx.type === 'INCOME' ? 'bg-white text-emerald-600' : 'text-slate-400'}`}>Entrata</button>
                <button type="button" onClick={() => setNewTx({ ...newTx, type: 'EXPENSE', category: EXPENSE_CATEGORIES[0] })} className={`py-3.5 rounded-[1.2rem] text-xs font-black uppercase ${newTx.type === 'EXPENSE' ? 'bg-white text-rose-600' : 'text-slate-400'}`}>Uscita</button>
              </div>
              <input type="text" required placeholder="Descrizione" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newTx.description || ''} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-6">
                <input type="number" required placeholder="0.00" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg" value={newTx.amount || ''} onChange={e => setNewTx({ ...newTx, amount: Number(e.target.value) })} />
                <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newTx.date || ''} onChange={e => setNewTx({ ...newTx, date: e.target.value })} />
              </div>
              <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
                {(newTx.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1">Salva Transazione</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradient-x { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 15s ease infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
