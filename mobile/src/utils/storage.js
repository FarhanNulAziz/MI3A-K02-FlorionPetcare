import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveSession = async (token, user) => {
    try {
        await AsyncStorage.setItem('access_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
    } catch (error) {
        console.log('Error saving session:', error);
    }
};

export const getToken = async () => {
    return await AsyncStorage.getItem('access_token');
};

export const getUser = async () => {
    const data = await AsyncStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
};

export const clearSession = async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user_data');
};
