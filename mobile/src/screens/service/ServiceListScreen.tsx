import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../config/api';
import CustomAlert from '../../components/custom-alert';

export default function ServiceListScreen() {
    const router = useRouter();
    const [services, setServices] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any, loading: false });

    const loadServices = async (keyword = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/services${keyword ? `?search=${keyword}` : ''}`);
            if (res.data.success) setServices(res.data.data || []);
        } catch (error) {
            setAlert({ visible: true, title: 'Error', message: 'Gagal memuat data layanan', type: 'error', onConfirm: undefined, loading: false });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadServices(search);
        }, [search])
    );

    const handleDeleteClick = (id: number, name: string) => {
        setAlert({
            visible: true, title: 'Konfirmasi Hapus', message: `Apakah Anda yakin ingin menghapus layanan "${name}"?`,
            type: 'confirm', loading: false,
            onConfirm: () => eksekusiHapus(id)
        });
    };

    const eksekusiHapus = async (id: number) => {
        setAlert(prev => ({ ...prev, loading: true }));
        try {
            const res = await api.delete(`/services/${id}`);
            if (res.data.success) {
                setAlert({ visible: true, title: 'Sukses', message: 'Layanan berhasil dihapus.', type: 'success', onConfirm: undefined, loading: false });
                loadServices(search);
            }
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Tidak dapat menghapus data.';
            setAlert({ visible: true, title: 'Gagal Menghapus', message: msg, type: 'error', onConfirm: undefined, loading: false });
        }
    };

    const formatRupiah = (price: any) => {
        const num = parseFloat(price);
        if (num === 0) return 'Relatif / Sesuai Tindakan';
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardClickArea}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>💉</Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.title}>{item.name}</Text>
                        <Text style={styles.subtitle}>{formatRupiah(item.price)}</Text>
                    </View>
                </View>
                {item.description ? (
                    <View style={styles.cardBody}>
                        <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.actionsWrapper}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/service-form', params: { service: JSON.stringify(item) } })}>
                    <Text style={styles.actionEdit}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteClick(item.id, item.name)}>
                    <Text style={styles.actionDelete}>Hapus</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Master Layanan</Text>
            </View>

            <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari nama layanan..."
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={services}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>Belum ada data layanan</Text>}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/service-form')}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <CustomAlert
                visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} loading={alert.loading}
                onClose={() => setAlert({ ...alert, visible: false })} onConfirm={alert.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, marginHorizontal: 24, marginBottom: 16 },
    searchIcon: { fontSize: 14, marginRight: 12, color: '#9CA3AF' },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
    card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
    cardClickArea: { padding: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 24 },
    cardInfo: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 13, fontWeight: '600', color: '#0D9488', marginTop: 2 },
    cardBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    descText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
    actionsWrapper: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FAFAFA', zIndex: 10 },
    actionBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    actionEdit: { fontSize: 14, fontWeight: 'bold', color: '#0D9488' },
    actionDelete: { fontSize: 14, fontWeight: 'bold', color: '#EF4444' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, backgroundColor: '#0D9488', borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
    fabText: { color: '#FFFFFF', fontSize: 30, fontWeight: '300', marginTop: -2 },
});
