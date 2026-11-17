import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated
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

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

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
            const response = await api.post('/register', { name, email, password });
            if (response.data.success) {
                setAlert({ visible: true, title: 'Pendaftaran Berhasil', message: 'Akun Anda telah dibuat. Silakan login.', type: 'success', onConfirm: () => router.replace('/login') });
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Terjadi kesalahan jaringan.';
            setAlert({ visible: true, title: 'Pendaftaran Gagal', message: msg, type: 'error', onConfirm: undefined });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.bgCircleTop} pointerEvents="none" />
            <View style={styles.bgCircleBottom} pointerEvents="none" />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <TouchableOpacity style={styles.backButton} onPress={() => router.push('/login')}>
                        <Text style={styles.backText}>← Kembali ke Login</Text>
                    </TouchableOpacity>

                    <Animated.View style={[styles.headerWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.logoIcon}>
                            <Text style={{ fontSize: 36 }}>🐾</Text>
                        </View>
                        <Text style={styles.title}>Buat Akun Pemilik</Text>
                        <Text style={styles.clinicSubtitle}>Daftar untuk mengelola hewan kesayangan Anda</Text>
                    </Animated.View>

                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nama Lengkap</Text>
                            <View style={styles.inputWrap}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput style={styles.input} placeholder="Budi Santoso" placeholderTextColor="#9CA3AF" value={name} onChangeText={setName} />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Alamat Email</Text>
                            <View style={styles.inputWrap}>
                                <Text style={styles.inputIcon}>✉️</Text>
                                <TextInput style={styles.input} placeholder="budi@email.com" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrap}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput style={styles.input} placeholder="Minimal 6 karakter" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.btnWrap}>
                            <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.btnGradient}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Daftar Sekarang</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            <CustomAlert
                visible={alert.visible} title={alert.title} message={alert.message} type={alert.type}
                onClose={() => setAlert({ ...alert, visible: false })} onConfirm={alert.onConfirm}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    bgCircleTop: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, backgroundColor: '#E6F4F1', borderRadius: 150, opacity: 0.6 },
    bgCircleBottom: { position: 'absolute', bottom: -100, left: -100, width: 250, height: 250, backgroundColor: '#E6F4F1', borderRadius: 125, opacity: 0.6 },

    scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center', maxWidth: 480, alignSelf: 'center', width: '100%' },
    backButton: { marginBottom: 20, alignSelf: 'flex-start' },
    backText: { color: '#0D9488', fontWeight: '700', fontSize: 14 },

    headerWrap: { alignItems: 'center', marginBottom: 32 },
    logoIcon: { width: 80, height: 80, backgroundColor: '#FFFFFF', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
    title: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 4 },
    clinicSubtitle: { fontSize: 13, color: '#6B7280' },

    card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 10 },

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, height: 54 },
    inputIcon: { fontSize: 16, marginRight: 12 },
    input: { flex: 1, fontSize: 14, color: '#111827', height: '100%' },

    btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 16, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
