import api from '../config/api';

export const getServices = async (search = '') => {
    const params = search ? { search } : {};
    const response = await api.get('/services', { params });
    return response.data;
};

export const getServiceDetail = async (id) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
};

export const createService = async (payload) => {
    const response = await api.post('/services', payload);
    return response.data;
};

export const updateService = async (id, payload) => {
    const response = await api.put(`/services/${id}`, payload);
    return response.data;
};

export const deleteService = async (id) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
};
