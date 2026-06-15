# 🚆 Presensi PKL — PT KAI Solo Balapan

Aplikasi web absensi online untuk siswa PKL di PT KAI Solo Balapan.
Dibangun dengan **React + Vite + Tailwind CSS + Supabase**.

---

## 🚀 Cara Menjalankan

```bash
npm install
npm run dev
```

Buka di browser: http://localhost:5173

---

## 🗄️ Setup Database Supabase

**PENTING:** Jalankan script SQL berikut di Supabase SQL Editor sebelum menjalankan aplikasi:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project Anda
2. Masuk ke **SQL Editor**
3. Paste & jalankan isi file `supabase_migration.sql`
4. Verifikasi: `SELECT * FROM public.siswa;` — harus menampilkan 4 baris data

---

## 📁 Struktur Proyek

```
src/
├── components/
│   ├── AttendanceTable.jsx  # Tabel rekap absensi (dengan lightbox foto)
│   ├── CameraCapture.jsx    # Live selfie via WebRTC
│   ├── LoadingSpinner.jsx   # Spinner loading
│   ├── LocationCapture.jsx  # GPS capture
│   ├── Navbar.jsx           # Header navigasi
│   └── StatusBadge.jsx      # Badge status absensi
├── context/
│   └── AppContext.jsx       # Global state (session, siswa, absensi)
├── pages/
│   ├── LoginPage.jsx        # Login siswa (dropdown / NIS)
│   ├── AbsenPage.jsx        # Halaman absen utama
│   ├── AdminLoginPage.jsx   # Login admin
│   └── AdminDashboardPage.jsx # Dashboard rekap + ekspor
├── utils/
│   ├── supabase.js          # Supabase client & DB helpers
│   └── timeUtils.js         # Fungsi waktu & status
├── App.jsx                  # Routing utama
├── main.jsx                 # Entry point
└── index.css                # Global styles + Tailwind
```

---

## 👤 Data Siswa PKL

| NIS | Nama | Kelas |
|-----|------|-------|
| 24.012384 | Fadly Dava Rizkyanto | XI TJKT A |
| 24.012393 | Muhammad Evan Setya Nugroho | XI TJKT A |
| 24.012397 | Muhammad Rafli Yona Saputro | XI TJKT A |
| 24.012403 | Rafi Nadhif Ariyanto | XI TJKT A |

---

## 🔑 Akun Admin

- **Username:** `admin`
- **Password:** _(lihat di konfigurasi server / tanya pengelola)_
- **Route:** `/admin`

> ⚠️ **Jangan simpan password di README untuk keamanan.**

---

## ⏰ Aturan Jam Kerja

| Keterangan | Waktu |
|-----------|-------|
| Jam Masuk (Tepat Waktu) | 08:00 WIB |
| Status Terlambat | > 08:00 WIB |
| Tombol Absen Pulang Aktif | ≥ 16:00 WIB |

> **Mode Demo:** Toggle di halaman absen untuk bypass jam 16:00 saat testing.

---

## 🌐 Environment Variables

Salin file `.env.example` menjadi `.env`, lalu isi dengan nilai dari Supabase Dashboard Anda:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> ⚠️ **Jangan commit file `.env` ke repository!** File ini sudah ada di `.gitignore`.

---

## 📊 Fitur Admin Dashboard

- Statistik harian (Hadir, Tepat Waktu, Terlambat, Belum Pulang)
- Filter berdasarkan tanggal
- Pencarian berdasarkan nama / NIS
- **Ekspor CSV** dan **Ekspor Excel (.xlsx)**
- Thumbnail foto selfie dengan lightbox
- Link GPS langsung ke Google Maps
