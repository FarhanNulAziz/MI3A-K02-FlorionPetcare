import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../services/authService';
import CustomAlert from '../components/custom-alert';

// PERBAIKAN: Label dibuat lebih singkat agar tidak turun ke baris kedua
const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'paramedik', label: 'Paramedik' },
  { id: 'dokter', label: 'Dokter' },
  { id: 'pemilik', label: 'Pemilik' },
];

export default function LoginScreen() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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

    const handleLogin = async () => {
        if (!email || !password) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Email dan Password wajib diisi!', type: 'error', onConfirm: undefined });
            return;
        }

        setLoading(true);
        try {
            const response = await login(email, password);
            const userRoleFromDB = response.user.role;

            let isRoleMatch = false;
            // Logika: Jika pilih Admin, boleh login sebagai admin ATAU manajer
            if (selectedRole === 'admin' && (userRoleFromDB === 'admin' || userRoleFromDB === 'manajer')) {
                isRoleMatch = true;
            } else if (selectedRole === userRoleFromDB) {
                isRoleMatch = true;
            }

            if (!isRoleMatch) {
                setAlert({ visible: true, title: 'Akses Ditolak', message: `Akun Anda terdaftar sebagai "${userRoleFromDB}", bukan "${selectedRole}".`, type: 'error', onConfirm: undefined });
                return;
            }

            setAlert({ visible: true, title: 'Login Berhasil', message: `Selamat datang kembali, ${response.user.name}!`, type: 'success', onConfirm: () => router.replace('/(tabs)') });

        } catch (error: any) {
            const message = error.response?.data?.message || 'Terjadi kesalahan jaringan';
            setAlert({ visible: true, title: 'Login Gagal', message, type: 'error', onConfirm: undefined });
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

                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
                        <Text style={styles.backText}>← Kembali</Text>
                    </TouchableOpacity>

                    <Animated.View style={[styles.headerWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.logoIcon}>
                            <Text style={{ fontSize: 36 }}>🐾</Text>
                        </View>
                        <Text style={styles.title}>Florion Petcare</Text>
                        <Text style={styles.clinicSubtitle}>Praktek Dokter Hewan & Petshop</Text>
                        <Text style={styles.clinicLocation}>Sawahlunto, Sumatera Barat</Text>
                    </Animated.View>

                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.cardTitle}>Selamat Datang</Text>
                        <Text style={styles.cardSubtitle}>Silakan masuk sesuai dengan hak akses Anda.</Text>

                        {/* SEGMENTED CONTROL UNTUK ROLE */}
                        <View style={styles.roleContainer}>
                            {ROLES.map((role) => (
                                <TouchableOpacity
                                    key={role.id}
                                    style={[styles.roleTab, selectedRole === role.id && styles.roleTabActive]}
                                    onPress={() => setSelectedRole(role.id)}
                                >
                                    <Text
                                        style={[styles.roleTabText, selectedRole === role.id && styles.roleTabTextActive]}
                                        numberOfLines={1} // <-- Memastikan teks tidak turun baris
                                        adjustsFontSizeToFit // <-- Menyesuaikan ukuran font jika sempit
                                    >
                                        {role.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* INPUT EMAIL */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Alamat Email</Text>
                            <View style={styles.inputWrap}>
                                <Text style={styles.inputIcon}>✉️</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`email@${selectedRole === 'admin' ? 'admin' : selectedRole}.test`}
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* INPUT PASSWORD */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrap}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.btnWrap}>
                            <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.btnGradient}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Masuk ke Aplikasi</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={styles.footerWrap}>
                        <Text style={styles.footerText}>Pemilik baru? </Text>
                        <TouchableOpacity onPress={() => router.push('/register')}>
                            <Text style={styles.footerLink}>Daftar Sekarang</Text>
                        </TouchableOpacity>
                    </View>
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
    clinicSubtitle: { fontSize: 14, fontWeight: '700', color: '#0D9488' },
    clinicLocation: { fontSize: 12, color: '#6B7280', marginTop: 2 },

    card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 10 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 24 },

    roleContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 12, marginBottom: 24 },
    roleTab: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    roleTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    roleTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
    roleTabTextActive: { color: '#0D9488', fontWeight: '800' },

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, height: 54 },
    inputIcon: { fontSize: 16, marginRight: 12 },
    input: { flex: 1, fontSize: 14, color: '#111827', height: '100%' },
    eyeBtn: { padding: 8 },

    btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 8, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

    footerWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: '#6B7280', fontSize: 14 },
    footerLink: { color: '#0D9488', fontSize: 14, fontWeight: '800' },
});
