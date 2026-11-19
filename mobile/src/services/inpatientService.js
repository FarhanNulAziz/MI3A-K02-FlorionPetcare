import { ENDPOINTS } from '../config/api';
import { getToken } from '../utils/storage';

const authHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// US-2004: Daftar Pasien Rawat Inap Aktif
export const getActiveHospitalizations = async () => {
  const res = await fetch(ENDPOINTS.HOSPITALIZATIONS_ACTIVE, { headers: await authHeaders() });
  return res.json();
};

// US-2004: Daftarkan Pasien Rawat Inap (Paket 35k / 50k + Kandang)
export const admitInpatient = async (payload) => {
  const res = await fetch(ENDPOINTS.HOSPITALIZATIONS, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Gagal mendaftarkan rawat inap');
  return data;
};

// US-2004: Tambah & Lihat Daily Monitoring (Nafsu makan, PIP, PUP, Muntah, Diare)
export const addDailyMonitoring = async (hospId, payload) => {
  const res = await fetch(ENDPOINTS.DAILY_MONITORING(hospId), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Gagal menyimpan daily monitoring');
  return data;
};

export const getDailyMonitorings = async (hospId) => {
  const res = await fetch(ENDPOINTS.DAILY_MONITORING(hospId), { headers: await authHeaders() });
  return res.json();
};
