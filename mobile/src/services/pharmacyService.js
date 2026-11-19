import { ENDPOINTS } from '../config/api';
import { getToken } from '../utils/storage';

const authHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// US-2003: Ambil Master Obat & Master Tindakan
export const getMasterMedicines = async () => {
  const res = await fetch(ENDPOINTS.MASTER_MEDICINES, { headers: await authHeaders() });
  return res.json();
};

export const getMasterTreatments = async () => {
  const res = await fetch(ENDPOINTS.MASTER_TREATMENTS, { headers: await authHeaders() });
  return res.json();
};

// US-2003: Simpan Resep & Tindakan (otomatis kurangi stok)
export const createPrescription = async (payload) => {
  const res = await fetch(ENDPOINTS.PRESCRIPTIONS, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Gagal menyimpan resep & tindakan');
  return data;
};
