import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('careconnect_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [doctorInfo, setDoctorInfo] = useState(() => {
    const saved = localStorage.getItem('careconnect_doctor');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  const role = user?.role?.toUpperCase() || '';

  const refreshUser = async () => {
    const token = localStorage.getItem('careconnect_token');
    if (!token) {
      setUser(null);
      setDoctorInfo(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        age: data.age,
        phone: data.phone,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude
      });

      if (data.doctor) {
        setDoctorInfo(data.doctor);
        localStorage.setItem('careconnect_doctor', JSON.stringify(data.doctor));
      } else {
        setDoctorInfo(null);
        localStorage.removeItem('careconnect_doctor');
      }

      localStorage.setItem('careconnect_user', JSON.stringify(data));
    } catch (err) {
      console.warn('Auth check failed:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginUser = (token, userData, doctorData = null) => {
    if (token) {
      localStorage.setItem('careconnect_token', token);
    }
    setUser(userData);
    localStorage.setItem('careconnect_user', JSON.stringify(userData));

    if (doctorData) {
      setDoctorInfo(doctorData);
      localStorage.setItem('careconnect_doctor', JSON.stringify(doctorData));
    } else if (userData?.doctor) {
      setDoctorInfo(userData.doctor);
      localStorage.setItem('careconnect_doctor', JSON.stringify(userData.doctor));
    } else {
      setDoctorInfo(null);
      localStorage.removeItem('careconnect_doctor');
    }
  };

  const logout = () => {
    localStorage.removeItem('careconnect_token');
    localStorage.removeItem('careconnect_user');
    localStorage.removeItem('careconnect_doctor');
    setUser(null);
    setDoctorInfo(null);
    api.auth.logout().catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        doctorInfo,
        loading,
        loginUser,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isDoctor: role === 'DOCTOR',
        isPatient: role === 'PATIENT'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

