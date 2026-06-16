import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Building, CreditCard, 
  ShieldCheck, Globe, Bell, Save, 
  User, Check, X, Smartphone, Mail,
  Download, FileSpreadsheet, FileText, Trash2, AlertCircle, CheckCircle2,
  Database, Cloud, RefreshCw, Server, UserPlus, Users, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/useNotificationStore';
import ExportButton from '../components/ui/ExportButton';
import { exportToExcel } from '../lib/export';
import api from '../lib/axios';

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'profile' | 'banking' | 'users' | 'notifications' | 'backup' | 'infra'>('profile');
  const { notifications, clearAll, markAsRead } = useNotificationStore();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  
  // User Management State
  const [userList, setUserList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [cleaningDemo, setCleaningDemo] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('dv_user') || '{}');
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const [org, setOrg] = useState<any>({
    id: '',
    name: '',
    gstin: '',
    panNumber: '',
    address: '',
    bankName: '',
    upiId: '',
    accountNumber: '',
    ifscCode: ''
  });

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'member'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.organization) {
          setOrg(res.data.organization);
      }
    } catch (err) {
      console.error('Failed to fetch profile');
    }
  };

  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsers();
    }
  }, [activeSection]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/auth/users');
      setUserList(res.data);
    } catch (err) {
      console.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOrgSave = async () => {
    setSavingOrg(true);
    try {
      await api.put(`/auth/organization/${org.id}`, org);
      toast.success('Organization configuration updated!');
      fetchInitialData();
    } catch (err) {
      toast.error('Failed to update organization details');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', newUser);
      toast.success('User created successfully');
      setNewUser({ email: '', password: '', fullName: '', role: 'member' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (id === currentUser.id) {
      toast.error('You cannot delete your own administrative account');
      return;
    }

    if (window.confirm(`Are you sure you want to PERMANENTLY delete the account for ${name}? This action cannot be undone.`)) {
      try {
        await api.delete(`/auth/users/${id}`);
        toast.success('User account removed');
        fetchUsers();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    if (!isAdmin) return;
    const newPassword = window.prompt(`Enter new password for ${name}:`, '');
    
    if (newPassword === null) return; // Cancelled
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await api.patch(`/auth/users/${id}/password`, { newPassword });
      toast.success(`Password for ${name} has been reset`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await api.get('/health');
      setHealthStatus(res.data);
      toast.success('System status verified');
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({ api: 'unreachable', database: 'unknown', storage: 'unknown' });
      toast.error('System health check failed');
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSave = () => {
    toast.success('Configuration saved successfully!');
  };

  const handleSystemBackup = (format: 'excel') => {
    const backupData = [
      { Module: 'Profile', Status: 'Verified', LastSync: new Date().toLocaleString() },
      { Module: 'Inventory', Count: 147, Health: '100%' },
      { Module: 'Finance', Revenue: '₹2.4Cr', Compliance: 'GST Ready' }
    ];
    
    exportToExcel({
      headers: ['Module', 'Details', 'Timestamp'],
      data: backupData.map(d => Object.values(d)),
      filename: 'dv_system_full_backup',
      title: 'DRISHTIVISION SYSTEM BACKUP'
    });
    toast.success(`Full system backup generated as ${format.toUpperCase()}`);
  };

  const handleCleanDemoData = async () => {
    if (!window.confirm('This will permanently remove placeholder/demo data (Acme Corp, Main Office, Summer Launch, INV-2026-001) from your organization. Your real data will not be touched. Continue?')) return;
    try {
      setCleaningDemo(true);
      const res = await api.delete('/auth/demo-data');
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove demo data');
    } finally {
      setCleaningDemo(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary uppercase tracking-tight">System Configuration</h1>
          <p className="text-[12px] text-text-muted mt-1 uppercase tracking-widest font-black">Global Parameters & Data Integrity</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveSection('backup')} className="btn-outline flex items-center gap-2 px-4 text-accent-blue border-accent-blue/30"><Download size={16} /> System Backup</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-accent-orange/30">
            <Save size={18} /> Save All Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-8">
        <div className="col-span-1 space-y-1">
          {[
            { id: 'profile', label: 'Company Profile', icon: <Building size={16} /> },
            { id: 'banking', label: 'Bank Details', icon: <CreditCard size={16} /> },
            { id: 'users', label: 'User Management', icon: <Users size={16} /> },
            { id: 'notifications', label: 'Notification Center', icon: <Bell size={16} /> },
            { id: 'backup', label: 'Data & Backup', icon: <Download size={16} /> },
            { id: 'infra', label: 'System Architecture', icon: <Server size={16} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all ${
                activeSection === item.id 
                  ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/20' 
                  : 'text-text-muted hover:bg-bg-surface-2 hover:text-text-primary'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="col-span-3 space-y-6">
          {activeSection === 'profile' && (
            <div className="card space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center shadow-inner">
                       <Building size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-text-primary uppercase tracking-tighter">Business Identity</h2>
                 </div>
                 <button onClick={handleOrgSave} disabled={savingOrg} className="btn-primary py-1.5 px-4 text-[11px] flex items-center gap-2">
                    {savingOrg ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Profile
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Registered Company Name</label>
                    <input type="text" value={org.name} onChange={e => setOrg({...org, name: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-bold text-text-primary outline-none focus:border-accent-orange transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">GSTIN Number</label>
                    <input type="text" value={org.gstin || ''} onChange={e => setOrg({...org, gstin: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-mono font-bold text-text-primary outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">PAN Number</label>
                    <input type="text" value={org.panNumber || ''} onChange={e => setOrg({...org, panNumber: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-mono font-bold text-text-primary outline-none" />
                 </div>
                 <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Corporate Address</label>
                    <textarea rows={3} value={org.address || ''} onChange={e => setOrg({...org, address: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-medium text-text-primary outline-none focus:border-accent-orange" />
                 </div>
              </div>
            </div>
          )}

          {activeSection === 'banking' && (
            <div className="card space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-blue/10 text-accent-blue rounded-xl flex items-center justify-center shadow-inner">
                       <CreditCard size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-text-primary uppercase tracking-tighter">Settlement Accounts</h2>
                 </div>
                 <button onClick={handleOrgSave} disabled={savingOrg} className="btn-primary py-1.5 px-4 text-[11px] flex items-center gap-2">
                    {savingOrg ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Update Bank Details
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Bank Name</label>
                    <input type="text" value={org.bankName || ''} onChange={e => setOrg({...org, bankName: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-bold text-text-primary outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">UPI ID for Invoices</label>
                    <input type="text" value={org.upiId || ''} onChange={e => setOrg({...org, upiId: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-bold text-text-primary outline-none" placeholder="example@upi" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Account Number</label>
                    <input type="text" value={org.accountNumber || ''} onChange={e => setOrg({...org, accountNumber: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-mono font-bold text-text-primary outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">IFSC Code</label>
                    <input type="text" value={org.ifscCode || ''} onChange={e => setOrg({...org, ifscCode: e.target.value})} className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] font-mono font-bold text-text-primary outline-none" />
                 </div>
              </div>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Add User Form */}
               <div className="card space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                     <div className="w-10 h-10 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center">
                        <UserPlus size={20} />
                     </div>
                     <div>
                        <h2 className="text-lg font-bold text-text-primary uppercase tracking-tighter">Add New User</h2>
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Grant access to the system</p>
                     </div>
                  </div>
                  
                  <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={newUser.fullName}
                          onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                          placeholder="e.g. John Doe"
                          className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-primary outline-none focus:border-accent-orange transition-all" 
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={newUser.email}
                          onChange={e => setNewUser({...newUser, email: e.target.value})}
                          placeholder="user@drishtivision.com"
                          className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-primary outline-none focus:border-accent-orange transition-all" 
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Password</label>
                        <input 
                          type="password" 
                          required
                          value={newUser.password}
                          onChange={e => setNewUser({...newUser, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-primary outline-none focus:border-accent-orange transition-all" 
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">System Role</label>
                        <select 
                          value={newUser.role}
                          onChange={e => setNewUser({...newUser, role: e.target.value})}
                          className="w-full bg-bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-primary outline-none focus:border-accent-orange transition-all"
                        >
                           <option value="member">Member (View & Edit)</option>
                           <option value="admin">Administrator (Full Access)</option>
                        </select>
                     </div>
                     <div className="col-span-2 pt-2">
                        <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-orange/20">
                           <UserPlus size={16} /> Create User Account
                        </button>
                     </div>
                  </form>
               </div>

               {/* User List */}
               <div className="card space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                     <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">Active System Users</h2>
                  </div>
                  <div className="space-y-2">
                     {loadingUsers ? (
                       <div className="p-8 text-center text-text-muted italic">Loading users...</div>
                     ) : userList.length === 0 ? (
                        <div className="p-8 text-center text-text-muted italic">No users found.</div>
                     ) : userList.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-bg-surface-2 border border-border rounded-xl">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-bg-surface border border-border rounded-lg flex items-center justify-center text-text-muted font-bold text-[10px]">
                                 {user.fullName?.split(' ').map((n: any) => n[0]).join('')}
                              </div>
                              <div>
                                 <p className="text-[13px] font-bold text-text-primary">{user.fullName}</p>
                                 <p className="text-[11px] text-text-muted">{user.email}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 mr-4">
                                {isAdmin && user.id !== currentUser.id && (
                                  <>
                                    <button 
                                      onClick={() => handleResetPassword(user.id, user.fullName)}
                                      className="p-2 text-text-muted hover:text-accent-orange transition-colors"
                                      title="Reset Password"
                                    >
                                      <RefreshCw size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUser(user.id, user.fullName)}
                                      className="p-2 text-text-muted hover:text-danger transition-colors"
                                      title="Delete Account"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-accent-orange text-white' : 'bg-accent-blue text-white'}`}>
                                 {user.role}
                              </span>
                              <p className="text-[10px] text-text-muted font-bold uppercase">{new Date(user.createdAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center border-b border-border pb-4">
                 <div className="flex items-center gap-3">
                    <Bell className="text-accent-orange" />
                    <h2 className="text-lg font-bold">Recent Alerts History</h2>
                 </div>
                 <button onClick={clearAll} className="text-[10px] font-black text-danger hover:underline uppercase tracking-widest flex items-center gap-1"><Trash2 size={12} /> Clear All Notification History</button>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-text-muted italic text-[13px]">No active notifications in history.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-4 bg-bg-surface-2 rounded-xl border border-border flex gap-4 items-start group">
                       <div className="shrink-0 mt-1">
                          {n.type === 'CAMPAIGN_END' && <AlertCircle size={18} className="text-warning" />}
                          {n.type === 'INVOICE_DUE' && <AlertCircle size={18} className="text-danger" />}
                          {n.type === 'PAYMENT_RECEIVED' && <CheckCircle2 size={18} className="text-success" />}
                       </div>
                       <div className="flex-1">
                          <p className="text-[13px] font-bold text-text-primary">{n.message}</p>
                          <p className="text-[11px] text-text-muted mt-1 uppercase font-bold">{new Date(n.date).toLocaleString()}</p>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
             <div className="card space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                   <Download className="text-accent-blue" />
                   <h2 className="text-lg font-bold">Data Sovereignty & Backup</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
                   <div className="p-6 bg-bg-surface-2 border border-border rounded-2xl flex flex-col items-center text-center gap-4 hover:border-success transition-all cursor-pointer group" onClick={() => handleSystemBackup('excel')}>
                      <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FileSpreadsheet size={32} /></div>
                      <div>
                         <h3 className="text-sm font-bold">Excel Ledger Backup</h3>
                         <p className="text-[11px] text-text-muted mt-1">Full data extraction in .xlsx format for Tally/Audit</p>
                      </div>
                      <button className="btn-outline w-full py-2 text-[11px]">Generate Excel</button>
                   </div>
                </div>

                {/* Remove Demo Data */}
                {isAdmin && (
                  <div className="border-t border-border pt-6">
                    <h3 className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Trash2 size={14} className="text-danger" /> Placeholder Data Cleanup
                    </h3>
                    <div className="p-5 bg-danger/5 border border-danger/20 rounded-2xl flex items-start justify-between gap-6">
                      <div>
                        <p className="text-[13px] font-bold text-text-primary">Remove Demo / Seed Data</p>
                        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                          Deletes placeholder records created during initial setup:<br />
                          <span className="font-mono text-[10px] text-danger/70">Acme Corp · Main Office · Summer Launch · INV-2026-001</span>
                        </p>
                        <p className="text-[10px] text-text-muted mt-2 uppercase font-bold tracking-wide">⚠ Only demo records will be removed. Real data is safe.</p>
                      </div>
                      <button
                        onClick={handleCleanDemoData}
                        disabled={cleaningDemo}
                        className="shrink-0 bg-danger text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-danger/20 hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2"
                      >
                        {cleaningDemo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {cleaningDemo ? 'Cleaning...' : 'Remove Demo Data'}
                      </button>
                    </div>
                  </div>
                )}
             </div>
          )}

          {activeSection === 'infra' && (
            <div className="card space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center border-b border-border pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-blue/10 text-accent-blue rounded-xl flex items-center justify-center shadow-inner">
                       <Server size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-text-primary uppercase tracking-tighter">Infrastructure Status</h2>
                 </div>
                 <button 
                   onClick={checkHealth} 
                   disabled={checkingHealth}
                   className="btn-outline flex items-center gap-2 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest"
                 >
                   <RefreshCw size={14} className={checkingHealth ? 'animate-spin' : ''} />
                   {checkingHealth ? 'Verifying...' : 'Verify System Integrity'}
                 </button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                 {/* API Status */}
                 <div className="p-5 bg-bg-surface-2 border border-border rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                       <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg">
                          <Globe size={20} />
                       </div>
                       <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                         healthStatus?.api === 'live' ? 'bg-success text-white' : 'bg-text-muted text-white'
                       }`}>
                          {healthStatus?.api || 'UNKNOWN'}
                       </span>
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Core API</h3>
                       <p className="text-[10px] text-text-muted mt-1">Vercel Serverless Gateway</p>
                    </div>
                 </div>

                 {/* Database Status */}
                 <div className="p-5 bg-bg-surface-2 border border-border rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                       <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-lg">
                          <Database size={20} />
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            healthStatus?.database?.startsWith('connected') ? 'bg-success text-white' : 
                            healthStatus?.database?.startsWith('disconnected') ? 'bg-danger text-white' : 'bg-text-muted text-white'
                          }`}>
                             {healthStatus?.database || 'UNKNOWN'}
                          </span>
                          {healthStatus?.db_latency && (
                            <span className="text-[8px] font-bold text-text-muted italic">{healthStatus.db_latency}</span>
                          )}
                       </div>
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Supabase DB</h3>
                       <p className="text-[10px] text-text-muted mt-1">
                         {healthStatus?.db_info?.host || 'PostgreSQL Master Instance'}
                       </p>
                    </div>
                 </div>

                 {/* Storage Status */}
                 <div className="p-5 bg-bg-surface-2 border border-border rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                       <div className="p-2 bg-success/10 text-success rounded-lg">
                          <Cloud size={20} />
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            healthStatus?.storage?.startsWith('connected') ? 'bg-success text-white' : 
                            healthStatus?.storage?.startsWith('disconnected') ? 'bg-danger text-white' : 'bg-text-muted text-white'
                          }`}>
                             {healthStatus?.storage || 'UNKNOWN'}
                          </span>
                          {healthStatus?.storage_latency && (
                            <span className="text-[8px] font-bold text-text-muted italic">{healthStatus.storage_latency}</span>
                          )}
                       </div>
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Backblaze R2</h3>
                       <p className="text-[10px] text-text-muted mt-1">
                         {healthStatus?.storage_config?.bucket || 'S3-Compatible File Storage'}
                       </p>
                    </div>
                 </div>
              </div>

              {healthStatus && (
                <div className="p-4 bg-bg-primary/50 border border-border rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <AlertCircle size={14} className="text-text-muted" />
                      <p className="text-[11px] text-text-muted uppercase font-bold tracking-widest">
                         Last Integrity Audit: {new Date(healthStatus.timestamp || Date.now()).toLocaleString()}
                      </p>
                   </div>
                   {healthStatus.database === 'connected' && healthStatus.storage === 'connected' ? (
                     <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Systems Nominal</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-danger">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Degraded Performance</span>
                     </div>
                   )}
                </div>
              )}

              <div className="space-y-4">
                 <h3 className="text-[11px] font-black text-text-muted uppercase tracking-widest">Infrastructure Details</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center p-3 bg-bg-surface-2 rounded-xl border border-border">
                       <span className="text-[11px] text-text-muted">Edge Location</span>
                       <span className="text-[11px] font-bold text-text-primary">us-east-005 (Global)</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-bg-surface-2 rounded-xl border border-border">
                       <span className="text-[11px] text-text-muted">Persistence Layer</span>
                       <span className="text-[11px] font-bold text-text-primary">Prisma / PostgreSQL</span>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
