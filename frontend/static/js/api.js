// Care Connect - Centralized API Service Layer

const CareConnectAPI = {
  TOKEN_KEY: "careconnect_token",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  },

  removeToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes("/api/auth/login")) {
          // Token expired or invalid
          this.removeToken();
        }
        const errorMsg = data.detail || data.error || `HTTP Error ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  auth: {
    register: (data) => CareConnectAPI.request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data) => CareConnectAPI.request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => CareConnectAPI.request("/api/auth/me"),
    logout: () => {
      CareConnectAPI.removeToken();
      window.location.href = "/";
    }
  },

  // AI Specialty Navigation
  ai: {
    classify: (prompt) => CareConnectAPI.request("/api/ai/specialty", { method: "POST", body: JSON.stringify({ prompt }) })
  },

  // Doctor Endpoints
  doctors: {
    search: (params = {}) => {
      const q = new URLSearchParams();
      if (params.specialty) q.append("specialty", params.specialty);
      if (params.lat) q.append("lat", params.lat);
      if (params.lng) q.append("lng", params.lng);
      if (params.priority) q.append("priority", params.priority);
      if (params.maxFee) q.append("maxFee", params.maxFee);
      if (params.maxDistance) q.append("maxDistance", params.maxDistance);
      if (params.onlyOpen) q.append("onlyOpen", "true");
      if (params.minRating) q.append("minRating", params.minRating);
      return CareConnectAPI.request(`/api/doctors/search?${q.toString()}`);
    },
    getById: (id) => CareConnectAPI.request(`/api/doctors/${id}`),
    register: (data) => CareConnectAPI.request("/api/doctors/register", { method: "POST", body: JSON.stringify(data) }),
    updateProfile: (id, data) => CareConnectAPI.request(`/api/doctors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    updateAvailability: (id, clinic_status) =>
      CareConnectAPI.request(`/api/doctors/${id}/availability`, { method: "PATCH", body: JSON.stringify({ clinic_status }) })
  },

  // Queue Endpoints
  queue: {
    join: (data) => CareConnectAPI.request("/api/queue/join", { method: "POST", body: JSON.stringify(data) }),
    getPatientQueue: () => CareConnectAPI.request("/api/queue/patient"),
    getDoctorQueue: (doctorId) => CareConnectAPI.request(`/api/queue/doctor/${doctorId}`),
    callNext: () => CareConnectAPI.request("/api/queue/call-next", { method: "POST" }),
    complete: () => CareConnectAPI.request("/api/queue/complete", { method: "POST" }),
    skip: (data = {}) => CareConnectAPI.request("/api/queue/skip", { method: "POST", body: JSON.stringify(data) }),
    leave: () => CareConnectAPI.request("/api/queue/leave", { method: "POST" })
  },

  // Admin Endpoints
  admin: {
    getPendingDoctors: () => CareConnectAPI.request("/api/admin/doctors/pending"),
    getAllDoctors: () => CareConnectAPI.request("/api/admin/doctors"),
    approveDoctor: (id) => CareConnectAPI.request(`/api/admin/doctors/${id}/approve`, { method: "POST" }),
    rejectDoctor: (id) => CareConnectAPI.request(`/api/admin/doctors/${id}/reject`, { method: "POST" }),
    suspendDoctor: (id) => CareConnectAPI.request(`/api/admin/doctors/${id}/suspend`, { method: "POST" })
  },

  // Reviews
  reviews: {
    getDoctorReviews: (doctorId) => CareConnectAPI.request(`/api/doctors/${doctorId}/reviews`),
    submitReview: (doctorId, data) => CareConnectAPI.request(`/api/doctors/${doctorId}/reviews`, { method: "POST", body: JSON.stringify(data) })
  },

  // Patients
  patients: {
    getProfile: () => CareConnectAPI.request("/api/patients/me"),
    updateProfile: (data) => CareConnectAPI.request("/api/patients/me", { method: "PATCH", body: JSON.stringify(data) })
  }
};

window.CareConnectAPI = CareConnectAPI;
