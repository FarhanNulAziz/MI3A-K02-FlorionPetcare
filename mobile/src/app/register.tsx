import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../config/api';
import CustomAlert from '../components/custom-alert';

export default function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // State untuk CustomAlert
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

    const handleRegister = async () => {
        if (!name || !email || !password) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Nama, Email, dan Password wajib diisi!', type: 'error', onConfirm: undefined });
            return;
        }

        if (password.length < 6) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Password minimal 6 karakter!', type: 'error', onConfirm: undefined });
            return;
        }

        setLoading(true);
        try {
            // Hanya mengirim name, email, password.
            // Backend akan otomatis mengatur role menjadi 'pemilik'
            const response = await api.post('/register', { name, email, password });

            if (response.data.success) {
                setAlert({
                    visible: true,
                    title: 'Pendaftaran Berhasil',
                    message: 'Akun Anda telah berhasil dibuat. Silakan login dengan akun baru Anda.',
                    type: 'success',
                    onConfirm: () => router.replace('/login')
                });
            }
        } catch (error: any) {
            console.log("Error API:", error.response?.data || error.message);
            const msg = error.response?.data?.message || 'Terjadi kesalahan jaringan.';
            setAlert({ visible: true, title: 'Pendaftaran Gagal', message: msg, type: 'error', onConfirm: undefined });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.blob1} pointerEvents="none" />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <TouchableOpacity style={styles.backButton} onPress={() => router.push('/login')}>
                        <Text style={styles.backText}>← Kembali ke Login</Text>
                    </TouchableOpacity>

                    <View style={styles.headerWrap}>
                        <Text style={styles.title}>Buat Akun Pemilik</Text>
                        <Text style={styles.subtitle}>Daftar untuk mengelola hewan kesayangan Anda</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nama Lengkap</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Contoh: Budi Santoso"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Alamat Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="budi@email.com"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Minimal 6 karakter"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.btnWrap}>
                            <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.btnGradient}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Daftar Akun</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* PANGGIL CUSTOM ALERT DI SINI */}
            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, visible: false })}
                onConfirm={alert.onConfirm}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    blob1: { position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, backgroundColor: '#E6F4F1', borderRadius: 150, opacity: 0.8 },
    scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center', maxWidth: 500, alignSelf: 'center', width: '100%' },
    backButton: { marginBottom: 20, alignSelf: 'flex-start' },
    backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
    headerWrap: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    card: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 14, color: '#111827' },
    btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 10, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
