import axios from "axios";
import { getToken } from "../utils/storage";

const GATEWAY_URL = "http://localhost:8080/api";

export const API_BASE_URL = GATEWAY_URL;

export const ENDPOINTS = {
  AUTH: `${GATEWAY_URL}/auth`,
  OWNERS: `${GATEWAY_URL}/owners`,
  PATIENTS: `${GATEWAY_URL}/patients`,
  SERVICES: `${GATEWAY_URL}/services`,

  EMR_SOAP: `${GATEWAY_URL}/emr/medical-records`,
  EMR_TIMELINE: (patientId) =>
    `${GATEWAY_URL}/emr/patients/${patientId}/medical-records`,
  MASTER_MEDICINES: `${GATEWAY_URL}/pharmacy/master/medicines`,
  MASTER_TREATMENTS: `${GATEWAY_URL}/pharmacy/master/treatments`,
  PRESCRIPTIONS: `${GATEWAY_URL}/pharmacy/prescriptions`,
  HOSPITALIZATIONS: `${GATEWAY_URL}/inpatient/hospitalizations`,
  HOSPITALIZATIONS_ACTIVE: `${GATEWAY_URL}/inpatient/hospitalizations/active`,
  DAILY_MONITORING: (hospId) =>
    `${GATEWAY_URL}/inpatient/hospitalizations/${hospId}/monitorings`,
};

const api = axios.create({
  baseURL: GATEWAY_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
