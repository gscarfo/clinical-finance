
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions');
      const contentType = res.headers.get("content-type");
      
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
        setIsApiMode(true);
      } else {
        throw new Error("API non disponibile");
      }
    } catch (err) {
      console.warn("Utilizzo LocalStorage Fallback.");
      setIsApiMode(false);
      const saved = localStorage.getItem('clinica_transactions_fallback');
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;

    const txToSave = {
      date: newTx.date || new Date().toISOString().split('T')[0],
      amount: Number(newTx.amount),
      description: String(newTx.description),
      type: newTx.type as TransactionType,
      category: String(newTx.category)
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
        const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
        if (res.ok) setTransactions(transactions.filter(t => t.id !== id));
      } catch (err) {
        console.error("API Error:", err);
      }
    } else {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const runAnalysis = async () => {
    if (transactions.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeBudget(transactions);
    setAiAnalysis(String(result));
    setIsAnalyzing(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fdfdff] text-slate-900 font-sans">
      <aside className="w-full lg:w-72 bg-slate-950 text-white p-8 flex flex-col gap-10 shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg">
            <Stethoscope size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ClinicaFinance</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase">Management AI</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3.5 p-3.5 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <LayoutDashboard size={20} />
            <span className="font-medium text-sm">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-3.5 p-3.5 rounded-2xl transition-all ${activeTab === 'transactions' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <History size={20} />
            <span className="font-medium text-sm">Transazioni</span>
          </button>
        </nav>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-indigo-200" />
            <span className="text-[10px] font-bold uppercase text-indigo-100 tracking-widest">AI Insight</span>
          </div>
          <p className="text-xs text-indigo-100/80 mb-5 leading-relaxed">Analisi strategica del budget medico.</p>
          <button onClick={runAnalysis} disabled={isAnalyzing || transactions.length === 0} className="w-full py-3 bg-white text-indigo-700 disabled:opacity-50 rounded-xl text-xs font-bold shadow-md hover:bg-indigo-50">
            {isAnalyzing ? "Analisi..." : "Analizza Ora"}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Studio Medico</h2>
            <p className="text-slate-500 mt-1 font-medium">Panoramica finanziaria in tempo reale.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2.5">
            <PlusCircle size={20} /> Nuova Operazione
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6">
              <ArrowUpRight size={26} />
            </div>
            <p className="text-slate-400 text-sm font-bold uppercase mb-1">Entrate</p>
            <h3 className="text-3xl font-black text-slate-900">€ {stats.income.toLocaleString('it-IT')}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl w-fit mb-6">
              <ArrowDownLeft size={26} />
            </div>
            <p className="text-slate-400 text-sm font-bold uppercase mb-1">Uscite</p>
            <h3 className="text-3xl font-black text-slate-900">€ {stats.expense.toLocaleString('it-IT')}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6">
              <Wallet size={26} />
            </div>
            <p className="text-slate-400 text-sm font-bold uppercase mb-1">Bilancio</p>
            <h3 className="text-3xl font-black text-slate-900">€ {stats.balance.toLocaleString('it-IT')}</h3>
          </div>
        </section>

        {aiAnalysis && (
          <section className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl mb-12 relative overflow-hidden">
            <button onClick={() => setAiAnalysis(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-all"><X size={20}/></button>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-indigo-600" />
              <h4 className="text-xl font-bold text-slate-900">Analisi Strategica AI</h4>
            </div>
            <div className="prose prose-indigo max-w-none text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {String(aiAnalysis)}
            </div>
          </section>
        )}

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h4 className="font-bold text-slate-900">Ultime Operazioni</h4>
            <button onClick={() => setShowFilters(!showFilters)} className="text-xs font-bold text-indigo-600 flex items-center gap-1.5"><Filter size={14}/> Filtri</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest"><th className="px-8 py-5">Data</th><th className="px-8 py-5">Descrizione</th><th className="px-8 py-5 text-right">Importo</th><th className="px-8 py-5"></th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6 text-sm text-slate-500">{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                    <td className="px-8 py-6 font-semibold text-slate-800">{String(tx.description)}</td>
                    <td className={`px-8 py-6 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.type === 'INCOME' ? '+' : '-'} € {tx.amount.toLocaleString('it-IT')}</td>
                    <td className="px-8 py-6 text-right"><button onClick={() => deleteTransaction(tx.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl">
            <h3 className="text-2xl font-bold mb-8">Nuova Operazione</h3>
            <form onSubmit={handleAddTransaction} className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button type="button" onClick={() => setNewTx({...newTx, type: 'INCOME'})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${newTx.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrata</button>
                <button type="button" onClick={() => setNewTx({...newTx, type: 'EXPENSE'})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${newTx.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Uscita</button>
              </div>
              <input type="text" required placeholder="Descrizione" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" required placeholder="Importo €" className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} />
                <input type="date" className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newTx.date || ''} onChange={e => setNewTx({...newTx, date: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700">Salva Voce</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
