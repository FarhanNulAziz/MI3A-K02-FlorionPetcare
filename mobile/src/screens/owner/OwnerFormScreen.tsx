import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../config/api';
import CustomAlert from '../../components/custom-alert';

export default function OwnerFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const isEdit = !!params.owner;
    const data = isEdit ? JSON.parse(params.owner as string) : {};

    const [name, setName] = useState(data.name || '');
    const [phone, setPhone] = useState(data.phone || '');
    const [email, setEmail] = useState(data.email || '');
    const [address, setAddress] = useState(data.address || '');
    const [loading, setLoading] = useState(false);

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

    const handleSave = async () => {
        if (!name || !phone || !email || !address) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Nama, No HP, Email, dan Alamat wajib diisi!', type: 'error', onConfirm: undefined });
            return;
        }

        if (!/^\d+$/.test(phone)) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Nomor HP hanya boleh berisi angka!', type: 'error', onConfirm: undefined });
            return;
        }

        setLoading(true);
        try {
            const payload = { name, phone, email, address };

            if (isEdit) {
                await api.put(`/owners/${data.id}`, payload);
            } else {
                await api.post('/owners', payload);
            }

            const successMsg = isEdit
                ? 'Data pemilik berhasil diperbarui.'
                : `Data berhasil disimpan!\n\nAkun login otomatis dibuat.\nEmail: ${email}\nPassword: pemilik123`;

            setAlert({ visible: true, title: 'Sukses', message: successMsg, type: 'success', onConfirm: () => router.back() });
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Terjadi kesalahan sistem';
            setAlert({ visible: true, title: 'Gagal', message: msg, type: 'error', onConfirm: undefined });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Kembali</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Edit Pemilik' : 'Tambah Pemilik'}</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    {!isEdit && (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                💡 Info: Akun login untuk Pemilik akan dibuat otomatis dengan password default <Text style={{fontWeight: 'bold'}}>pemilik123</Text>.
                            </Text>
                        </View>
                    )}

                    <Text style={styles.label}>Nama Lengkap *</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Contoh: Budi Santoso" placeholderTextColor="#9CA3AF" />

                    <Text style={styles.label}>No. HP *</Text>
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="08xxxxxxxxxx" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

                    <Text style={styles.label}>Email (Untuk Login) *</Text>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="budi@email.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />

                    <Text style={styles.label}>Alamat *</Text>
                    <TextInput style={[styles.input, styles.textarea]} value={address} onChangeText={setAddress} placeholder="Alamat lengkap..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} textAlignVertical="top" />

                    <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Simpan Data</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <CustomAlert
                visible={alert.visible} title={alert.title} message={alert.message} type={alert.type}
                onClose={() => setAlert({ ...alert, visible: false })} onConfirm={alert.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { padding: 24, paddingTop: 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { marginRight: 16 },
    backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    scroll: { padding: 24 },
    infoBox: { backgroundColor: '#E6F4F1', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#0D9488' },
    infoText: { fontSize: 13, color: '#0D9488', lineHeight: 20 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827' },
    textarea: { height: 90 },
    btnSave: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 32, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});
