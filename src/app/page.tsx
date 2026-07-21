"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  if (level === 'PAUD') return ['PAUD'];
  if (level === 'TK') return ['TK A', 'TK B'];
  if (phase.startsWith('A')) return ['1', '2'];
  if (phase.startsWith('B')) return ['3', '4'];
  if (phase.startsWith('C')) return ['5', '6'];
  if (phase.startsWith('D')) return ['7', '8', '9'];
  if (phase.startsWith('E')) return ['10'];
  if (phase.startsWith('F')) return ['11', '12'];
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
  const [email, setEmail] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sigSettings, setSigSettings] = useState({
    principalName: '',
    principalNip: '',
    teacherNip: '',
    placeName: ''
  });

  const handleLogin = async () => {
    if (!email) return alert('Silakan masukkan email Anda terlebih dahulu.');
    setIsSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setIsSendingLink(false);
    if (error) {
      alert(error.message);
    } else {
      alert('Tautan ajaib (Magic Link) telah dikirim ke email Anda! Silakan periksa kotak masuk atau folder spam Anda, lalu klik tautan tersebut untuk masuk.');
      setEmail('');
    }
  };

  useEffect(() => {
    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      
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
        setFormData(JSON.parse(savedData));
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
    
    setIsLoaded(true);
  }, []);

  const saveSigSettings = async () => {
    if (user) {
      await supabase.auth.updateUser({ data: sigSettings });
    }
    localStorage.setItem('sigSettings', JSON.stringify(sigSettings));
    setShowSettings(false);
    alert('Pengaturan tanda tangan berhasil disimpan!');
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
      alert('Gagal mengunduh file Word.');
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
    setLoading(true);
    setResult('');
    
    try {
      const payload = {
        ...formData,
        subject: formData.subject === 'Lainnya' ? formData.customSubject : formData.subject,
        dimensions: formData.dimensions.length > 0 ? formData.dimensions.join(', ') : '-',
        facilities: formData.facilities.length > 0 ? formData.facilities.join(', ') : '-',
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan modul.');
      }
      
      setResult(data.result);
      
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
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    alert('Modul berhasil disalin!');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 print:bg-white print:p-0">
      <header className="mb-8 max-w-7xl mx-auto print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            Guru Pintar AI <span className="text-sm font-normal text-slate-500">by Susetiadi</span>
          </h1>
          <p className="text-slate-600">SaaS Edukasi untuk Pembuatan RPP & Modul Ajar Otomatis (Didukung oleh Google Gemini AI)</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          {user ? (
            <>
              <img src={user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + user.email} alt="Avatar" className="w-10 h-10 rounded-full bg-slate-100" />
              <div className="text-sm">
                <p className="font-bold text-slate-800">{user.user_metadata?.full_name || user.email.split('@')[0]}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <a href="/dashboard" className="text-xs text-blue-600 font-semibold hover:underline">Dasbor</a>
                  <span className="text-slate-300">•</span>
                  <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-500 hover:underline">Logout</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input 
                type="email" 
                placeholder="Masukkan email Anda..." 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button 
                onClick={handleLogin}
                disabled={isSendingLink}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {isSendingLink ? 'Mengirim...' : 'Login'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:w-full">
        
        {/* Left Column: Form */}
        <main className="space-y-6 print:hidden">
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
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Kelas</label>
                    <select name="grade" value={formData.grade} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                      {getGradeOptions(formData.level, formData.phase).map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
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
                    <label className="flex items-center gap-2 p-3 bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 rounded-lg cursor-pointer">
                      <input type="checkbox" name="isP5" checked={formData.isP5} onChange={handleInputChange} className="w-5 h-5" />
                      Integrasi P5 (Profil Pelajar Pancasila)
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-green-50 text-green-800 border border-green-200 rounded-lg cursor-pointer">
                      <input type="checkbox" name="isDigital" checked={formData.isDigital} onChange={handleInputChange} className="w-5 h-5" />
                      Penggunaan Alat Digital Khusus
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
                <button onClick={() => setShowSettings(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Atur Tanda Tangan
                </button>
                <button onClick={exportToDocx} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  Download Word
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg transition-colors text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v3.398c0 .596.482 1.079 1.079 1.079h8.342c.597 0 1.079-.483 1.079-1.079V8.261z" /></svg>
                  Print Modul
                </button>
                <button onClick={copyToClipboard} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg transition-colors text-sm">
                  Copy Text
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[500px] max-h-[800px] overflow-y-auto prose prose-slate max-w-none print:bg-white print:border-none print:p-0 print:max-h-none print:overflow-visible print:m-0">
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
                    <p className="font-bold border-b border-black inline-block min-w-[200px] pb-1">{sigSettings.principalName || "(............................................)"}</p>
                    <p className="mt-1">NIP. {sigSettings.principalNip || "........................................"}</p>
                  </div>
                  <div className="text-center">
                    <p>{sigSettings.placeName || "................."}, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    <p>Guru Mata Pelajaran</p>
                    <br/><br/><br/><br/>
                    <p className="font-bold border-b border-black inline-block min-w-[200px] pb-1">{user?.user_metadata?.full_name || formData.teacherName || "(............................................)"}</p>
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

      {/* Signature Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Pengaturan Tanda Tangan</h2>
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
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Batal</button>
              <button onClick={saveSigSettings} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Simpan Pengaturan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
