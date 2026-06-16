import React, { useEffect, useState } from 'react';
import api from '../lib/axios';
import { 
  Plus, Search, Filter,
  Trash2, TrendingDown, Receipt, 
  X, Loader2, Tag, Briefcase, 
  Plane, Wrench, Users, AlertTriangle
} from 'lucide-react';
import ExportButton from '../components/ui/ExportButton';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'OFFICE',
    amount: '',
    description: '',
    paymentMode: 'UPI'
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    try {
      setIsLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/expenses', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Expense recorded');
      setShowModal(false);
      setFormData({ category: 'OFFICE', amount: '', description: '', paymentMode: 'UPI' });
      fetchExpenses();
    } catch (e) {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.delete(`/expenses/${deleteTarget.id}`);
      toast.success('Expense deleted');
      setDeleteTarget(null);
      fetchExpenses();
    } catch (e) {
      toast.error('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'OFFICE': return <Briefcase size={14} />;
      case 'TRAVEL': return <Plane size={14} />;
      case 'MAINTENANCE': return <Wrench size={14} />;
      case 'SALARY': return <Users size={14} />;
      default: return <Tag size={14} />;
    }
  };

  const filteredExpenses = expenses.filter(ex => 
    ex.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-text-primary uppercase tracking-tight">Expense Ledger</h1>
          <p className="text-[11px] text-text-muted mt-1 uppercase font-black tracking-widest">Operational Outflow · Cash Management</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={expenses} filename="drishtivision_expenses" />
          <button onClick={() => setShowModal(true)} className="btn-primary text-[12px] py-1.5 flex items-center gap-2 shadow-lg shadow-accent-orange/30">
            <Plus size={16} /> Record Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
         <div className="card border-danger/20 bg-danger/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingDown size={48} /></div>
            <div className="text-[9px] text-danger uppercase font-black tracking-widest">Total Expenses (MTD)</div>
            <div className="text-2xl font-black text-text-primary mt-2">₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</div>
            <div className="text-[10px] text-text-muted mt-1 font-bold">Updated just now</div>
         </div>
         <div className="card border-accent-blue/20 bg-accent-blue/5">
            <div className="text-[9px] text-accent-blue uppercase font-black tracking-widest">Office Overheads</div>
            <div className="text-2xl font-black text-text-primary mt-2">₹{expenses.filter(e => e.category === 'OFFICE').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</div>
         </div>
         <div className="card border-success/20 bg-success/5">
            <div className="text-[9px] text-success uppercase font-black tracking-widest">Tax Input (GST)</div>
            <div className="text-2xl font-black text-text-primary mt-2">₹0.00</div>
         </div>
      </div>

      <div className="card space-y-4 border-border/40">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input 
              type="text" 
              placeholder="Search expenses..." 
              className="w-full bg-bg-surface-2 border border-border rounded-xl pl-9 pr-3 py-2.5 text-[12px] focus:outline-none focus:border-accent-orange transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-outline flex items-center justify-center gap-2 text-[12px]"><Filter size={14} /> Filters</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden border-border/50 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-surface-2 border-b border-border text-[10px] font-black text-text-muted uppercase tracking-widest">
              <th className="px-6 py-4">Transaction Date</th>
              <th className="px-6 py-4">Classification</th>
              <th className="px-6 py-4">Reference / Description</th>
              <th className="px-6 py-4 text-center">Method</th>
              <th className="px-6 py-4 text-right">Debit Amount</th>
              <th className="px-6 py-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-accent-orange" /></td></tr>
            ) : filteredExpenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-bg-surface-2 transition-colors group cursor-pointer">
                <td className="px-6 py-4 text-[12px] font-bold text-text-muted">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-[11px] font-black text-text-primary uppercase tracking-tighter">
                     <span className="p-1.5 bg-bg-surface-2 rounded-lg border border-border">{getCategoryIcon(exp.category)}</span>
                     {exp.category}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[13px] font-bold text-text-primary line-clamp-1">{exp.description}</div>
                  <div className="text-[10px] text-text-muted font-bold uppercase mt-0.5 tracking-tighter">ID: {exp.id.slice(0, 8)}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[10px] font-black uppercase px-2 py-1 bg-bg-surface-2 border border-border rounded-lg">{exp.paymentMode}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-[14px] font-black text-danger">- ₹{exp.amount.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(exp); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted"
                    title="Delete expense"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center text-text-muted uppercase font-black text-[11px] tracking-widest italic opacity-50">Zero Outflow Recorded</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-bg-surface-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger rounded-2xl flex items-center justify-center shadow-inner"><Receipt size={20} /></div>
                <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">Operational Expense</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-bg-surface border border-transparent hover:border-border rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase ml-1">Classification</label>
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})} 
                      className="w-full bg-bg-surface-2 border border-border rounded-2xl px-4 py-3.5 text-[13px] outline-none font-bold"
                    >
                      <option value="OFFICE">Office Supplies & Rent</option>
                      <option value="TRAVEL">Fuel & Travel</option>
                      <option value="MAINTENANCE">Site Maintenance</option>
                      <option value="SALARY">Staff Salaries</option>
                      <option value="OTHER">Other Expenses</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase ml-1">Debit Amount (₹)</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.amount} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                      className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[16px] font-black text-danger outline-none" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase ml-1">Payment Method</label>
                    <select 
                      value={formData.paymentMode} 
                      onChange={(e) => setFormData({...formData, paymentMode: e.target.value})} 
                      className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] outline-none font-bold"
                    >
                      <option value="CASH">Cash Ledger</option>
                      <option value="UPI">UPI / QR Scan</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase ml-1">Reference / Details</label>
                    <input 
                      type="text" 
                      required
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                      className="w-full bg-bg-surface-2 border border-border rounded-2xl px-4 py-3.5 text-[13px] outline-none font-bold" 
                      placeholder="e.g. Office electricity bill May 2026" 
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-bg-surface-2 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline px-8 py-2.5 text-[12px]">Discard</button>
                <button type="submit" className="px-10 py-2.5 bg-danger text-white rounded-xl text-[12px] font-black uppercase tracking-widest shadow-xl shadow-danger/20">Confirm Debit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="bg-bg-surface border border-danger/30 rounded-3xl w-full max-w-md shadow-2xl shadow-danger/20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex justify-between items-center bg-bg-surface-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger rounded-2xl flex items-center justify-center"><AlertTriangle size={20} /></div>
                <h2 className="text-[16px] font-black text-text-primary uppercase tracking-tight">Delete Expense</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="p-2 hover:bg-bg-surface border border-transparent hover:border-border rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4">
                <p className="text-[14px] font-black text-text-primary">{deleteTarget.description || deleteTarget.category}</p>
                <p className="text-[12px] text-danger font-black mt-1">₹{deleteTarget.amount?.toLocaleString()}</p>
                <p className="text-[10px] text-text-muted mt-1">{format(new Date(deleteTarget.date), 'dd MMM yyyy')} · {deleteTarget.paymentMode}</p>
              </div>
              <p className="text-[11px] text-danger font-bold uppercase tracking-wide">⚠ This action cannot be undone.</p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="flex-1 btn-outline py-3 text-[12px] font-black uppercase">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-danger text-white rounded-xl py-3 text-[12px] font-black uppercase shadow-lg shadow-danger/30 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
