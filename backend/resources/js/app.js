import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

// Import Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import ServiceListScreen from './src/screens/service/ServiceListScreen';
import OwnerListScreen from './src/screens/owner/OwnerListScreen';
import PatientListScreen from './src/screens/patient/PatientListScreen';
// (Import Screen Beranda dan Profil kalian di sini)

import { getToken } from './src/utils/storage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Halaman Tab Utama (Setelah Login)
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#0D9488',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: { height: 60, paddingBottom: 10 }
            }}
        >
            {/* Contoh Tab, sesuaikan dengan komponen kalian */}
            <Tab.Screen name="Beranda" component={() => <View><Text>Beranda</Text></View>} />
            <Tab.Screen name="Pemilik" component={OwnerListScreen} />
            <Tab.Screen name="Pasien" component={PatientListScreen} />
            <Tab.Screen name="Layanan" component={ServiceListScreen} />
            <Tab.Screen name="Profil" component={() => <View><Text>Profil</Text></View>} />
        </Tab.Navigator>
    );
}

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Cek token saat aplikasi pertama kali dibuka
        const checkLogin = async () => {
            const token = await getToken();
            setIsLoggedIn(!!token); // true jika token ada
            setIsLoading(false);
        };
        checkLogin();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isLoggedIn ? (
                    // Jika sudah login
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                ) : (
                    // Jika belum login
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
