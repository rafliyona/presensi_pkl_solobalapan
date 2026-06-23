-- ============================================================
--  Supabase Schema — Sistem Presensi PKL PT KAI Solo Balapan
--  Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- ─── 1. Tabel SISWA ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.siswa (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nis         text NOT NULL UNIQUE,
  nama        text NOT NULL,
  kelas       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Data awal 4 siswa PKL
INSERT INTO public.siswa (nis, nama, kelas) VALUES
  ('24.012384', 'Fadly Dava Rizkyanto',         'XI TJKT A'),
  ('24.012393', 'Muhammad Evan Setya Nugroho',  'XI TJKT A'),
  ('24.012397', 'Muhammad Rafli Yona Saputro',  'XI TJKT A'),
  ('24.012403', 'Rafi Nadhif Ariyanto',         'XI TJKT A')
ON CONFLICT (nis) DO NOTHING;

-- RLS: izinkan akses publik (anon) untuk SELECT
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read siswa" ON public.siswa
  FOR SELECT TO anon USING (true);

-- ─── 2. Tabel ABSENSI ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.absensi (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal         date NOT NULL,
  nis             text NOT NULL REFERENCES public.siswa(nis),
  nama            text NOT NULL,
  kelas           text NOT NULL,
  jam_masuk       time,
  foto_masuk_url  text,
  lat_masuk       double precision,
  lng_masuk       double precision,
  jam_pulang      time,
  foto_pulang_url text,
  lat_pulang      double precision,
  lng_pulang      double precision,
  status          text CHECK (status IN ('Tepat Waktu', 'Terlambat')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(nis, tanggal)
);

-- RLS: izinkan anon INSERT dan UPDATE (absen masuk & pulang)
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read absensi" ON public.absensi
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert absensi" ON public.absensi
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update absensi" ON public.absensi
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON public.absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_nis ON public.absensi(nis);

-- ─── 3. Storage Bucket: selfie-absensi ───────────────────────
-- Buat bucket via Supabase Dashboard:
--   Storage → New bucket → Name: selfie-absensi → Public: YES
-- Atau jalankan via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'selfie-absensi',
  'selfie-absensi',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS untuk storage
CREATE POLICY "Allow anon upload selfie" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'selfie-absensi');

CREATE POLICY "Allow public read selfie" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'selfie-absensi');

-- ─── Selesai ─────────────────────────────────────────────────
-- Verifikasi:
-- SELECT * FROM public.siswa;
-- SELECT count(*) FROM public.absensi;

-- ─── 4. Sistem Hari Libur / Piket ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.hari_libur (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal     date NOT NULL UNIQUE,
  keterangan  text NOT NULL
);

ALTER TABLE public.hari_libur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read hari_libur" ON public.hari_libur
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow admin manage hari_libur" ON public.hari_libur
  FOR ALL TO anon USING (true);

ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS jenis text DEFAULT 'hadir'
  CHECK (jenis IN ('hadir', 'piket', 'izin', 'sakit', 'libur', 'acara'));

-- ─── 5. Tabel PENGAJUAN KETIDAKHADIRAN ───────────────────────────────────────
-- Siswa mengajukan ketidakhadiran (izin/sakit/acara/piket) untuk hari tertentu.
-- Admin dapat memverifikasi (setujui / tolak) setiap pengajuan.
CREATE TABLE IF NOT EXISTS public.pengajuan_ketidakhadiran (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nis                 text NOT NULL REFERENCES public.siswa(nis),
  nama                text NOT NULL,
  kelas               text NOT NULL,
  tanggal             date NOT NULL,
  jenis               text NOT NULL CHECK (jenis IN ('izin', 'sakit', 'acara', 'piket')),
  keterangan          text,
  status_verifikasi   text NOT NULL DEFAULT 'pending'
                        CHECK (status_verifikasi IN ('pending', 'disetujui', 'ditolak')),
  catatan_admin       text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(nis, tanggal)
);

-- RLS: anon dapat SELECT, INSERT (siswa); UPDATE (admin melalui anon key)
ALTER TABLE public.pengajuan_ketidakhadiran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read pengajuan" ON public.pengajuan_ketidakhadiran
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert pengajuan" ON public.pengajuan_ketidakhadiran
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update pengajuan" ON public.pengajuan_ketidakhadiran
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Index performa
CREATE INDEX IF NOT EXISTS idx_pengajuan_tanggal ON public.pengajuan_ketidakhadiran(tanggal);
CREATE INDEX IF NOT EXISTS idx_pengajuan_nis     ON public.pengajuan_ketidakhadiran(nis);
CREATE INDEX IF NOT EXISTS idx_pengajuan_status  ON public.pengajuan_ketidakhadiran(status_verifikasi);

-- ─── 6. Sistem Rencana Shift Siswa (H-1) ───────────────────────
CREATE TABLE IF NOT EXISTS public.rencana_shift (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nis             text NOT NULL REFERENCES public.siswa(nis),
  nama            text NOT NULL,
  kelas           text NOT NULL,
  tanggal         date NOT NULL,
  shift           text NOT NULL CHECK (shift IN ('pagi', 'sore')),
  jam_mulai       time NOT NULL,
  jam_selesai     time NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(nis, tanggal)
);

ALTER TABLE public.rencana_shift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read rencana_shift" ON public.rencana_shift
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert rencana_shift" ON public.rencana_shift
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update rencana_shift" ON public.rencana_shift
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rencana_shift_tanggal ON public.rencana_shift(tanggal);
CREATE INDEX IF NOT EXISTS idx_rencana_shift_nis ON public.rencana_shift(nis);

ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift text CHECK (shift IN ('pagi', 'sore'));
ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift_jam_mulai time;
ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift_jam_selesai time;


