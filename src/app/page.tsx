"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase } from '@/lib/supabase';

const subjectOptions: Record<string, string[]> = {
  "PAUD": ["Nilai Agama dan Budi Pekerti", "Jati Diri", "Dasar Literasi dan STEAM", "Lainnya"],
  "TK": ["Nilai Agama dan Budi Pekerti", "Jati Diri", "Dasar Literasi dan STEAM", "Lainnya"],
  "SD": ["Pendidikan Agama dan Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Ilmu Pengetahuan Alam dan Sosial (IPAS)", "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", "Seni dan Budaya", "Bahasa Inggris", "Muatan Lokal", "Lainnya"],
  "SMP": ["Pendidikan Agama dan Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Ilmu Pengetahuan Alam (IPA)", "Ilmu Pengetahuan Sosial (IPS)", "Bahasa Inggris", "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", "Informatika", "Seni dan Budaya", "Prakarya", "Muatan Lokal", "Lainnya"],
  "SMA": ["Pendidikan Agama dan Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Bahasa Inggris", "Biologi", "Fisika", "Kimia", "Geografi", "Sejarah", "Sosiologi", "Ekonomi", "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", "Informatika", "Seni dan Budaya", "Prakarya dan Kewirausahaan", "Muatan Lokal", "Lainnya"]
};

const getGradeOptions = (level: string, phase: string): string[] => {
  if (!phase) return [];
  if (level === 'PAUD') return ['PAUD'];
  if (level === 'TK') return ['TK A', 'TK B'];
  if (phase.includes('A') || phase.includes('1-2')) return ['1', '2'];
  if (phase.includes('B') || phase.includes('3-4')) return ['3', '4'];
  if (phase.includes('C') || phase.includes('5-6')) return ['5', '6'];
  if (phase.includes('D') || phase.includes('7-9')) return ['7', '8', '9'];
  if (phase.includes('E') || phase.includes('10')) return ['10'];
  if (phase.includes('F') || phase.includes('11-12')) return ['11', '12'];
  return [];
};

const phaseOptions: Record<string, string[]> = {
  "PAUD": ["Fondasi"],
  "TK": ["Fondasi"],
  "SD": ["A (Kelas 1-2)", "B (Kelas 3-4)", "C (Kelas 5-6)"],
  "SMP": ["D (Kelas 7-9)"],
  "SMA": ["E (Kelas 10)", "F (Kelas 11-12)"]
};


