'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register State
  const [regRole, setRegRole] = useState('Guru');
  const [regName, setRegName] = useState('');
  const [regNip, setRegNip] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLicense, setRegLicense] = useState('');
  
  const [schoolName, setSchoolName] = useState('');
  const [validLicenseId, setValidLicenseId] = useState<string | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Toggle password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  // Handle License Validation
  useEffect(() => {
    if (regLicense.length < 5) {
      setSchoolName('');
      setValidLicenseId(null);
      setErrorMsg('');
      return;
    }

    const checkLicense = async () => {
      setIsCheckingLicense(true);
      setErrorMsg('');
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('id, school_id, is_active, expires_at, user_id, schools(name)')
          .eq('code', regLicense)
          .single();

        if (error || !data) {
          throw new Error('Kode lisensi tidak ditemukan');
        }
        const licenseData = data as any;
        if (!licenseData.is_active || new Date(licenseData.expires_at) < new Date()) {
          throw new Error('Kode lisensi sudah tidak aktif atau kedaluwarsa');
        }
        if (licenseData.user_id) {
          throw new Error('Kode lisensi sudah digunakan oleh pengguna lain');
        }

        // Valid!
        setValidLicenseId(licenseData.id);
        // @ts-ignore
        setSchoolName(licenseData.schools?.name || 'Sekolah Terdaftar');
      } catch (err: any) {
        setSchoolName('');
        setValidLicenseId(null);
        setErrorMsg(err.message || 'Lisensi tidak valid');
      } finally {
        setIsCheckingLicense(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      checkLicense();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [regLicense]);

  // Hapus pesan otomatis setelah 4 detik
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setSuccessMsg('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;
      
      // Check if user is superadmin
      if (data.user) {
        // Fallback hardcode for the main superadmin email
        if (data.user.email === 'susetiadi6@gmail.com') {
          window.location.href = '/superadmin';
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        const userProfile = profile as any;
        if (userProfile?.role === 'superadmin') {
          window.location.href = '/superadmin';
          return;
        }
      }

      router.push('/');
    } catch (err: any) {
      let msg = err.message || 'Login gagal. Periksa email dan password Anda.';
      if (msg.toLowerCase().includes('invalid login credentials')) msg = 'Email atau password salah.';
      if (msg.toLowerCase().includes('rate limit')) msg = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat lagi.';
      setErrorMsg(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validLicenseId) {
      setErrorMsg('Anda harus memasukkan Kode Lisensi yang valid terlebih dahulu.');
      return;
    }
    
    setIsRegistering(true);
    setErrorMsg('');
    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            full_name: regName,
            nip: regNip,
            role_title: regRole,
          }
        }
      });

      if (authError) throw authError;

      // Check if user is created
      if (!authData.user) {
        throw new Error('Pendaftaran gagal. Silakan coba lagi.');
      }

      // 2. Claim the license (Update user_id in licenses table)
      // Because we just registered, the user is automatically signed in (if email confirmation is off)
      // So they have their auth.uid() now.
      const { error: claimError } = await supabase
        .from('licenses')
        .update({ user_id: authData.user.id })
        .eq('id', validLicenseId);

      if (claimError) {
        console.error("Failed to claim license:", claimError);
        // We shouldn't block login if they registered successfully, but we should note it.
      }

      setSuccessMsg('Pendaftaran berhasil! Mengalihkan...');
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (err: any) {
      let msg = err.message || 'Pendaftaran gagal. Email mungkin sudah terdaftar.';
      if (msg.toLowerCase().includes('rate limit')) msg = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat lagi.';
      if (msg.toLowerCase().includes('already registered')) msg = 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.';
      setErrorMsg(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      
      {/* Popup Messages */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
        {errorMsg && (
          <div className="p-4 bg-red-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-red-500/20 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-lg">⚠️</span> {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="p-4 bg-green-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-green-500/20 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-lg">✅</span> {successMsg}
          </div>
        )}
      </div>

      {/* Container */}
      <div className="bg-white max-w-md w-full rounded-[2rem] shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100">
        
        <div className="mb-8 flex items-center justify-center gap-4">
          <img src="https://iili.io/CNIcxkl.png" alt="Logo Apmo-AI" className="h-14 md:h-16 object-contain" />
          <div className="text-left flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-1 tracking-tight leading-none">APMO-AI</h1>
            <p className="text-xs md:text-sm font-medium text-slate-500">Aplikasi Pembuat Modul Berbasis AI</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50 p-1.5 flex rounded-2xl mb-8 border border-slate-100">
          <button 
            onClick={() => {setActiveTab('login'); setErrorMsg('');}}
            className={`flex-1 flex justify-center items-center py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'login' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="mr-2 text-base">🔓</span> Masuk
          </button>
          <button 
            onClick={() => {setActiveTab('register'); setErrorMsg('');}}
            className={`flex-1 flex justify-center items-center py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'register' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="mr-2 text-base">📝</span> Daftar Baru
          </button>
        </div>

        {/* Tab Login */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">EMAIL</label>
              <input 
                type="email" 
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Masukkan alamat email Anda"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">PASSWORD</label>
              <div className="relative">
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showLoginPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-start">
              <a href="#" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Lupa Password?</a>
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#1c5dfd] hover:bg-blue-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 mt-4"
            >
              {isLoggingIn ? 'Memproses...' : 'Masuk ke Sistem'}
            </button>
          </form>
        )}

        {/* Tab Register */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-5">


            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">NAMA LENGKAP</label>
              <input 
                type="text" 
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Pd"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">NIP</label>
              <input 
                type="text" 
                value={regNip}
                onChange={(e) => setRegNip(e.target.value)}
                placeholder="Masukkan NIP Anda"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">EMAIL AKTIF</label>
              <input 
                type="email" 
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Alamat email aktif (untuk reset & notifikasi)"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* License Box */}
            <div className="bg-[#fffdf0] border border-yellow-200 rounded-2xl p-5 mt-2">
              <label className="block text-xs font-black text-amber-800 tracking-wider mb-2 flex items-center">
                <span className="mr-2">🔑</span> KODE LISENSI <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={regLicense}
                  onChange={(e) => setRegLicense(e.target.value.toUpperCase().trim())}
                  placeholder="Contoh: ANASOL-SMP1-2025"
                  className="w-full border border-yellow-300 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono placeholder:font-sans placeholder:text-amber-300 bg-white"
                />
                {isCheckingLicense && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {validLicenseId ? (
                <p className="text-xs text-green-600 mt-3 font-bold flex items-center gap-1">
                  <span>✅</span> Data Kode Lisensi Valid
                </p>
              ) : (
                <p className="text-xs text-amber-700/70 mt-3 font-medium">Kode lisensi diberikan oleh Administrator AnasolApp.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">NAMA SEKOLAH</label>
              <input 
                type="text" 
                disabled
                value={schoolName}
                placeholder="Terisi otomatis setelah kode lisensi valid"
                className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-2xl px-4 py-3.5 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 tracking-wider mb-2">PASSWORD</label>
              <div className="relative">
                <input 
                  type={showRegPassword ? "text" : "password"} 
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showRegPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isRegistering || !validLicenseId}
              className={`w-full font-bold text-base py-4 rounded-2xl shadow-lg transition-all mt-4 ${
                !validLicenseId 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                : 'bg-[#1c5dfd] hover:bg-blue-700 text-white shadow-blue-500/30'
              }`}
            >
              {isRegistering ? 'Mendaftarkan...' : 'Buat Akun'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        © 2026 Apmo-AI · Analisis Pembuat Modul berbasis AI: By Susetiadi-Pengawas DS
      </div>
    </div>
  );
}
