import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    const data = await req.json();
    const customApiKey = data.customApiKey?.trim();
    let useSystemKey = false;
    let userId = null;
    let token = '';

    const missing = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) missing.push('SUPABASE URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) missing.push('SUPABASE ANON KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error: `Pengaturan Database belum lengkap. Pastikan variabel berikut sudah ditambahkan di Vercel: ${missing.join(', ')}.`,
          missing,
        },
        { status: 500 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Authentication & Authorization Check
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.' },
          { status: 401 }
        );
      }
      
      userId = user.id;

      // 2. Check Credits if using Free Tier (No Custom API Key)
      if (!customApiKey) {
        useSystemKey = true;

        // Check if user has enough credits by creating an authenticated client
        const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: credits, error: creditError } = await authSupabase.rpc('get_my_credit');
        
        if (credits === 0) {
          return NextResponse.json(
            { error: 'Kuota gratis Anda telah habis. Silakan masukkan Google Gemini API Key Anda sendiri di menu Pengaturan Aplikasi untuk akses tanpa batas.' },
            { status: 402 } // Payment Required
          );
        }
      }
    } else {
      // Guest User
      if (!customApiKey) {
        useSystemKey = true;
      }
    }

    // 2. Initialize Gemini AI
    const apiKeyToUse = customApiKey || process.env.GEMINI_API_KEY || '';
    if (!apiKeyToUse) {
      return NextResponse.json({ error: 'Sistem belum dikonfigurasi dengan API Key.' }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKeyToUse);

    let specialInstructions = [];

    specialInstructions.push(`
**INSTRUKSI FILOSOFI DEEP LEARNING:**
- RPP ini harus dirancang menggunakan pendekatan **Deep Learning** yang berpusat pada siswa dengan menekankan tiga pilar utama:
  1. **Pembelajaran Bermakna (Meaningful Learning):** Mengaitkan materi dengan konteks dunia nyata.
  2. **Pembelajaran Berkesadaran (Mindful Learning):** Mendorong siswa untuk berpikir kritis, reflektif, dan peka terhadap proses belajarnya.
  3. **Menyenangkan (Joyful Learning):** Menciptakan suasana belajar yang interaktif, menantang tanpa membuat stres, dan memicu rasa ingin tahu.
- Integrasikan prinsip-prinsip ini ke dalam setiap tahap Kegiatan Inti berdasarkan model pembelajaran **${data.learningModel}** yang dipilih.`);

    if (data.isP5) {
      specialInstructions.push(`
**INSTRUKSI P5 (Proyek Penguatan Profil Pelajar Pancasila):**
- Sertakan satu bagian singkat yang menyarankan **skenario atau topik proyek P5** yang relevan dengan Materi Pokok ini.
- Jelaskan bagaimana proyek tersebut dapat menguatkan dimensi Profil Pelajar Pancasila.`);
    }

    if (data.isDigital) {
      specialInstructions.push(`
**INSTRUKSI PENGGUNAAN ALAT DIGITAL:**
- Wajib menyarankan dan mengintegrasikan **alat format digital spesifik** (contoh: Canva, Quizizz, Google Form, Padlet, Kahoot, dll) dalam Kegiatan Inti atau Asesmen.
- Jelaskan secara singkat bagaimana alat tersebut digunakan untuk meningkatkan pengalaman belajar.`);
    }

    const prompt = `Bertindaklah sebagai ahli pendidikan dan kurikulum profesional.

Buatkan sebuah dokumen Modul Ajar/RPP yang mendalam dan komprehensif berdasarkan data berikut. Gunakan gaya bahasa formal, instruksional, dan mudah dibaca. Visualisasi menggunakan format Markdown yang rapi (headings, bold, lists, tables).

**INFORMASI PENDIDIK:**
- Nama Guru: ${data.teacherName}
- Institusi: ${data.institution}

**INFORMASI AKADEMIK:**
- Kurikulum: ${data.curriculum}
- Jenjang: ${data.level}
- Fase: ${data.phase}
- Kelas: ${data.grade}
- Jumlah Siswa: ${data.studentCount || '28'} Siswa
- Mata Pelajaran: ${data.subject}

**DETAIL PEMBELAJARAN:**
- Materi Pokok: ${data.topic}
- Ringkasan Profil Siswa (untuk Diferensiasi): ${data.studentProfile}
- Jumlah Pertemuan: ${data.meetings} Pertemuan
- Durasi per Pertemuan: ${data.duration} ${data.durationUnit}
- Model Pembelajaran: ${data.learningModel}
- Dimensi Profil Lulusan: ${data.dimensions}

**SPESIFIKASI DEEP LEARNING:**
- Capaian Pembelajaran / Tujuan: ${data.learningObjectives || 'Buatkan tujuan pembelajaran yang relevan dan mendalam.'}
- Konteks Isu Dunia Nyata: ${data.contextualProblem || 'Ciptakan satu skenario atau konteks nyata yang relevan.'}
- Minat Dominan Siswa: ${data.studentInterests || 'Gunakan analogi umum yang menyenangkan.'}
- Fasilitas Tersedia: ${data.facilities || 'Standar ruang kelas tanpa teknologi.'}

${specialInstructions.join('\n')}

---

**STRUKTUR DOKUMEN YANG WAJIB DIIKUTI (Gunakan Format Markdown):**
(JANGAN membuat Judul Utama / Heading 1 di awal dokumen. Langsung mulai baris pertama dengan A. Identitas Modul, karena aplikasi kami sudah menyediakan judul otomatis)

**A. Identitas Modul**
(Buat format tabel dengan kolom: Komponen | Keterangan. Isi: Modul (Mata Pelajaran), Penyusun/Tahun, Kelas/Fase Capaian, Elemen/Topik, Alokasi Waktu, Target Peserta Didik (Sebutkan jumlah siswa yaitu ${data.studentCount || '28'} siswa dan karakteristik umumnya), Capaian Pembelajaran)

**B. Dimensi Profil Lulusan**
(Sebutkan dimensi profil pelajar Pancasila yang relevan, contoh: Penalaran kritis, kolaborasi, dll)

**C. Model dan Metode**
- Model Pembelajaran: ${data.learningModel}
- Metode Pembelajaran: (misal diskusi, presentasi)
- Pendekatan Pembelajaran: Deep Learning

**D. Mitra Pembelajaran**
(Masyarakat sekitar, ahli, dll)

**E. Lingkungan Pembelajaran**
1) Ruang Fisik: (Lingkungan sekitar)
2) Ruang Virtual: (Misal google form, asesmen platform)
3) Budaya belajar: (Kolaboratif, partisipatif)

**F. Pemanfaatan Digital**
(Sebutkan aplikasi/digital tool yang digunakan)

**G. Sarana dan Prasarana**
- Sarana: (Alat elektronik/teknologi)
- Prasarana: (Buku, sumber belajar)

**H. Tujuan Pembelajaran**
(Uraikan poin-poin tujuan pembelajaran)

**I. Pertanyaan Pemantik**
(Berikan 4-6 pertanyaan pemantik)

**J. Materi Esensial**
(Poin-poin ringkasan materi pokok)

**K. Langkah-langkah Pembelajaran Mendalam**
(Buat TABEL dengan 4 kolom: Kegiatan Pembelajaran | Sintaks Model | Deskripsi Kegiatan | Alokasi Waktu).
- Isi: Pendahuluan, Kegiatan Inti (jabarkan tahap-tahap ${data.learningModel}), Penutup.
- Sisipkan keterangan "(Berkesadaran)", "(Bermakna)", "(Memahami)", "(Mengaplikasi)" di akhir deskripsi kegiatan yang relevan.

**L. Penilaian atau Asesmen**
1. Jenis Asesmen: Diagnostik, Formatif, Sumatif
2. Metode dan Bentuk Instrumen (Buat Tabel: Aspek | Bentuk Instrumen)

**M. Refleksi**
1. Refleksi Guru (Berikan 3-4 pertanyaan)

**LAMPIRAN**
- **Diagnostik Non Kognitif** (Buat tabel: Non Kognitif | Soal Kunci)
- **Pengamatan Kinerja** (Buat tabel: Aspek yang dinilai | Rubrik skor 1-3)
- **Dimensi Profil Lulusan** (Buat tabel: Aspek Penilaian | Kriteria | Skor 1-4)
- **Rubrik Penilaian Keterampilan Berdasarkan Produk** (Buat tabel: Aspek Penilaian | Kriteria | Skor 1-3)
- **Lembar Kerja Peserta Didik (LKPD)** (Format form kosong: Tujuan, Rumusan Masalah, Ayo Pelajari, Mencari Solusi, Kesimpulan)
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Decrement credit if successful and using system key
    if (useSystemKey && token) {
      const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      // Best effort decrement. Even if it fails, the generation succeeded.
      await authSupabase.rpc('decrement_my_credit');
    }

    return NextResponse.json({ result: text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // Check if error is related to invalid API key provided by user
    if (error.message?.includes('API key not valid')) {
      return NextResponse.json(
        { error: 'API Key Gemini Pribadi yang Anda masukkan tidak valid. Silakan periksa kembali di Pengaturan.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat menghubungi server AI.' },
      { status: 500 }
    );
  }
}
