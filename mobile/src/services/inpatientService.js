import api from '../config/api';

// 1. Ambil daftar pasien rawat inap dari inpatient-service
export const getHospitalizations = async (status = '') => {
  const params = status ? { status } : {};
  const response = await api.get('/inpatient/hospitalizations', { params });
  return response.data;
};

// 2. Ambil detail satu data rawat inap beserta riwayat daily monitoring-nya
export const getHospitalizationDetail = async (id) => {
  const response = await api.get(`/inpatient/hospitalizations/${id}`);
  return response.data;
};

// 3. Daftarkan pasien masuk rawat inap baru
export const admitInpatient = async (payload) => {
  const response = await api.post('/inpatient/hospitalizations', payload);
  return response.data;
};

// 4. Tambahkan catatan daily monitoring harian
export const addDailyMonitoring = async (hospitalizationId, payload) => {
  const response = await api.post(`/inpatient/hospitalizations/${hospitalizationId}/monitorings`, payload);
  return response.data;
};

// 5. Pulangkan pasien (discharge) & hitung total tagihan otomatis
export const dischargeInpatient = async (hospitalizationId, payload) => {
  const response = await api.patch(`/inpatient/hospitalizations/${hospitalizationId}/discharge`, payload);
  return response.data;
};

// 6. Ambil daftar pasien dari Core Laravel Service
export const getPatientsList = async () => {
  const response = await api.get('/patients');
  return response.data;
};
