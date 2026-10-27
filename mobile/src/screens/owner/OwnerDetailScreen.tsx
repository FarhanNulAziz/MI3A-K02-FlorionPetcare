import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../config/api';

export default function OwnerDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const owner = JSON.parse(params.owner as string);

    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPets = async () => {
            try {
                // Ambil semua pasien, lalu filter berdasarkan owner_id
                const res = await api.get('/patients');
                if (res.data.success) {
                    const myPets = res.data.data.filter((p: any) => p.owner_id === owner.id);
                    setPets(myPets);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        fetchPets();
    }, [owner.id]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Kembali</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detail Pemilik</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{owner.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.name}>{owner.name}</Text>
                    <Text style={styles.phone}>{owner.phone}</Text>
                    <Text style={styles.address}>{owner.address}</Text>
                </View>

                <Text style={styles.sectionTitle}>Hewan Peliharaan ({pets.length})</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 20 }} />
                ) : pets.length === 0 ? (
                    <Text style={styles.emptyText}>Belum ada hewan yang terdaftar atas nama pemilik ini.</Text>
                ) : (
                    pets.map((pet: any) => (
                        <View key={pet.id} style={styles.petCard}>
                            <View style={styles.petIcon}><Text style={{ fontSize: 24 }}>🐾</Text></View>
                            <View>
                                <Text style={styles.petName}>{pet.name}</Text>
                                <Text style={styles.petInfo}>{pet.species} • {pet.gender}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
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
    profileCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    avatarText: { fontSize: 32, fontWeight: 'bold', color: '#0D9488' },
    name: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    phone: { fontSize: 14, color: '#0D9488', fontWeight: '600', marginTop: 4 },
    address: { fontSize: 13, color: '#6B7280', marginTop: 8, textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
    petCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    petIcon: { width: 48, height: 48, backgroundColor: '#F9FAFB', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    petName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    petInfo: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    emptyText: { color: '#6B7280', fontStyle: 'italic' }
});
