-- ============================================================
--  Supabase Migration — Fitur Tabungan Cuti
--  Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- ─── 1. Tabel TABUNGAN CUTI (saldo per siswa) ─────────────────
CREATE TABLE IF NOT EXISTS public.tabungan_cuti (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nis         text NOT NULL REFERENCES public.siswa(nis),
  nama        text NOT NULL,
  kelas       text NOT NULL,
  saldo_cuti  int NOT NULL DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(nis)
);

-- RLS
ALTER TABLE public.tabungan_cuti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read tabungan_cuti" ON public.tabungan_cuti
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert tabungan_cuti" ON public.tabungan_cuti
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update tabungan_cuti" ON public.tabungan_cuti
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tabungan_cuti_nis ON public.tabungan_cuti(nis);


-- ─── 2. Tabel RIWAYAT CUTI (histori tiap transaksi) ───────────
CREATE TABLE IF NOT EXISTS public.riwayat_cuti (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nis         text NOT NULL REFERENCES public.siswa(nis),
  nama        text NOT NULL,
  kelas       text NOT NULL,
  tanggal     date NOT NULL,
  jenis       text NOT NULL CHECK (jenis IN ('masuk', 'keluar')),
  -- masuk  = dapat cuti dari piket hari libur
  -- keluar = cuti dipakai (pengajuan cuti disetujui)
  keterangan  text,
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.riwayat_cuti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read riwayat_cuti" ON public.riwayat_cuti
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert riwayat_cuti" ON public.riwayat_cuti
  FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_riwayat_cuti_nis     ON public.riwayat_cuti(nis);
CREATE INDEX IF NOT EXISTS idx_riwayat_cuti_tanggal ON public.riwayat_cuti(tanggal);


-- ─── 3. Update constraint pengajuan_ketidakhadiran ─────────────
-- Pastikan jenis 'cuti' diizinkan
ALTER TABLE public.pengajuan_ketidakhadiran
  DROP CONSTRAINT IF EXISTS pengajuan_ketidakhadiran_jenis_check;

ALTER TABLE public.pengajuan_ketidakhadiran
  ADD CONSTRAINT pengajuan_ketidakhadiran_jenis_check
  CHECK (jenis IN ('izin', 'sakit', 'cuti', 'piket', 'acara'));


-- ─── Verifikasi ─────────────────────────────────────────────────
-- SELECT * FROM public.tabungan_cuti;
-- SELECT * FROM public.riwayat_cuti;
