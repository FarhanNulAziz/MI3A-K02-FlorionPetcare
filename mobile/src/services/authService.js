import api from '../config/api'; // Pastikan file api.js sudah ada
import { saveSession, clearSession } from '../utils/storage';

export const login = async (email, password) => {
    // Request ke backend Laravel
    const response = await api.post('/login', { email, password });

    // Jika sukses dan token diterima, simpan ke AsyncStorage
    if (response.data.success && response.data.access_token) {
        await saveSession(response.data.access_token, response.data.user);
    }

    return response.data;
};

export const logout = async () => {
    try {
        await api.post('/logout');
    } catch (error) {
        console.log('Logout error:', error);
    } finally {
        await clearSession();
    }
};
