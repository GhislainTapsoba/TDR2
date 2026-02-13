'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';

interface User {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, name: string, password: string, phone: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load user from sessionStorage on mount
        const storedToken = sessionStorage.getItem('token');
        const storedUser = sessionStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }

        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authAPI.login(email, password);
        const { token, user } = response.data;

        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));

        setToken(token);
        setUser(user);
    };

    const register = async (email: string, name: string, password: string, phone: string) => {
        const response = await authAPI.register(email, name, password, phone);
        const { token, user } = response.data;

        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));

        setToken(token);
        setUser(user);
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
