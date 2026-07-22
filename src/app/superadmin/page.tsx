'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SuperadminDashboard() {
  const [activeTab, setActiveTab] = useState('sekolah');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [schools, setSchools] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Form States
  const [newSchool, setNewSchool] = useState({ name: '', address: '', education_level: '', principal_name: '', principal_nip: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLicense, setNewLicense] = useState({ code: '', description: '', school_id: '' });
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false);
  const [newTrial, setNewTrial] = useState({ school_id: '', duration_days: '7' });
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);

  // Modal States
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{type: 'school' | 'license' | 'user', id: string, name: string} | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: schoolsData } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
      if (schoolsData) setSchools(schoolsData);

      const { data: licensesData } = await supabase.from('licenses').select('*');
      if (licensesData) setLicenses(licensesData);

      const { data: usersData } = await supabase.from('user_profiles').select('*');
      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('schools').insert([newSchool]);
      if (error) throw error;
      setNewSchool({ name: '', address: '', education_level: '', principal_name: '', principal_nip: '' });
      fetchDashboardData(); // refresh
    } catch (error: any) {
      alert("Gagal menambah sekolah: " + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRandomLicense = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ANABUS-';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewLicense(prev => ({ ...prev, code }));
  };

  const handleAddLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLicense(true);
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const { error } = await supabase.from('licenses').insert([{
        code: newLicense.code,
        description: newLicense.description,
        school_id: newLicense.school_id || null,
        expires_at: expiresAt.toISOString()
      }]);
      if (error) throw error;
      setNewLicense({ code: '', description: '', school_id: '' });
      fetchDashboardData();
    } catch (error) {
      alert("Gagal membuat lisensi.");
    } finally {
      setIsSubmittingLicense(false);
    }
  };

  const handleActivateTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrial.school_id) return alert("Pilih sekolah terlebih dahulu");
    setIsSubmittingTrial(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(newTrial.duration_days));
      
      const { error } = await supabase.from('schools').update({
        subscription_tier: 'TRIAL',
        trial_expires_at: expiresAt.toISOString()
      }).eq('id', newTrial.school_id);
      
      if (error) throw error;
      setNewTrial({ school_id: '', duration_days: '7' });
      fetchDashboardData();
    } catch (error) {
      alert("Gagal mengaktifkan trial.");
    } finally {
      setIsSubmittingTrial(false);
    }
  };

  // Edit Handlers
  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, created_at, ...data } = editingSchool;
      const { error } = await supabase.from('schools').update(data).eq('id', id);
      if (error) throw error;
      setEditingSchool(null);
      fetchDashboardData();
    } catch (error: any) {
      alert("Gagal update sekolah: " + (error.message || JSON.stringify(error)));
    }
  };

  const handleUpdateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, created_at, ...data } = editingLicense;
      const { error } = await supabase.from('licenses').update(data).eq('id', id);
      if (error) throw error;
      setEditingLicense(null);
      fetchDashboardData();
    } catch (error: any) {
      alert("Gagal update lisensi: " + (error.message || JSON.stringify(error)));
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, created_at, ...data } = editingUser;
      const { error } = await supabase.from('user_profiles').update({
        full_name: data.full_name,
        role: data.role,
        role_title: data.role_title,
        nip: data.nip
      }).eq('id', id);
      if (error) throw error;
      setEditingUser(null);
      fetchDashboardData();
    } catch (error: any) {
      alert("Gagal update pengguna: " + (error.message || JSON.stringify(error)));
    }
  };

  // Delete Handler
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      let error = null;
      if (itemToDelete.type === 'school') {
        const res = await supabase.from('schools').delete().eq('id', itemToDelete.id);
        error = res.error;
      } else if (itemToDelete.type === 'license') {
        const res = await supabase.from('licenses').delete().eq('id', itemToDelete.id);
        error = res.error;
      } else if (itemToDelete.type === 'user') {
        const res = await supabase.from('user_profiles').delete().eq('id', itemToDelete.id);
        error = res.error;
      }
      
      if (error) throw error;
      setItemToDelete(null);
      fetchDashboardData();
    } catch (err: any) {
      alert("Gagal menghapus: " + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Superadmin Dashboard</h1>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Buka Aplikasi &rarr;
            </a>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }} 
              className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Keluar
            </button>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-600">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
            </div>
            <h2 className="text-5xl font-black text-blue-600 mb-2">{schools.length}</h2>
            <h3 className="text-slate-500 font-bold tracking-widest text-sm uppercase mb-4">Total Sekolah</h3>
            <div className="flex items-center text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
              {schools.length} Status Aktif
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-purple-600">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
            </div>
            <h2 className="text-5xl font-black text-purple-600 mb-2">{licenses.length}</h2>
            <h3 className="text-slate-500 font-bold tracking-widest text-sm uppercase mb-4">Total Lisensi</h3>
            <div className="flex items-center text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
              {licenses.filter(l => l.is_active).length} Status Aktif
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-600">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <h2 className="text-5xl font-black text-emerald-600 mb-2">{users.length}</h2>
            <h3 className="text-slate-500 font-bold tracking-widest text-sm uppercase mb-4">Total Pengguna</h3>
            <div className="flex items-center text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
              {users.filter(u => u.role !== 'superadmin').length} Akun Guru
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white inline-flex p-1.5 rounded-2xl shadow-sm border border-slate-100 mb-8 overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('sekolah')} className={`flex items-center px-6 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'sekolah' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" /></svg>
            Sekolah
            <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${activeTab === 'sekolah' ? 'bg-white/20' : 'bg-slate-100'}`}>{schools.length}</span>
          </button>
          
          <button onClick={() => setActiveTab('lisensi')} className={`flex items-center px-6 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'lisensi' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Lisensi
            <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${activeTab === 'lisensi' ? 'bg-white/20' : 'bg-slate-100'}`}>{licenses.length}</span>
          </button>
          
          <button onClick={() => setActiveTab('pengguna')} className={`flex items-center px-6 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'pengguna' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Pengguna
            <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${activeTab === 'pengguna' ? 'bg-white/20' : 'bg-slate-100'}`}>{users.length}</span>
          </button>
          
          <button onClick={() => setActiveTab('trial')} className={`flex items-center px-6 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'trial' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Trial & Subscription
            <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${activeTab === 'trial' ? 'bg-white/20' : 'bg-slate-100'}`}>{schools.filter(s => s.subscription_tier && s.subscription_tier !== 'FREE').length}</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-8">
              
              {activeTab === 'sekolah' && (
                <>
                  <h3 className="flex items-center text-xl font-black text-slate-800 mb-6">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Tambah Sekolah
                  </h3>
                  <form onSubmit={handleAddSchool} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">NAMA SEKOLAH *</label>
                      <input 
                        type="text" 
                        required
                        value={newSchool.name}
                        onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                        placeholder="Contoh: SMA Negeri 1 Jakarta" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">JENJANG PENDIDIKAN *</label>
                      <select 
                        required
                        value={newSchool.education_level}
                        onChange={(e) => setNewSchool({...newSchool, education_level: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">-- Pilih Jenjang --</option>
                        <option value="PAUD">PAUD / TK</option>
                        <option value="SD">SD / MI</option>
                        <option value="SMP">SMP / MTs</option>
                        <option value="SMA">SMA / MA</option>
                        <option value="SMK">SMK / MAK</option>
                        <option value="SLB">SLB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">NAMA KEPALA SEKOLAH</label>
                      <input 
                        type="text" 
                        value={newSchool.principal_name}
                        onChange={(e) => setNewSchool({...newSchool, principal_name: e.target.value})}
                        placeholder="Contoh: Budi Santoso, M.Pd" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">NIP KEPALA SEKOLAH</label>
                      <input 
                        type="text" 
                        value={newSchool.principal_nip}
                        onChange={(e) => setNewSchool({...newSchool, principal_nip: e.target.value})}
                        placeholder="Contoh: 19800101 200501 1 001" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">ALAMAT</label>
                      <textarea 
                        value={newSchool.address}
                        onChange={(e) => setNewSchool({...newSchool, address: e.target.value})}
                        placeholder="Jl. Merdeka No. 1" 
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      ></textarea>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm flex justify-center items-center"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Simpan Sekolah'}
                    </button>
                  </form>
                </>
              )}

              {activeTab === 'lisensi' && (
                <>
                  <h3 className="flex items-center text-xl font-black text-slate-800 mb-6">
                    <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    Buat Lisensi Baru
                  </h3>
                  <form onSubmit={handleAddLicense} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 tracking-wider mb-2">KODE LISENSI *</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          required
                          value={newLicense.code}
                          onChange={(e) => setNewLicense({...newLicense, code: e.target.value})}
                          placeholder="ANABUS-XXXXXXXX" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                        <button type="button" onClick={generateRandomLicense} className="bg-slate-100 hover:bg-slate-200 p-3 rounded-xl text-slate-600 transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 tracking-wider mb-2">DESKRIPSI</label>
                      <input 
                        type="text" 
                        value={newLicense.description}
                        onChange={(e) => setNewLicense({...newLicense, description: e.target.value})}
                        placeholder="Lisensi Pengawas Wilayah A" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 tracking-wider mb-2">KAITKAN KE SEKOLAH (OPSIONAL)</label>
                      <select 
                        value={newLicense.school_id}
                        onChange={(e) => setNewLicense({...newLicense, school_id: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      >
                        <option value="">— Tidak dikaitkan —</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmittingLicense}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm flex justify-center items-center mt-4"
                    >
                      {isSubmittingLicense ? 'Menyimpan...' : 'Buat Lisensi'}
                    </button>
                  </form>
                </>
              )}

              {activeTab === 'pengguna' && (
                <>
                  <h3 className="flex items-center text-xl font-black text-slate-800 mb-6">
                    <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Info Pengguna
                  </h3>
                  <p className="text-sm text-slate-500">Pilih pengguna di panel kanan untuk melihat detail atau mengatur lisensi mereka.</p>
                </>
              )}

              {activeTab === 'trial' && (
                <>
                  <h3 className="flex items-center text-xl font-black text-slate-800 mb-6">
                    <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Aktivasi Trial
                  </h3>
                  <form onSubmit={handleActivateTrial} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 tracking-wider mb-2">PILIH SEKOLAH *</label>
                      <select 
                        required
                        value={newTrial.school_id}
                        onChange={(e) => setNewTrial({...newTrial, school_id: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      >
                        <option value="">-- Pilih Sekolah --</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 tracking-wider mb-2">DURASI TRIAL (HARI) *</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={newTrial.duration_days}
                        onChange={(e) => setNewTrial({...newTrial, duration_days: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="bg-blue-50/50 text-blue-800/80 p-4 rounded-xl text-xs flex gap-3 items-start border border-blue-100/50">
                      <span className="text-base leading-none">💡</span>
                      <p>Trial memberikan akses unlimited pengguna & fitur selama durasi yang ditentukan.</p>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmittingTrial}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm flex justify-center items-center mt-4"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      {isSubmittingTrial ? 'Memproses...' : 'Aktivasi Trial'}
                    </button>
                  </form>
                </>
              )}

            </div>
          </div>

          {/* Right Panel: Data View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[500px]">
              
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
                  <svg className="animate-spin w-8 h-8 mb-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p>Memuat data {activeTab}...</p>
                </div>
              ) : (
                <>
                  {/* Sekolah Table */}
                  {activeTab === 'sekolah' && (
                    <div className="flex flex-col gap-3">
                      {schools.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Belum ada data sekolah.</div>
                      ) : (
                        schools.map((school) => (
                          <div key={school.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                              <div className="bg-[#f0f6ff] text-[#1c5dfd] font-black w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-lg">
                                {school.education_level || 'SD'}
                              </div>
                              <div>
                                <h4 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">{school.name}</h4>
                                <div className="text-sm text-slate-500 mt-0.5 font-medium">
                                  {school.address || '-'} 
                                  {school.subscription_tier === 'FREE' ? '' : ` • ${school.subscription_tier}`}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  Kepsek: {school.principal_name || '-'} {school.principal_nip ? `(${school.principal_nip})` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className="px-3 py-1.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-full text-xs font-bold flex items-center shadow-sm">
                                ✓ Status Aktif
                              </span>
                              <button onClick={() => setEditingSchool(school)} className="w-9 h-9 flex items-center justify-center rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors shadow-sm ml-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => setItemToDelete({type: 'school', id: school.id, name: school.name})} className="w-9 h-9 flex items-center justify-center rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Lisensi Table */}
                  {activeTab === 'lisensi' && (
                    <div className="flex flex-col gap-3">
                      {licenses.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Belum ada data lisensi.</div>
                      ) : (
                        licenses.map((license) => {
                          const school = schools.find(s => s.id === license.school_id);
                          return (
                            <div key={license.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center gap-4">
                                <div className="bg-[#fffbeb] text-amber-500 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                </div>
                                <div>
                                  <h4 className="text-base sm:text-lg font-black text-[#0f172a] tracking-tight">{license.code}</h4>
                                  <div className="flex flex-wrap items-center text-sm text-slate-500 mt-0.5 gap-2 font-medium">
                                    <span>{license.description || 'Tanpa Deskripsi'}</span>
                                    {school && (
                                      <span className="px-2.5 py-0.5 bg-[#fff7ed] text-[#ea580c] rounded-md text-xs font-bold flex items-center border border-[#ffedd5]">
                                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        {school.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {license.is_active ? 
                                  <span className="px-3 py-1.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-full text-xs font-bold flex items-center shadow-sm">
                                    ✓ Aktif
                                  </span> : 
                                  <span className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-bold shadow-sm">
                                    Nonaktif
                                  </span>
                                }
                                <button onClick={() => setEditingLicense(license)} className="w-9 h-9 flex items-center justify-center rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors shadow-sm ml-1">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => setItemToDelete({type: 'license', id: license.id, name: license.code})} className="w-9 h-9 flex items-center justify-center rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Pengguna Table */}
                  {activeTab === 'pengguna' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs text-slate-400 font-bold tracking-wider">
                            <th className="pb-3 px-2">EMAIL</th>
                            <th className="pb-3 px-2">NAMA / PERAN</th>
                            <th className="pb-3 px-2 text-right">LISENSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr><td colSpan={3} className="py-8 text-center text-slate-400 text-sm">Belum ada pengguna.</td></tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="py-4 px-2 font-medium text-slate-700">{user.email}</td>
                                <td className="py-4 px-2">
                                  <div className="text-sm font-bold text-slate-800">{user.full_name || 'Tanpa Nama'}</div>
                                  <div className="text-xs text-slate-500 uppercase">{user.role}</div>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  <div className="flex justify-end items-center gap-2">
                                    <button onClick={() => setEditingUser(user)} className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors shadow-sm">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => setItemToDelete({type: 'user', id: user.id, name: user.email})} className="w-8 h-8 flex items-center justify-center rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Trial & Subscription Cards */}
                  {activeTab === 'trial' && (
                    <div className="flex flex-col gap-4">
                      {schools.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Belum ada data sekolah.</div>
                      ) : (
                        schools.map((school) => {
                          const schoolUsersCount = users.filter(u => u.school_id === school.id).length;
                          const schoolLicenses = licenses.filter(l => l.school_id === school.id);
                          const totalQuota = schoolLicenses.length > 0 ? (schoolLicenses.length * 7) : 7; // Dummy quota
                          
                          return (
                            <div key={school.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                <h4 className="text-lg font-black text-slate-800 tracking-tight">{school.name}</h4>
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                  {school.subscription_tier || 'FREE'}
                                </span>
                              </div>
                              
                              <div className="flex items-center text-xs text-slate-500 gap-1.5">
                                <span>📦</span>
                                {school.subscription_tier === 'TRIAL' ? (
                                  <span className="text-amber-600 font-medium">Masa Trial aktif hingga {new Date(school.trial_expires_at).toLocaleDateString('id-ID')}</span>
                                ) : (
                                  <span>Free Tier: Batas 6 akun guru & 10 generate modul/bulan.</span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pengguna</div>
                                  <div className="text-base font-black text-slate-800">
                                    {schoolUsersCount}<span className="text-slate-400 font-medium">/{totalQuota}</span>
                                  </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Generate Modul</div>
                                  <div className="text-base font-black text-slate-800">
                                    0<span className="text-slate-400 font-medium">/10</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end mt-2">
                                <button className="bg-[#00a87e] hover:bg-[#00926d] text-white text-sm font-bold px-4 py-2 rounded-xl flex items-center transition-colors shadow-lg shadow-[#00a87e]/20">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  Upgrade ke Premium
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* MODALS */}
      {/* Delete Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus <b>{itemToDelete.name}</b>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Edit Sekolah</h3>
              <button onClick={() => setEditingSchool(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleUpdateSchool} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Sekolah</label>
                <input type="text" value={editingSchool.name} onChange={e => setEditingSchool({...editingSchool, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jenjang</label>
                  <select value={editingSchool.education_level || ''} onChange={e => setEditingSchool({...editingSchool, education_level: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3">
                    <option value="">Pilih...</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tingkat Paket</label>
                  <select value={editingSchool.subscription_tier || 'FREE'} onChange={e => setEditingSchool({...editingSchool, subscription_tier: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3">
                    <option value="FREE">FREE</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="TRIAL">TRIAL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Kepala Sekolah</label>
                <input type="text" value={editingSchool.principal_name || ''} onChange={e => setEditingSchool({...editingSchool, principal_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">NIP Kepala Sekolah</label>
                <input type="text" value={editingSchool.principal_nip || ''} onChange={e => setEditingSchool({...editingSchool, principal_nip: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Alamat Lengkap</label>
                <textarea value={editingSchool.address || ''} onChange={e => setEditingSchool({...editingSchool, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3 min-h-[80px]"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingSchool(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit License Modal */}
      {editingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Edit Lisensi</h3>
              <button onClick={() => setEditingLicense(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleUpdateLicense} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kode Lisensi</label>
                <input type="text" value={editingLicense.code} onChange={e => setEditingLicense({...editingLicense, code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deskripsi</label>
                <input type="text" value={editingLicense.description || ''} onChange={e => setEditingLicense({...editingLicense, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Terhubung ke Sekolah</label>
                <select value={editingLicense.school_id || ''} onChange={e => setEditingLicense({...editingLicense, school_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3">
                  <option value="">Tidak Terhubung / Bebas</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="isActive" checked={editingLicense.is_active} onChange={e => setEditingLicense({...editingLicense, is_active: e.target.checked})} className="w-4 h-4 text-blue-600" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Lisensi Aktif</label>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingLicense(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Edit Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                <input type="text" value={editingUser.email} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-400 text-sm rounded-lg px-4 py-3 cursor-not-allowed" />
                <span className="text-xs text-slate-400">Email tidak dapat diubah dari dasbor ini.</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
                <input type="text" value={editingUser.full_name || ''} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Role Utama</label>
                  <select value={editingUser.role || 'user'} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3">
                    <option value="user">User (Guru)</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jabatan (Title)</label>
                  <input type="text" value={editingUser.role_title || ''} onChange={e => setEditingUser({...editingUser, role_title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
