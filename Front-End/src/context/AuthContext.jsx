import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { saveToken, getToken, removeToken } from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
            // Verificar token
            verifyToken();
        } else {
            setLoading(false);
        }
    }, []);

    const verifyToken = async () => {
        try {
            const response = await api.get('/api/auth/verify');
            setUser(response.data.user);
        } catch (error) {
            removeToken();
            delete api.defaults.headers.Authorization;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/api/users/login', { email, password });
        const { token, user } = response.data;
        saveToken(token);
        api.defaults.headers.Authorization = `Bearer ${token}`;
        setUser(user);
        return user;
    };

    const register = async (userData) => {
        const response = await api.post('/api/users/register', userData);
        const { token, user } = response.data;
        saveToken(token);
        api.defaults.headers.Authorization = `Bearer ${token}`;
        setUser(user);
        return user;
    };

    const logout = () => {
        removeToken();
        delete api.defaults.headers.Authorization;
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};