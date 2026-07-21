"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const getPhaseString = (grade: string) => {
  const g = parseInt(grade);
  if (isNaN(g)) return grade.split(' ')[0];
  if (g >= 1 && g <= 2) return `A`;
  if (g >= 3 && g <= 4) return `B`;
  if (g >= 5 && g <= 6) return `C`;
  if (g >= 7 && g <= 9) return `D`;
  if (g === 10) return `E`;
  if (g >= 11 && g <= 12) return `F`;
  return grade;
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRpp, setSelectedRpp] = useState<any>(null);
  const [sigSettings, setSigSettings] = useState({
    principalName: '',
    principalNip: '',
    teacherNip: '',
    placeName: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchHistory(session.user.id);
        if (session.user.user_metadata) {
          setSigSettings({
            principalName: session.user.user_metadata.principalName || '',
            principalNip: session.user.user_metadata.principalNip || '',
            teacherNip: session.user.user_metadata.teacherNip || '',
            placeName: session.user.user_metadata.placeName || ''
          });
        }
      } else {
        setLoading(false);
      }
    });

    const savedSig = localStorage.getItem('sigSettings');
    if (savedSig) {
      setSigSettings(prev => ({...prev, ...JSON.parse(savedSig)}));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchHistory(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchHistory = async (userId: string) => {
    setLoading(true);
    try {
      // In a real app, you'd fetch from a Supabase table here.
      // For MVP Phase 2, if the table isn't created yet, we can mock it 
      // or handle the error gracefully.
      const { data, error } = await supabase
        .from('rpp_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("No table found or error fetching data", error);
      } else {
        setHistory(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openRpp = (rpp: any) => {
    setSelectedRpp(rpp);
  };

  const exportToDocx = async (rpp: any) => {
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: rpp.rpp_content,
          subject: rpp.subject,
          phase: getPhaseString(rpp.grade),
          placeName: sigSettings.placeName,
          principalName: sigSettings.principalName,
          principalNip: sigSettings.principalNip,
          teacherName: user?.user_metadata?.full_name,
          teacherNip: sigSettings.teacherNip,
          dateString: new Date(rpp.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Modul_Ajar_${(rpp.subject || 'RPP').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert('Gagal mengunduh file Word.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Akses Ditolak</h1>
        <p className="text-slate-600 mb-6">Anda harus login untuk melihat riwayat Modul Ajar.</p>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <header className="mb-8 max-w-7xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
            Dasbor Riwayat
          </h1>
          <p className="text-slate-600">Semua RPP dan Modul Ajar yang pernah Anda buat tersimpan di sini.</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          &larr; Buat RPP Baru
        </Link>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-lg font-medium">Belum ada riwayat RPP.</p>
              <p className="text-sm">Riwayat akan muncul di sini setelah Anda membuat modul baru.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                  <th className="p-4 font-semibold">Topik</th>
                  <th className="p-4 font-semibold">Kelas & Mapel</th>
                  <th className="p-4 font-semibold">Tanggal Dibuat</th>
                  <th className="p-4 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium">{item.topic}</td>
                    <td className="p-4 text-sm">{item.grade} - {item.subject}</td>
                    <td className="p-4 text-sm text-slate-500">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => setSelectedRpp(item)}
                        className="text-blue-600 hover:underline text-sm font-semibold"
                      >
                        Lihat Modul
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal for viewing RPP */}
      {selectedRpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:p-8 print:p-0 print:bg-white print:block">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-full overflow-y-auto shadow-2xl relative print:shadow-none print:w-full print:max-w-none print:h-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center print:hidden z-10">
              <h2 className="text-lg font-bold text-slate-800">{selectedRpp.topic} ({selectedRpp.grade})</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportToDocx(selectedRpp)}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                >
                  Download Word
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg text-sm hover:bg-blue-100 transition-colors"
                >
                  Print
                </button>
                <button 
                  onClick={() => setSelectedRpp(null)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 md:p-10 prose prose-slate max-w-none prose-h1:text-3xl prose-h2:text-2xl prose-a:text-blue-600">
              
              {/* Judul Modul Ajar (Kop) */}
              <div className="text-center mb-8 border-b-2 border-black pb-4 print:mt-4">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-black !mb-0">MODUL AJAR {selectedRpp.subject}</h1>
                <p className="text-lg mt-1 font-semibold text-slate-800 !mt-2">Fase {getPhaseString(selectedRpp.grade)}</p>
              </div>

              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeRaw, rehypeKatex]}
              >
                {selectedRpp.rpp_content}
              </ReactMarkdown>
              
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
                  <p>{sigSettings.placeName || "................."}, {new Date(selectedRpp.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                  <p>Guru Mata Pelajaran</p>
                  <br/><br/><br/><br/>
                  <p className="font-bold border-b border-black inline-block min-w-[200px] pb-1">{user?.user_metadata?.full_name || "(............................................)"}</p>
                  <p className="mt-1">NIP. {sigSettings.teacherNip || "........................................"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
