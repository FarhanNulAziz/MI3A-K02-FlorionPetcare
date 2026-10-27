import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../services/authService';
import CustomAlert from '../components/custom-alert';

const ROLES = [
  { id: 'admin', label: 'Admin / Manajer' },
  { id: 'paramedik', label: 'Paramedik' },
  { id: 'dokter', label: 'Dokter' },
  { id: 'pemilik', label: 'Pemilik Hewan' },
];

export default function LoginScreen() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

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
            <View style={styles.blob1} pointerEvents="none" />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
                        <Text style={styles.backText}>← Kembali</Text>
                    </TouchableOpacity>

                    <View style={styles.headerWrap}>
                        <View style={styles.logoIcon}><Text style={{ fontSize: 32 }}>🐾</Text></View>
                        <Text style={styles.title}>Selamat Datang</Text>
                        <Text style={styles.subtitle}>Pilih tipe akun dan masuk</Text>
                    </View>

                    <View style={styles.roleTabs}>
                        {ROLES.map((role) => (
                            <TouchableOpacity
                                key={role.id}
                                style={[styles.roleTab, selectedRole === role.id && styles.roleTabActive]}
                                onPress={() => setSelectedRole(role.id)}
                            >
                                <Text style={[styles.roleTabText, selectedRole === role.id && styles.roleTabTextActive]}>
                                    {role.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Alamat Email</Text>
                            <TextInput style={styles.input} placeholder={`email@${selectedRole}.test`} placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordWrap}>
                                <TextInput style={styles.inputPassword} placeholder="••••••••" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Text>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.btnWrap}>
                            <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.btnGradient}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Masuk</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

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
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    blob1: { position: 'absolute', top: -50, right: -50, width: 300, height: 300, backgroundColor: '#E6F4F1', borderRadius: 150, opacity: 0.8 },
    scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center', maxWidth: 500, alignSelf: 'center', width: '100%' },
    backButton: { marginBottom: 20, alignSelf: 'flex-start' },
    backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
    headerWrap: { alignItems: 'center', marginBottom: 24 },
    logoIcon: { width: 64, height: 64, backgroundColor: '#FFF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6B7280' },
    roleTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
    roleTab: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    roleTabActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
    roleTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    roleTabTextActive: { color: '#FFF' },
    card: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 14, color: '#111827' },
    passwordWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 52 },
    inputPassword: { flex: 1, paddingHorizontal: 16, fontSize: 14, color: '#111827' },
    eyeIcon: { padding: 16 },
    btnWrap: { borderRadius: 14, overflow: 'hidden', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    footerWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: '#6B7280', fontSize: 14 },
    footerLink: { color: '#0D9488', fontSize: 14, fontWeight: 'bold' },
});
