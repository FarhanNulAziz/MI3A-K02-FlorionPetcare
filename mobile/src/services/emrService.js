import { ENDPOINTS } from '../config/api';
import { getToken } from '../utils/storage';

const authHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// US-2001: Ambil Timeline Riwayat Medis Pasien
export const getPatientMedicalRecords = async (patientId) => {
  const res = await fetch(ENDPOINTS.EMR_TIMELINE(patientId), {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Gagal memuat riwayat medis');
  return data;
};

// US-2002: Simpan Diagnostik SOAP baru
export const createSOAPRecord = async (payload) => {
  const res = await fetch(ENDPOINTS.EMR_SOAP, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Gagal menyimpan catatan SOAP');
  return data;
};
