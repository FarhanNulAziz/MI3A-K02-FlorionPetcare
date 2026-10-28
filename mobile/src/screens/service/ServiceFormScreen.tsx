import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../config/api';
import CustomAlert from '../../components/custom-alert'; // Pastikan namanya benar

export default function ServiceFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Cek apakah sedang Edit (ada parameter service) atau Tambah baru
    const isEdit = !!params.service;
    let data: any = {};

    // Gunakan try-catch agar tidak crash jika data dari URL tidak valid
    if (isEdit) {
        try {
            data = JSON.parse(params.service as string);
        } catch (e) {
            console.log("Gagal parse data layanan", e);
        }
    }

    const [name, setName] = useState(data.name || '');
    const [price, setPrice] = useState(data.price ? String(data.price) : '');
    const [description, setDescription] = useState(data.description || '');
    const [loading, setLoading] = useState(false);

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

    // Pengaman navigasi (Anti GO_BACK error)
    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/layanan');
        }
    };

    const handleSave = async () => {
        if (!name || price === '') {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Nama Layanan dan Harga wajib diisi!', type: 'error', onConfirm: undefined });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                price: parseFloat(price),
                description: description || null
            };

            if (isEdit) {
                await api.put(`/services/${data.id}`, payload);
            } else {
                await api.post('/services', payload);
            }

            setAlert({ visible: true, title: 'Sukses', message: 'Data layanan berhasil disimpan.', type: 'success', onConfirm: handleBack });
        } catch (error: any) {
            let msg = error.response?.data?.message || 'Terjadi kesalahan sistem';
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                msg = Array.isArray(firstError) ? firstError[0] : firstError;
            }
            setAlert({ visible: true, title: 'Gagal', message: msg, type: 'error', onConfirm: undefined });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Kembali</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Edit Layanan' : 'Tambah Layanan'}</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text style={styles.label}>Nama Layanan *</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Contoh: Grooming - Mandi Sehat" placeholderTextColor="#9CA3AF" />

                    <Text style={styles.label}>Harga (Rp) *</Text>
                    <TextInput
                        style={styles.input}
                        value={price}
                        onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
                        placeholder="Ketik 0 jika harga relatif"
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                    />
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        *Isi angka 0 jika harga tidak pasti (Relatif).
                    </Text>

                    <Text style={styles.label}>Deskripsi (Opsional)</Text>
                    <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Keterangan singkat..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} textAlignVertical="top" />

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
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#111827' },
    textarea: { height: 90 },
    btnSave: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 32, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
