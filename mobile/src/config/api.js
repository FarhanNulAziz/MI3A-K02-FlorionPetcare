import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// GANTI ANGKA DI BAWAH INI DENGAN IP YANG MUNCUL DI BROWSER HP TADI
const LAN_IP = '192.168.65.242';

const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://127.0.0.1:8000/api';
    }
    // PERHATIKAN: Ada tanda backtick (`) dan tambahan /api di akhir
    return `http://${LAN_IP}:8000/api`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('access_token');
        if (token && !config.url.includes('/login')) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error.config?.url || '';
        if (error.response?.status === 401 && !url.includes('/login')) {
            await AsyncStorage.removeItem('access_token');
        }
        return Promise.reject(error);
    }
);

export default api;
