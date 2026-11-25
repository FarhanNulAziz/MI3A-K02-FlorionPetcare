<<<<<<< HEAD
import axios from "axios";
import { getToken } from "../utils/storage";

const GATEWAY_URL = "http://localhost:8080/api";
=======
import axios from 'axios';
import { getToken } from '../utils/storage';

const GATEWAY_URL = 'http://192.168.1.11:8080/api';
>>>>>>> c6329f590a8ac01b0b5f60e957ba5070c60511f7

export const API_BASE_URL = GATEWAY_URL;

export const ENDPOINTS = {
  // Core Laravel (Sprint 1)
  AUTH: `${GATEWAY_URL}/auth`,
  OWNERS: `${GATEWAY_URL}/owners`,
  PATIENTS: `${GATEWAY_URL}/patients`,
  SERVICES: `${GATEWAY_URL}/services`,

  // Mikroservis Sprint 2
  EMR_SOAP: `${GATEWAY_URL}/emr/medical-records`,
<<<<<<< HEAD
  EMR_TIMELINE: (patientId) =>
    `${GATEWAY_URL}/emr/patients/${patientId}/medical-records`,
=======
  EMR_TIMELINE: (patientId) => `${GATEWAY_URL}/emr/patients/${patientId}/medical-records`,
>>>>>>> c6329f590a8ac01b0b5f60e957ba5070c60511f7
  MASTER_MEDICINES: `${GATEWAY_URL}/pharmacy/master/medicines`,
  MASTER_TREATMENTS: `${GATEWAY_URL}/pharmacy/master/treatments`,
  PRESCRIPTIONS: `${GATEWAY_URL}/pharmacy/prescriptions`,
  HOSPITALIZATIONS: `${GATEWAY_URL}/inpatient/hospitalizations`,
  HOSPITALIZATIONS_ACTIVE: `${GATEWAY_URL}/inpatient/hospitalizations/active`,
<<<<<<< HEAD
  DAILY_MONITORING: (hospId) =>
    `${GATEWAY_URL}/inpatient/hospitalizations/${hospId}/monitorings`,
=======
  DAILY_MONITORING: (hospId) => `${GATEWAY_URL}/inpatient/hospitalizations/${hospId}/monitorings`,
>>>>>>> c6329f590a8ac01b0b5f60e957ba5070c60511f7
};

const api = axios.create({
  baseURL: GATEWAY_URL,
  headers: {
<<<<<<< HEAD
    "Content-Type": "application/json",
    Accept: "application/json",
=======
    'Content-Type': 'application/json',
    Accept: 'application/json',
>>>>>>> c6329f590a8ac01b0b5f60e957ba5070c60511f7
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
