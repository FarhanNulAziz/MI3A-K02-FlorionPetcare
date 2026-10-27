import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import { useFocusEffect } from "expo-router/react-navigation";
import { getServices, deleteService } from '../../services/serviceService';
import { useRouter } from 'expo-router';

export default function ServiceListScreen() {
    const router = useRouter()
    const [services, setServices] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadServices = async (keyword = '') => {
        setLoading(true);
        try {
            const response = await getServices(keyword);
            if (response.success) {
                setServices(response.data || []);
            } else {
                setServices([]);
            }
        } catch (error) {
            const message =
                error.response?.data?.message || 'Gagal memuat data layanan';
            Alert.alert('Error', message);
            setServices([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Refresh otomatis setiap halaman difokuskan (setelah tambah/edit)
    useFocusEffect(
        useCallback(() => {
            loadServices(search);
        }, [search])
    );

    const handleDelete = (id, name) => {
        Alert.alert(
            'Konfirmasi Hapus',
            `Hapus layanan "${name}"? Tindakan ini tidak dapat dibatalkan.`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await deleteService(id);
                            if (response.success) {
                                Alert.alert('Sukses', 'Layanan berhasil dihapus');
                                loadServices(search);
                            }
                        } catch (error) {
                            Alert.alert(
                                'Gagal',
                                error.response?.data?.message || 'Gagal menghapus layanan'
                            );
                        }
                    },
                },
            ]
        );
    };

    const formatRupiah = (value) => {
        const num = parseFloat(value) || 0;
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <Text style={styles.iconText}>💉</Text>
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.servicePrice}>{formatRupiah(item.price)}</Text>
                    {item.description ? (
                        <Text style={styles.serviceDesc} numberOfLines={2}>
                            {item.description}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.btn, styles.btnEdit]}
                    onPress={() => navigation.navigate('ServiceForm', { service: item })}
                >
                    <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btn, styles.btnDelete]}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Text style={styles.btnText}>Hapus</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari layanan..."
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            {loading && !refreshing ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#2AB3A6" />
                </View>
            ) : (
                <FlatList
                    data={services}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyTitle}>
                                {search ? 'Data tidak ditemukan' : 'Belum ada data layanan'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {search
                                    ? 'Coba kata kunci lain'
                                    : 'Tap tombol + untuk menambah layanan'}
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadServices(search);
                            }}
                            colors={['#2AB3A6']}
                        />
                    }
                />
            )}

            {/* FAB Tambah */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('ServiceForm')}
                activeOpacity={0.8}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: { fontSize: 16, marginRight: 8 },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1A1A1A',
    },
    clearIcon: {
        fontSize: 16,
        color: '#6B7280',
        paddingHorizontal: 6,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E6F7F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: { fontSize: 22 },
    cardBody: { flex: 1 },
    serviceName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    servicePrice: {
        fontSize: 14,
        color: '#2AB3A6',
        fontWeight: '700',
        marginTop: 2,
    },
    serviceDesc: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 6,
        lineHeight: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    btnEdit: { backgroundColor: '#2AB3A6' },
    btnDelete: { backgroundColor: '#EF4444' },
    btnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    empty: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    emptySub: { fontSize: 13, color: '#9CA3AF' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#2AB3A6',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#2AB3A6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: '300',
        marginTop: -3,
    },
});
