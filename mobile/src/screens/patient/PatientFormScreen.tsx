import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, SafeAreaView, Modal, FlatList, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../config/api';

export default function PatientFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Cek apakah sedang Edit (ada parameter patient) atau Tambah baru
    const isEdit = !!params.patient;
    const data = isEdit ? JSON.parse(params.patient as string) : {};

    const [name, setName] = useState(data.name || '');
    const [species, setSpecies] = useState(data.species || 'anjing');
    const [gender, setGender] = useState(data.gender || 'jantan');
    const [ownerId, setOwnerId] = useState(data.owner_id || null);
    const [ownerName, setOwnerName] = useState(data.owner?.name || '');

    const [owners, setOwners] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Ambil data pemilik untuk dropdown
        const fetchOwners = async () => {
            try {
                const res = await api.get('/owners');
                if (res.data.success) setOwners(res.data.data);
            } catch (e) {
                console.log('Gagal ambil data pemilik', e);
            }
        };
        fetchOwners();
    }, []);

    const handleSave = async () => {
        if (!name || !ownerId) {
            const msg = 'Nama hewan dan Pemilik wajib diisi!';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Validasi', msg);
            return;
        }

        setLoading(true);
        try {
            // Sesuaikan payload dengan kolom di database Laravel kalian
            const payload = {
                name,
                species,
                gender,
                owner_id: ownerId,
                breed: '-',
                weight_kg: 0,
                age_month: 0
            };

            if (isEdit) {
                await api.put(`/patients/${data.id}`, payload);
            } else {
                await api.post('/patients', payload);
            }

            if (Platform.OS === 'web') {
                window.alert('Data pasien berhasil disimpan!');
                router.back();
            } else {
                Alert.alert('Sukses', 'Data berhasil disimpan', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Terjadi kesalahan sistem';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Gagal', msg);
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
                <Text style={styles.headerTitle}>{isEdit ? 'Edit Pasien' : 'Tambah Pasien'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>Nama Hewan *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Contoh: Milo" placeholderTextColor="#9CA3AF" />

                <Text style={styles.label}>Pilih Pemilik *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
                    <Text style={{ color: ownerId ? '#111827' : '#9CA3AF' }}>
                        {ownerId ? ownerName : '-- Ketuk untuk memilih pemilik --'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Jenis Hewan</Text>
                <TextInput style={styles.input} value={species} onChangeText={setSpecies} placeholder="anjing / kucing / dll" placeholderTextColor="#9CA3AF" />

                <Text style={styles.label}>Jenis Kelamin</Text>
                <TextInput style={styles.input} value={gender} onChangeText={setGender} placeholder="jantan / betina" placeholderTextColor="#9CA3AF" />

                <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Simpan Data</Text>}
                </TouchableOpacity>
            </ScrollView>

            {/* Modal Dropdown Pemilik */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Pilih Pemilik</Text>
                        <FlatList
                            data={owners}
                            keyExtractor={(item: any) => item.id.toString()}
                            renderItem={({ item }: { item: any }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => {
                                    setOwnerId(item.id);
                                    setOwnerName(item.name);
                                    setModalVisible(false);
                                }}>
                                    <Text style={styles.modalItemText}>{item.name} - {item.phone}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>Belum ada data pemilik</Text>}
                        />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
                            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    btnSave: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 32, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemText: { fontSize: 15, color: '#374151' },
    modalClose: { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#FEE2E2', borderRadius: 12 },
});
