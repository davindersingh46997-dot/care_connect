const API_BASE = '/api';

async function fetchJson(url, options = {}) {
  const token = localStorage.getItem('careconnect_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.detail || data.error || data.message || `HTTP error ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${options.method || 'GET'} ${url}]:`, err);
    throw err;
  }
}

export const api = {
  chat: {
    send: (message) => fetchJson(`${API_BASE}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    }),
    stream: (message) => fetchJson(`${API_BASE}/chat/stream`, {
      method: 'POST',
      body: JSON.stringify({ message })
    })
  },

  // Health
  health: () => fetchJson(`${API_BASE}/health`),

  // AI Specialty Navigation
  ai: {
    classify: (prompt) =>
      fetchJson(`${API_BASE}/ai/specialty`, {
        method: 'POST',
        body: JSON.stringify({ prompt })
      })
  },

  // Doctors & Search
  doctors: {
    search: (params = {}) => {
      const query = new URLSearchParams();
      if (params.specialty && params.specialty !== 'All Specialties') query.append('specialty', params.specialty);
      if (params.lat !== undefined && params.lat !== null && params.lat !== '') query.append('lat', params.lat);
      if (params.lng !== undefined && params.lng !== null && params.lng !== '') query.append('lng', params.lng);
      if (params.latitude !== undefined && params.latitude !== null && params.latitude !== '') query.append('latitude', params.latitude);
      if (params.longitude !== undefined && params.longitude !== null && params.longitude !== '') query.append('longitude', params.longitude);
      if (params.priority) query.append('priority', params.priority);
      if (params.maxFee) query.append('maxFee', params.maxFee);
      if (params.maxDistance) query.append('maxDistance', params.maxDistance);
      if (params.onlyOpen) query.append('onlyOpen', params.onlyOpen);
      if (params.minRating) query.append('minRating', params.minRating);

      return fetchJson(`${API_BASE}/doctors/search?${query.toString()}`);
    },
    getAll: (specialty) => {
      const query = specialty && specialty !== 'All Specialties' ? `?specialty=${encodeURIComponent(specialty)}` : '';
      return fetchJson(`${API_BASE}/doctors${query}`);
    },
    getById: async (id) => {
      const response = await fetchJson(`${API_BASE}/doctors/${id}`);
      return response.doctor || response;
    },
    updateStatus: (id, clinic_status) =>
      fetchJson(`${API_BASE}/doctors/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: clinic_status.toLowerCase(),
          is_accepting: clinic_status === 'OPEN'
        })
      }),
    updateProfile: (id, data) =>
      fetchJson(`${API_BASE}/doctors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    getReviews: (id) => fetchJson(`${API_BASE}/doctors/${id}/reviews`),
    submitReview: (id, data) =>
      fetchJson(`${API_BASE}/doctors/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Digital Queue
  queue: {
    join: (data) =>
      fetchJson(`${API_BASE}/queue/join`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          doctor_id: data.doctor_id ?? data.doctorId
        })
      }),
    getDoctorQueue: () => fetchJson(`${API_BASE}/queue/doctor`),
    getPatientQueue: async () => {
      const response = await fetchJson(`${API_BASE}/queue/patient`);
      const activeQueue = response.active_queue ?? response.activeQueue;
      const doctor = activeQueue?.doctor;
      const normalizedActiveQueue = activeQueue ? {
        ...activeQueue,
        status: activeQueue.status?.toUpperCase(),
        doctor_id: activeQueue.doctor_id || doctor?.id,
        doctor_name: activeQueue.doctor_name || doctor?.name,
        doctor_specialty: activeQueue.doctor_specialty || doctor?.specialty,
        clinic_name: activeQueue.clinic_name || doctor?.clinic_name,
        clinic_address: activeQueue.clinic_address || doctor?.address,
        current_token_in_consultation: activeQueue.current_token_in_consultation ?? activeQueue.current_token
      } : null;
      return {
        ...response,
        has_active_queue: response.has_active_queue ?? response.hasActiveQueue,
        active_queue: normalizedActiveQueue,
        recent_visits: response.recent_visits ?? response.recentVisits
      };
    },
    callNext: (data = {}) =>
      fetchJson(`${API_BASE}/queue/call-next`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    complete: () =>
      fetchJson(`${API_BASE}/queue/complete`, {
        method: 'POST'
      }),
    skip: (data = {}) =>
      fetchJson(`${API_BASE}/queue/skip`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    leave: (data = {}) =>
      fetchJson(`${API_BASE}/queue/leave`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    resetDemo: () =>
      fetchJson(`${API_BASE}/queue/reset`, {
        method: 'POST'
      })
  },

  // Authentication
  auth: {
    login: (data) =>
      fetchJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    register: (data) => {
      const payload = { ...data };
      if (payload.role === 'doctor' || payload.role === 'DOCTOR') {
        return fetchJson(`${API_BASE}/doctors/register`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      return fetchJson(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    registerPatient: (data) =>
      fetchJson(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    registerDoctor: (data) =>
      fetchJson(`${API_BASE}/doctors/register`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    me: () => fetchJson(`${API_BASE}/auth/me`),
    logout: () =>
      fetchJson(`${API_BASE}/auth/logout`, {
        method: 'POST'
      })
  },

  // Patients
  patients: {
    getProfile: () => fetchJson(`${API_BASE}/patients/me`),
    updateProfile: (data) =>
      fetchJson(`${API_BASE}/patients/me`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  }
};

