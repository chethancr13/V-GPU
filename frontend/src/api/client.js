import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const api = {

    auth: {
        login: (creds) => apiClient.post('/auth/login', creds)
    },
    gpu: {
        getCatalog: () => apiClient.get('/gpu/catalog'),
        getFleet: () => apiClient.get('/gpu/fleet'),
        allocate: (payload) => apiClient.post('/gpu/allocate', payload),
        release: (id) => apiClient.delete(`/gpu/release/${id}`)
    },
    data: {
        listDatasets: () => apiClient.get('/api/datasets'),
        uploadDataset: (formData) => apiClient.post('/api/datasets/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        listScripts: () => apiClient.get('/api/scripts')
    },
    jobs: {
        list: () => apiClient.get('/jobs'),
        submit: (payload) => apiClient.post('/jobs/submit', payload),
        get: (id) => apiClient.get(`/jobs/${id}`),
        kill: (id) => apiClient.delete(`/jobs/${id}/kill`)
    },
    metrics: {
        realtime: () => apiClient.get('/metrics/realtime')
    }
};