export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  
  const [formData, setFormData] = useState({
    teacherName: '',
    institution: '',
    curriculum: 'Kurikulum Merdeka',
    level: 'SD',
    phase: 'B (Kelas 3-4)',
    grade: '4',
    studentCount: '28',
    subject: 'Matematika',
    customSubject: '',
    topic: '',
    studentProfile: '',
    meetings: '1',
    duration: '35',
    durationUnit: 'Menit',
    learningModel: 'Problem-Based Learning (PBL)',
    dimensions: [] as string[],
    contextualProblem: '',
    learningObjectives: '',
    studentInterests: '',
    facilities: [] as string[],
    isP5: false,
    isDigital: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [customApiKey, setCustomApiKey] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [guestCredits, setGuestCredits] = useState<number>(3);
  const [sigSettings, setSigSettings] = useState({
    principalName: '',
    principalNip: '',
    teacherNip: '',
    placeName: ''
  });

  const [toast, setToast] = useState<{message: string, visible: boolean, type: 'success' | 'error' | 'info'}>({ message: '', visible: false, type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, visible: true, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  useEffect(() => {
    // Auth Listener
    const fetchCredits = async (userSession: any) => {
      if (!userSession) return;
      const { data, error } = await supabase.rpc('get_my_credit');
      if (!error && data !== null) {
        setCredits(data as number);
      } else {
        setCredits(3); // Default if RPC fails or not setup yet
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) fetchCredits(session.user);
      
      // Auto-fill teacher name if logging in and field is empty
      if (session?.user && event === 'SIGNED_IN') {
        setFormData(prev => ({
          ...prev,
          teacherName: prev.teacherName || session.user.user_metadata?.full_name || '',
        }));
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) fetchCredits(session.user);
      if (session?.user?.user_metadata) {
        setSigSettings(prev => ({
          principalName: session.user.user_metadata.principalName || prev.principalName,
          principalNip: session.user.user_metadata.principalNip || prev.principalNip,
          teacherNip: session.user.user_metadata.teacherNip || prev.teacherNip,
          placeName: session.user.user_metadata.placeName || prev.placeName
        }));
      } else {
        const savedSig = localStorage.getItem('sigSettings');
        if (savedSig) setSigSettings(JSON.parse(savedSig));
      }
    });

    const savedData = localStorage.getItem('rppFormData');
    const savedResult = localStorage.getItem('rppResult');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved data');
      }
    }
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        if (parsed) setResult(parsed);
      } catch (e) {
        setResult(savedResult);
      }
    }
    
    // Fallback load for sigSettings if not handled by session check
    const savedSig = localStorage.getItem('sigSettings');
    if (savedSig && !user) setSigSettings(JSON.parse(savedSig));
    
    const savedApiKey = localStorage.getItem('customApiKey');
    if (savedApiKey) setCustomApiKey(savedApiKey);

    const savedGuestCredits = localStorage.getItem('guestCredits');
    if (savedGuestCredits !== null) {
      setGuestCredits(parseInt(savedGuestCredits));
    }

    setIsLoaded(true);
  }, []);

  const saveSettings = async () => {
    if (user) {
      await supabase.auth.updateUser({ data: sigSettings });
    }
    localStorage.setItem('sigSettings', JSON.stringify(sigSettings));
    localStorage.setItem('customApiKey', customApiKey);
    setShowSettings(false);
    showToast('Pengaturan berhasil disimpan!', 'success');
  };

  const exportToDocx = async () => {
    if (!result) return;
    
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: result,
          subject: formData.subject,
          phase: formData.phase.split(' ')[0],
          placeName: sigSettings.placeName,
          principalName: sigSettings.principalName,
          principalNip: sigSettings.principalNip,
          teacherName: user?.user_metadata?.full_name || formData.teacherName,
          teacherNip: sigSettings.teacherNip,
          dateString: new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Modul_Ajar_${(formData.subject || 'RPP').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      showToast('Gagal mengunduh file Word.', 'error');
    }
  };

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('rppFormData', JSON.stringify(formData));
    }
  }, [formData, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('rppResult', JSON.stringify(result));
    }
  }, [result, isLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      if (['isP5', 'isDigital'].includes(name)) {
        setFormData(prev => ({ ...prev, [name]: checked }));
      } else if (name === 'dimensions' || name === 'facilities') {
        setFormData(prev => {
          const list = prev[name as 'dimensions' | 'facilities'] as string[];
          if (checked) return { ...prev, [name]: [...list, value] };
          return { ...prev, [name]: list.filter(d => d !== value) };
        });
      }
    } else {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        if (name === 'level') {
          const newSubjects = subjectOptions[value as string] || [];
          newData.subject = newSubjects.length > 0 ? newSubjects[0] : '';
          const newPhases = phaseOptions[value as string] || [];
          const newPhase = newPhases.length > 0 ? newPhases[0] : '';
          newData.phase = newPhase;
          const newGrades = getGradeOptions(value as string, newPhase);
          newData.grade = newGrades.length > 0 ? newGrades[0] : '';
        } else if (name === 'phase') {
          const newGrades = getGradeOptions(newData.level, value as string);
          newData.grade = newGrades.length > 0 ? newGrades[0] : '';
        }
        return newData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      if (guestCredits <= 0) {
        setShowAuthModal(true);
        return;
      }
    }

    setLoading(true);
    setResult('');
    
    try {
      const payload = {
        ...formData,
        subject: formData.subject === 'Lainnya' ? formData.customSubject : formData.subject,
        dimensions: formData.dimensions.length > 0 ? formData.dimensions.join(', ') : '-',
        facilities: formData.facilities.length > 0 ? formData.facilities.join(', ') : '-',
      };

      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...payload, customApiKey }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan modul.');
      }
      
      setResult(data.result);
      if (!customApiKey) {
        if (user) {
          // Decrement local credit state if using free tier
          setCredits(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
        } else {
          const newGuestCredits = guestCredits > 0 ? guestCredits - 1 : 0;
          setGuestCredits(newGuestCredits);
          localStorage.setItem('guestCredits', newGuestCredits.toString());
        }
      }
      
      // Save to Supabase if logged in
      if (user) {
        const { error: dbError } = await supabase.from('rpp_history').insert({
          user_id: user.id,
          topic: payload.topic,
          grade: payload.grade,
          subject: payload.subject,
          rpp_content: data.result
        });
        if (dbError) console.error("Gagal menyimpan ke database:", dbError.message);
      }
      
      if (window.innerWidth < 1024) {
        document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error: any) {
      if (error.message.includes('Kuota gratis')) {
        setShowQuotaModal(true);
      } else {
        showToast(error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result.trim()) {
      showToast('Belum ada modul untuk disalin.', 'error');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result);
        showToast('Modul berhasil disalin!', 'success');
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = result;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Modul berhasil disalin!', 'success');
    } catch (error) {
      console.error('Gagal menyalin teks:', error);
      showToast('Gagal menyalin modul. Silakan coba lagi.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 print:bg-white print:p-0">
      <header className="mb-8 max-w-7xl mx-auto print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            Guru Pintar AI <span className="text-sm font-normal text-slate-500">by Susetiadi</span>
          </h1>
          <p className="text-slate-600">Aplikasi untuk Pembuatan RPP & Modul Ajar Otomatis (Didukung oleh Google Gemini AI)</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          {user ? (
            <>
              <img src={user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + user.email} alt="Avatar" className="w-10 h-10 rounded-full bg-slate-100" />
              <div className="text-sm">
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  {user.user_metadata?.full_name || user.email.split('@')[0]}
                  {customApiKey ? (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Mode API Pribadi</span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${credits && credits > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {credits !== null ? `${credits} Kuota Gratis` : '...'}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <a href="/dashboard" className="text-xs text-blue-600 font-semibold hover:underline">Dasbor</a>
                  <span className="text-slate-300">•</span>
                  <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="text-xs text-red-500 hover:underline">Logout</button>
                </div>
              </div>
            </>
          ) : (
            guestCredits > 0 ? (
              <span className="text-sm px-4 py-2.5 rounded-xl border bg-blue-50 text-blue-700 border-blue-200 font-bold flex items-center shadow-sm">
                🎁 {guestCredits} Kuota Gratis
              </span>
            ) : (
              <Link href="/login" className="px-5 py-2.5 bg-[#1c5dfd] hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 text-sm">
                Masuk / Daftar
              </Link>
            )
          )}
        </div>
      </header>

      {/* Form Visibility Toggle */}
      <div className="max-w-7xl mx-auto mb-6 flex print:hidden">
        <button 
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all shadow-md active:scale-95"
        >
          {isFormVisible ? (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg> Sembunyikan Formulir</>
          ) : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg> Tampilkan Formulir (Informasi Umum, dll)</>
          )}
        </button>
      </div>

      <div className={`max-w-7xl mx-auto grid grid-cols-1 gap-8 print:block print:w-full transition-all duration-300 ${isFormVisible ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        
        {/* Left Column: Form */}
        <main className={`space-y-6 print:hidden ${isFormVisible ? 'block' : 'hidden'}`}>
          <form id="rppForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Informasi Umum */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                1. Informasi Umum
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Guru</label>
                    <input type="text" name="teacherName" required value={formData.teacherName} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Budi Santoso, S.Pd." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Institusi</label>
                    <input type="text" name="institution" required value={formData.institution} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: SD Negeri 1 Jakarta" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Kurikulum</label>
                    <select name="curriculum" value={formData.curriculum} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                      <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                      <option value="Kurikulum 2013 (K-13)">Kurikulum 2013 (K-13)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jenjang</label>
                    <select name="level" value={formData.level} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                      <option value="PAUD">PAUD</option>
                      <option value="TK">TK</option>
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Fase</label>
                    <select name="phase" value={formData.phase} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                      {(phaseOptions[formData.level] || []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Kelas</label>
                      <select name="grade" value={formData.grade} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                        {getGradeOptions(formData.level, formData.phase).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Jml Siswa</label>
                      <input type="number" name="studentCount" value={formData.studentCount || ''} onChange={handleInputChange} min="1" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: 28" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                    <select name="subject" value={formData.subject} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                      {(subjectOptions[formData.level] || []).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    {formData.subject === 'Lainnya' && (
                      <input type="text" name="customSubject" required value={formData.customSubject} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mt-2" placeholder="Masukkan mata pelajaran spesifik..." />
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Tujuan & Materi Pembelajaran */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                2. Tujuan & Materi Pembelajaran
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Materi Pokok</label>
                  <input type="text" name="topic" required value={formData.topic} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Pecahan Senilai" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-slate-700">Capaian Pembelajaran / Tujuan Spesifik (Opsional)</label>
                    <a href="https://guru.kemendikdasmen.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/?utm_source=rumah-pendidikan&utm_medium=menu_layanan" target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-full transition-colors flex items-center gap-1">Lihat CP <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" /><path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" /></svg></a>
                  </div>
                  <textarea name="learningObjectives" rows={2} value={formData.learningObjectives} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Peserta didik mampu mengidentifikasi pecahan senilai..."></textarea>
                </div>
              </div>
            </section>

            {/* 3. Konteks Siswa (Deep Learning) */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                3. Profil & Konteks Siswa
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ringkasan Profil Siswa (Opsional)</label>
                  <textarea name="studentProfile" rows={2} value={formData.studentProfile} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Mayoritas siswa adalah pembelajar kinestetik dan visual."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Minat Dominan Siswa (Opsional)</label>
                  <input type="text" name="studentInterests" value={formData.studentInterests} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Game, Sepak Bola, Seni Musik..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Konteks / Isu Dunia Nyata Lokal (Opsional)</label>
                  <textarea name="contextualProblem" rows={2} value={formData.contextualProblem} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Banyak sampah berserakan di lapangan sekolah."></textarea>
                </div>
              </div>
            </section>

            {/* 4. Skenario & Logistik */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                4. Skenario & Logistik
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Model Pembelajaran</label>
                  <select name="learningModel" value={formData.learningModel} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                    <option value="Project-Based Learning (PjBL)">Project-Based Learning (PjBL)</option>
                    <option value="Problem-Based Learning (PBL)">Problem-Based Learning (PBL)</option>
                    <option value="Inquiry/Discovery Learning">Inquiry/Discovery Learning</option>
                    <option value="Kooperatif/Kolaboratif (Cooperative Learning)">Kooperatif/Kolaboratif (Cooperative Learning)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jml Pertemuan</label>
                    <input type="number" name="meetings" min="1" value={formData.meetings} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Durasi per Pertemuan</label>
                    <div className="flex gap-2">
                      <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} className="w-20 p-2 border border-slate-300 rounded-lg" />
                      <select name="durationUnit" value={formData.durationUnit} onChange={handleInputChange} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white">
                        <option value="JP">JP</option>
                        <option value="Menit">Menit</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Ketersediaan Fasilitas / Lingkungan</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['Proyektor / Smart TV', 'Akses Internet Siswa', 'Perpustakaan', 'Lingkungan Luar Kelas', 'Alat Peraga Fisik'].map(fac => (
                      <label key={fac} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" name="facilities" value={fac} checked={formData.facilities.includes(fac)} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded" />
                        {fac}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Opsi Tambahan</label>
                  <div className="flex flex-col gap-2">
                    <label 
                      onClick={(e) => { if (!user) { e.preventDefault(); setShowAuthModal(true); } }}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${user ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" name="isP5" checked={formData.isP5} onChange={handleInputChange} disabled={!user} className="w-5 h-5" />
                        Integrasi P5 (Profil Pelajar Pancasila)
                      </div>
                      {!user && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">🔒 Login</span>}
                    </label>
                    <label 
                      onClick={(e) => { if (!user) { e.preventDefault(); setShowAuthModal(true); } }}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${user ? 'bg-green-50 text-green-800 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" name="isDigital" checked={formData.isDigital} onChange={handleInputChange} disabled={!user} className="w-5 h-5" />
                        Penggunaan Alat Digital Khusus
                      </div>
                      {!user && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">🔒 Login</span>}
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                    {loading ? (
                      <span className="animate-pulse">Menghasilkan Modul Ajar (AI Sedang Berpikir)...</span>
                    ) : (
                      <>✨ GENERATE RPP (MAGIC TRICK)</>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </form>
        </main>

        {/* Right Column: Preview */}
        <aside id="preview-section" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-8 print:static print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:block">
          <div className="flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              Preview Modul Ajar
            </h2>
            {result && (
              <div className="flex gap-2 flex-wrap">
                {user && (
                  <button onClick={() => setShowSettings(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all duration-200 active:scale-95 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Pengaturan
                  </button>
                )}
                <button onClick={() => user ? exportToDocx() : setShowAuthModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 text-sm flex items-center gap-2 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  Download Word {!user && "🔒"}
                </button>
                <button onClick={() => user ? window.print() : setShowAuthModal(true)} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg transition-all duration-200 active:scale-95 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v3.398c0 .596.482 1.079 1.079 1.079h8.342c.597 0 1.079-.483 1.079-1.079V8.261z" /></svg>
                  Print Modul {!user && "🔒"}
                </button>
                <button onClick={() => user ? copyToClipboard() : setShowAuthModal(true)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg transition-all duration-200 active:scale-95 text-sm">
                  Copy Text {!user && "🔒"}
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-125 max-h-200 overflow-y-auto prose prose-slate max-w-none print:bg-white print:border-none print:p-0 print:max-h-none print:overflow-visible print:m-0">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 pt-20">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p>AI sedang meracik Modul Ajar Anda...</p>
              </div>
            ) : result ? (
              <>
                {/* Judul Modul Ajar (Kop) */}
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-bold uppercase tracking-wider text-black">MODUL AJAR {formData.subject}</h1>
                  <p className="text-lg mt-1 font-semibold text-slate-800">Fase {formData.phase.split(' ')[0]}</p>
                </div>

                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>{result}</ReactMarkdown>
                
                {/* Kolom Tanda Tangan */}
                <div className="mt-16 flex justify-between px-2 sm:px-8 text-black" style={{ breakInside: 'avoid' }}>
                  <div className="text-center">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <br/><br/><br/><br/>
                    <p className="font-bold border-b border-black inline-block min-w-50 pb-1">{sigSettings.principalName || "(............................................)"}</p>
                    <p className="mt-1">NIP. {sigSettings.principalNip || "........................................"}</p>
                  </div>
                  <div className="text-center">
                    <p suppressHydrationWarning>{sigSettings.placeName || "................."}, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    <p>Guru Mata Pelajaran</p>
                    <br/><br/><br/><br/>
                    <p className="font-bold border-b border-black inline-block min-w-50 pb-1">{user?.user_metadata?.full_name || formData.teacherName || "(............................................)"}</p>
                    <p className="mt-1">NIP. {sigSettings.teacherNip || "........................................"}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-center pt-20">
                Silakan isi formulir di sebelah kiri, lalu klik tombol 'GENERATE RPP' untuk melihat keajaibannya di sini.
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Auth Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setShowAuthModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative transform transition-all duration-300 scale-100 opacity-100 animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full p-4 border-4 border-white shadow-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <div className="text-center mt-6 mb-8">
              <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Akses Premium</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Silakan <b className="text-indigo-600">login atau daftar</b> (gratis) untuk membuka kunci fitur download Word, integrasi P5, dan fitur lanjutan lainnya!
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-sm mb-1">Mendaftar dengan Lisensi</h3>
                  <p className="text-amber-800/80 text-xs font-medium leading-relaxed">
                    Anda memerlukan <b>Kode Lisensi</b> yang valid dari Administrator untuk dapat membuat akun dan menggunakan aplikasi ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all duration-200 text-sm"
              >
                Nanti Saja
              </button>
              <Link 
                href="/login"
                className="flex-1 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 text-sm flex items-center justify-center gap-2"
              >
                Login / Daftar Sekarang
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quota Exceeded Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQuotaModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative transform transition-all duration-300 scale-100 opacity-100 animate-in fade-in zoom-in-95">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 rounded-full p-4 border-4 border-white shadow-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="text-center mt-6 mb-8">
              <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Oups! Kuota Habis</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Anda telah mencapai batas maksimal pembuatan modul ajar gratis. Tapi jangan khawatir, Anda tetap bisa membuat modul ajar <b className="text-slate-700">tanpa batas</b> selamanya!
              </p>
            </div>

            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-sm mb-1">Solusi Mudah: Gunakan API Key</h3>
                  <p className="text-blue-700/80 text-xs font-medium leading-relaxed">
                    Cukup masukkan Google Gemini API Key milik Anda sendiri di menu pengaturan. Gratis dan langsung bisa dipakai!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowQuotaModal(false)} 
                className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all duration-200 text-sm"
              >
                Nanti Saja
              </button>
              {user ? (
                <button 
                  onClick={() => {
                    setShowQuotaModal(false);
                    setShowSettings(true);
                  }} 
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 text-sm"
                >
                  Buka Pengaturan API
                </button>
              ) : (
                <Link 
                  href="/login"
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 text-sm flex items-center justify-center"
                >
                  Masuk / Daftar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature & API Key Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Pengaturan Aplikasi</h2>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="font-bold text-blue-800 mb-2 text-sm">Mode Unlimited (Gratis Selamanya)</h3>
              <p className="text-xs text-blue-700 mb-3">Masukkan API Key Google Gemini Anda sendiri untuk membuat RPP tanpa batas kuota. Aman & tersimpan hanya di browser Anda.</p>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Google Gemini API Key</label>
              <input type="password" value={customApiKey} onChange={e => setCustomApiKey(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="AIzaSy..." />
              <div className="mt-2 text-right">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Dapatkan API Key di sini &rarr;</a>
              </div>
            </div>

            <h3 className="font-bold text-slate-800 mb-3 border-t pt-4">Tanda Tangan Dokumen</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kota / Tempat</label>
                <input type="text" value={sigSettings.placeName} onChange={e => setSigSettings({...sigSettings, placeName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Misal: Jakarta, Surabaya" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                <input type="text" value={sigSettings.principalName} onChange={e => setSigSettings({...sigSettings, principalName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Misal: Drs. Budi Santoso, M.Pd" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input type="text" value={sigSettings.principalNip} onChange={e => setSigSettings({...sigSettings, principalNip: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Misal: 19700101 199512 1 001" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">NIP Anda (Guru)</label>
                <input type="text" value={sigSettings.teacherNip} onChange={e => setSigSettings({...sigSettings, teacherNip: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Misal: 19850202 201001 2 003" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Batal</button>
              <button onClick={saveSettings} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Simpan Pengaturan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-100 transition-all duration-300 transform ${toast.visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
        <div className={`px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-medium border backdrop-blur-xl ${
          toast.type === 'error' 
            ? 'bg-red-500/90 border-red-400 text-white shadow-red-500/20' 
            : 'bg-slate-900/95 border-slate-700 text-white shadow-slate-900/30'
        }`}>
          {toast.type === 'success' && (
            <div className="bg-emerald-500/20 p-1.5 rounded-full">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {toast.type === 'error' && (
            <div className="bg-white/20 p-1.5 rounded-full">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          <span className="text-sm tracking-wide">{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
