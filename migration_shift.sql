-- ============================================================
--  Supabase Migration — Fitur Shift Pagi/Sore (H-1)
--  Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Buat Tabel Rencana Shift
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

-- Mengaktifkan RLS untuk keamanan
ALTER TABLE public.rencana_shift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read rencana_shift" ON public.rencana_shift
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert rencana_shift" ON public.rencana_shift
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update rencana_shift" ON public.rencana_shift
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Index performa
CREATE INDEX IF NOT EXISTS idx_rencana_shift_tanggal ON public.rencana_shift(tanggal);
CREATE INDEX IF NOT EXISTS idx_rencana_shift_nis ON public.rencana_shift(nis);

-- 2. Tambahkan Kolom Shift pada Tabel Absensi untuk Menyimpan Snapshot
ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift text CHECK (shift IN ('pagi', 'sore'));
ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift_jam_mulai time;
ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift_jam_selesai time;
