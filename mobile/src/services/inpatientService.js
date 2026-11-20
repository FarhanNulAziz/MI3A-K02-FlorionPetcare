import api from '../config/api';

// 1. Ambil daftar pasien rawat inap (bisa filter status: 'inpatient' atau 'discharged')
export const getHospitalizations = async (status = '') => {
  const params = status ? { status } : {};
  const response = await api.get('/hospitalizations', { params });
  return response.data;
};

// 2. Ambil detail satu data rawat inap beserta riwayat daily monitoring-nya
export const getHospitalizationDetail = async (id) => {
  const response = await api.get(`/hospitalizations/${id}`);
  return response.data;
};

// 3. Daftarkan pasien masuk rawat inap baru
export const admitInpatient = async (payload) => {
  const response = await api.post('/hospitalizations', payload);
  return response.data;
};

// 4. Tambahkan catatan daily monitoring harian
export const addDailyMonitoring = async (hospitalizationId, payload) => {
  const response = await api.post(`/hospitalizations/${hospitalizationId}/monitorings`, payload);
  return response.data;
};

// 5. Pulangkan pasien (discharge) & hitung total tagihan otomatis
export const dischargeInpatient = async (hospitalizationId, payload) => {
  const response = await api.patch(`/hospitalizations/${hospitalizationId}/discharge`, payload);
  return response.data;
};

// 6. Ambil daftar pasien untuk dropdown pendaftaran rawat inap
export const getPatientsList = async () => {
  const response = await api.get('/patients');
  return response.data;
};
