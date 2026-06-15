import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── SISWA ──────────────────────────────────────────────────────────────────

export const getSiswa = async () => {
  const { data, error } = await supabase
    .from('siswa')
    .select('*')
    .order('nama', { ascending: true })
  if (error) throw error
  return data
}

export const getSiswaByNIS = async (nis) => {
  const { data, error } = await supabase
    .from('siswa')
    .select('*')
    .eq('nis', nis)
    .single()
  if (error) throw error
  return data
}

// ─── ABSENSI ─────────────────────────────────────────────────────────────────

export const getAbsensiByNISAndDate = async (nis, tanggal) => {
  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .eq('nis', nis)
    .eq('tanggal', tanggal)
    .maybeSingle()
  if (error) throw error
  return data
}

export const createAbsensiMasuk = async ({ nis, nama, kelas, tanggal, jam_masuk, foto_masuk_url, lat_masuk, lng_masuk, status, jenis }) => {
  const { data, error } = await supabase
    .from('absensi')
    .insert([{ nis, nama, kelas, tanggal, jam_masuk, foto_masuk_url, lat_masuk, lng_masuk, status, jenis }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateAbsensiPulang = async (id, { jam_pulang, foto_pulang_url, lat_pulang, lng_pulang }) => {
  const { data, error } = await supabase
    .from('absensi')
    .update({ jam_pulang, foto_pulang_url, lat_pulang, lng_pulang })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getAllAbsensi = async (filters = {}) => {
  let query = supabase
    .from('absensi')
    .select('*')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.tanggal) {
    query = query.eq('tanggal', filters.tanggal)
  }
  if (filters.search) {
    query = query.or(`nama.ilike.%${filters.search}%,nis.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// ─── STORAGE (Selfie Upload) ──────────────────────────────────────────────────

export const uploadSelfie = async (base64DataUrl, fileName) => {
  // Convert base64 to blob
  const base64 = base64DataUrl.split(',')[1]
  const mimeType = base64DataUrl.split(';')[0].split(':')[1]
  const byteString = atob(base64)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([ab], { type: mimeType })

  const { data, error } = await supabase.storage
    .from('selfie-absensi')
    .upload(fileName, blob, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('selfie-absensi')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// ─── HARI LIBUR / PIKET ────────────────────────────────────────────────────────

export const getHariLibur = async () => {
  const { data, error } = await supabase
    .from('hari_libur')
    .select('*')
    .order('tanggal', { ascending: true })
  if (error) throw error
  return data
}

export const addHariLibur = async ({ tanggal, keterangan }) => {
  const { data, error } = await supabase
    .from('hari_libur')
    .insert([{ tanggal, keterangan }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteHariLibur = async (id) => {
  const { error } = await supabase
    .from('hari_libur')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

export const updateAbsensiJenis = async (id, jenis) => {
  const { data, error } = await supabase
    .from('absensi')
    .update({ jenis })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── PENGAJUAN KETIDAKHADIRAN ───────────────────────────────────────────────

export const getPengajuanByNISAndDate = async (nis, tanggal) => {
  const { data, error } = await supabase
    .from('pengajuan_ketidakhadiran')
    .select('*')
    .eq('nis', nis)
    .eq('tanggal', tanggal)
    .maybeSingle()
  if (error) throw error
  return data
}

export const createPengajuan = async ({ nis, nama, kelas, tanggal, jenis, keterangan }) => {
  const { data, error } = await supabase
    .from('pengajuan_ketidakhadiran')
    .insert([{ nis, nama, kelas, tanggal, jenis, keterangan }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const getAllPengajuan = async (filters = {}) => {
  let query = supabase
    .from('pengajuan_ketidakhadiran')
    .select('*')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.tanggal) {
    query = query.eq('tanggal', filters.tanggal)
  }
  if (filters.search) {
    query = query.or(`nama.ilike.%${filters.search}%,nis.ilike.%${filters.search}%`)
  }
  if (filters.status_verifikasi) {
    query = query.eq('status_verifikasi', filters.status_verifikasi)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const updateStatusPengajuan = async (id, status_verifikasi) => {
  const { data, error } = await supabase
    .from('pengajuan_ketidakhadiran')
    .update({ status_verifikasi })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

