import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../config/api';

export default function PatientListScreen() {
    const router = useRouter();
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const loadPatients = async (keyword = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/patients${keyword ? `?search=${keyword}` : ''}`);
            if (res.data.success) setPatients(res.data.data || []);
        } catch (error) {
            Alert.alert('Error', 'Gagal memuat data pasien');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadPatients(search);
        }, [search])
    );

    const handleDelete = (id: number, name: string) => {
        Alert.alert('Konfirmasi', `Hapus data pasien "${name}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/patients/${id}`);
                    Alert.alert('Sukses', 'Data pasien dihapus');
                    loadPatients(search);
                } catch (e) {
                    Alert.alert('Gagal', 'Tidak dapat menghapus data');
                }
            }}
        ]);
    };

    // Fungsi untuk menentukan emoji berdasarkan jenis hewan
    const getSpeciesEmoji = (species: string) => {
        const s = species?.toLowerCase() || '';
        if (s.includes('anjing')) return '🐶';
        if (s.includes('kucing')) return '🐱';
        if (s.includes('kelinci')) return '🐰';
        if (s.includes('burung')) return '🐦';
        return '🐾';
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getSpeciesEmoji(item.species)}</Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.title}>{item.name}</Text>
                    <Text style={styles.subtitle}>
                        {item.species} {item.gender ? `• ${item.gender}` : ''}
                    </Text>
                </View>
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.ownerText}>Pemilik: {item.owner?.name || '-'}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/patient-form' as never, params: { patient: JSON.stringify(item) } })}>
                        <Text style={styles.actionEdit}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                        <Text style={styles.actionDelete}>Hapus</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Data Pasien</Text>
            </View>

            <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari nama hewan..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={patients}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>Belum ada data pasien</Text>}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/patient-form' as never, params: {} })}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
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
    card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12, marginBottom: 12 },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 24 },
    cardInfo: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginTop: 2 },
    cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ownerText: { fontSize: 12, color: '#0D9488', fontWeight: '600', flex: 1 },
    actions: { flexDirection: 'row', gap: 16 },
    actionEdit: { fontSize: 13, fontWeight: 'bold', color: '#0D9488' },
    actionDelete: { fontSize: 13, fontWeight: 'bold', color: '#EF4444' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, backgroundColor: '#0D9488', borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
    fabText: { color: '#FFFFFF', fontSize: 30, fontWeight: '300', marginTop: -2 },
});
