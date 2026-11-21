import api from '../config/api';

// US-2003: Ambil Master Obat (opsional dengan kata kunci pencarian)
export const getMasterMedicines = async (search = '') => {
  const params = search ? { search } : {};
  const response = await api.get('/pharmacy/master/medicines', { params });
  return response.data;
};

// US-2003: Ambil Master Tindakan
export const getMasterTreatments = async () => {
  const response = await api.get('/pharmacy/master/treatments');
  return response.data;
};

// US-2003: Simpan Resep & Tindakan (otomatis kurangi stok)
export const createPrescription = async (payload) => {
  const response = await api.post('/pharmacy/prescriptions', payload);
  return response.data;
};

// US-2003: Ambil daftar resep tersimpan berdasarkan rekam medis / pasien
export const getPrescriptions = async ({ medicalRecordId, patientId } = {}) => {
  const params = {};
  if (medicalRecordId) params.medical_record_id = medicalRecordId;
  if (patientId) params.patient_id = patientId;
  const response = await api.get('/pharmacy/prescriptions', { params });
  return response.data;
};

// US-2003: Batalkan resep (server mengembalikan stok obat)
export const deletePrescription = async (id) => {
  const response = await api.delete(`/pharmacy/prescriptions/${id}`);
  return response.data;
};

// US-2003: Ubah error axios menjadi satu pesan Bahasa Indonesia
export const getPharmacyErrorMessage = (error) => {
  const fallback = 'Gagal memproses resep & tindakan';

  if (!error || !error.response) {
    return 'Tidak dapat terhubung ke server, periksa koneksi/IP gateway';
  }

  const { status, data } = error.response;

  if (status === 401 || status === 403) {
    return 'Sesi habis atau akses ditolak';
  }

  if (data) {
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const first = data.detail[0];
      if (typeof first === 'string' && first.trim()) return first;
      if (first && typeof first.msg === 'string' && first.msg.trim()) return first.msg;
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }

  return fallback;
};
