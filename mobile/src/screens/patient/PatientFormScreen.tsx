import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, SafeAreaView, Modal, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../config/api';
import { getUser } from '../../utils/storage';
import CustomAlert from '../../components/custom-alert'; // Sesuaikan dengan nama file kalian

const SPECIES_OPTIONS = ['Anjing', 'Kucing', 'Kelinci', 'Lainnya'];
const GENDER_OPTIONS = ['Jantan', 'Betina'];

export default function PatientFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const isEdit = !!params.patient;
    let data: any = {};
    if (isEdit) {
        try { data = JSON.parse(params.patient as string); } catch (e) {}
    }

    // State User
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true); // Set true di awal

    const [name, setName] = useState(data.name || '');
    const [species, setSpecies] = useState(data.species || 'Anjing');
    const [gender, setGender] = useState(data.gender || 'Jantan');
    const [ownerId, setOwnerId] = useState(data.owner_id || null);
    const [ownerName, setOwnerName] = useState(data.owner?.name || '');
    const [age, setAge] = useState(data.age ? String(data.age) : '');
    const [weight, setWeight] = useState(data.weight ? String(data.weight) : '');

    const [owners, setOwners] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const [ownerModal, setOwnerModal] = useState(false);
    const [speciesModal, setSpeciesModal] = useState(false);
    const [genderModal, setGenderModal] = useState(false);

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

    useEffect(() => {
        const initData = async () => {
            try {
                const currentUser = await getUser();
                setUser(currentUser || { role: 'admin' });

                // Hanya fetch data pemilik jika yang login BUKAN pemilik
                if (currentUser?.role !== 'pemilik') {
                    const res = await api.get('/owners');
                    if (res.data.success) setOwners(res.data.data);
                }
            } catch (error) {
                console.log("Error init:", error);
                setUser({ role: 'admin' });
            } finally {
                setLoading(false); // Selesai loading
            }
        };
        initData();
    }, []);

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/pasien');
    };

    const handleSave = async () => {
        if (user?.role !== 'pemilik' && !ownerId) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Pemilik wajib dipilih!', type: 'error', onConfirm: undefined });
            return;
        }

        if (!name || !age || !weight) {
            setAlert({ visible: true, title: 'Validasi Gagal', message: 'Nama hewan, Umur, dan Berat wajib diisi!', type: 'error', onConfirm: undefined });
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = {
                name,
                species,
                gender,
                age: parseInt(age),
                weight: parseFloat(weight),
                breed: '-'
            };

            if (user?.role !== 'pemilik') {
                payload.owner_id = ownerId;
            }

            if (isEdit) {
                await api.put(`/patients/${data.id}`, payload);
            } else {
                await api.post('/patients', payload);
            }

            setAlert({ visible: true, title: 'Sukses', message: 'Data pasien berhasil disimpan.', type: 'success', onConfirm: handleBack });
        } catch (error: any) {
            let msg = error.response?.data?.message || 'Terjadi kesalahan sistem';
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                msg = Array.isArray(firstError) ? firstError[0] : firstError;
            }
            setAlert({ visible: true, title: 'Gagal', message: msg, type: 'error', onConfirm: undefined });
        } finally {
            setIsSaving(false);
        }
    };

    // PENGAMAN: Tampilkan loading sebentar jika data belum siap
    if (loading || !user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Kembali</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Edit Pasien' : 'Tambah Pasien'}</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text style={styles.label}>Nama Hewan *</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Contoh: Milo" placeholderTextColor="#9CA3AF" />

                    {user?.role !== 'pemilik' && (
                        <>
                            <Text style={styles.label}>Pilih Pemilik *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setOwnerModal(true)}>
                                <Text style={{ color: ownerId ? '#111827' : '#9CA3AF' }}>
                                    {ownerId ? ownerName : '-- Ketuk untuk memilih pemilik --'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Umur (Bulan) *</Text>
                            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Contoh: 12" keyboardType="numeric" placeholderTextColor="#9CA3AF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Berat (Kg) *</Text>
                            <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="Contoh: 4.5" keyboardType="numeric" placeholderTextColor="#9CA3AF" />
                        </View>
                    </View>

                    <Text style={styles.label}>Jenis Hewan</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setSpeciesModal(true)}>
                        <Text style={{ color: '#111827' }}>{species}</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Jenis Kelamin</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setGenderModal(true)}>
                        <Text style={{ color: '#111827' }}>{gender}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Simpan Data</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal Pemilik */}
            {user?.role !== 'pemilik' && (
                <Modal visible={ownerModal} animationType="slide" transparent={true}>
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
                                        setOwnerModal(false);
                                    }}>
                                        <Text style={styles.modalItemText}>{item.name} - {item.phone}</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>Belum ada data pemilik</Text>}
                            />
                            <TouchableOpacity style={styles.modalClose} onPress={() => setOwnerModal(false)}>
                                <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Tutup</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal Jenis Hewan */}
            <Modal visible={speciesModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Pilih Jenis Hewan</Text>
                        <FlatList
                            data={SPECIES_OPTIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => {
                                    setSpecies(item);
                                    setSpeciesModal(false);
                                }}>
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSpeciesModal(false)}>
                            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Jenis Kelamin */}
            <Modal visible={genderModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Pilih Jenis Kelamin</Text>
                        <FlatList
                            data={GENDER_OPTIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => {
                                    setGender(item);
                                    setGenderModal(false);
                                }}>
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setGenderModal(false)}>
                            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
    btnSave: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 32, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemText: { fontSize: 15, color: '#374151' },
    modalClose: { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#FEE2E2', borderRadius: 12 },
});
