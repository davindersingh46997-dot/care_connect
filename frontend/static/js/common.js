// Care Connect - Common Utilities & Auth Navigation Guard

async function initNavbarAuth() {
  const authNav = document.getElementById("navbar-auth-section");
  const mobileAuthNav = document.getElementById("mobile-navbar-auth-section");
  if (!authNav) return;

  const token = CareConnectAPI.getToken();
  if (!token) {
    renderUnauthenticatedNav(authNav, mobileAuthNav);
    return;
  }

  try {
    const user = await CareConnectAPI.auth.me();
    renderAuthenticatedNav(authNav, mobileAuthNav, user);
  } catch (err) {
    CareConnectAPI.removeToken();
    renderUnauthenticatedNav(authNav, mobileAuthNav);
  }
}

function renderUnauthenticatedNav(desktopEl, mobileEl) {
  const html = `
    <div class="flex items-center gap-2">
      <a href="/login" class="px-4 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 transition-colors">
        Log In
      </a>
      <a href="/signup" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all">
        Sign Up
      </a>
    </div>
  `;
  if (desktopEl) desktopEl.innerHTML = html;
  if (mobileEl) {
    mobileEl.innerHTML = `
      <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
        <a href="/login" class="block w-full text-center py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl">Log In</a>
        <a href="/signup" class="block w-full text-center py-2 text-xs font-bold text-white bg-teal-600 rounded-xl">Sign Up</a>
      </div>
    `;
  }
}

function renderAuthenticatedNav(desktopEl, mobileEl, user) {
  let dashboardHref = "/patient/dashboard";
  let dashboardLabel = "Patient Dashboard";

  if (user.role === "DOCTOR") {
    dashboardHref = "/doctor/dashboard";
    dashboardLabel = "Doctor Workspace";
  }

  const html = `
    <div class="flex items-center gap-3">
      <span class="text-xs font-semibold text-slate-600 hidden lg:inline">
        Hello, <strong class="text-slate-900">${user.name}</strong>
      </span>
      <a href="${dashboardHref}" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors">
        <span>${dashboardLabel}</span>
      </a>
      <button onclick="CareConnectAPI.auth.logout()" class="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
        Log Out
      </button>
    </div>
  `;
  if (desktopEl) desktopEl.innerHTML = html;
  if (mobileEl) {
    mobileEl.innerHTML = `
      <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
        <div class="text-xs font-bold text-slate-900 px-1">Signed in as ${user.name} (${user.role})</div>
        <a href="${dashboardHref}" class="block w-full text-center py-2 text-xs font-bold text-white bg-teal-600 rounded-xl">${dashboardLabel}</a>
        <button onclick="CareConnectAPI.auth.logout()" class="block w-full text-center py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl">Log Out</button>
      </div>
    `;
  }
}

// Browser Geolocation Helper
function getUserCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, granted: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          granted: true
        });
      },
      (err) => {
        console.warn("Location permission not granted; distance sorting is unavailable.");
        resolve({ latitude: null, longitude: null, granted: false });
      },
      { timeout: 5000 }
    );
  });
}

// Toast Notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  const isError = type === "error";
  const isSuccess = type === "success";

  toast.className = `p-3.5 rounded-2xl shadow-xl text-xs font-bold flex items-center justify-between gap-3 border transition-all transform duration-200 animate-in fade-in slide-in-from-top ${
    isError
      ? "bg-rose-50 border-rose-200 text-rose-900"
      : isSuccess
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : "bg-slate-900 text-white border-slate-800"
  }`;

  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="opacity-60 hover:opacity-100 p-1">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.className = "fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full";
  document.body.appendChild(container);
  return container;
}

// Emergency Warning Modal
function showEmergencyTriageModal(reasoning) {
  const modal = document.createElement("div");
  modal.id = "emergency-modal-overlay";
  modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in";
  modal.innerHTML = `
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-red-500 relative">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl animate-urgent-glow">
          🚨
        </div>
        <div>
          <h3 className="text-lg font-black text-red-700">Urgent Medical Warning</h3>
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency Triage Alert</p>
        </div>
      </div>

      <div class="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-xs text-red-900 space-y-1.5 leading-relaxed">
        <strong class="block text-red-950 text-sm">This may require urgent medical attention.</strong>
        <p>${reasoning || "If you believe this is an emergency, seek immediate medical care or contact local emergency services. Care Connect is for healthcare navigation only and does not diagnose acute emergencies."}</p>
      </div>

      <div class="space-y-2.5">
        <a href="tel:112" class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors">
          📞 Call Emergency Services (112 / 911)
        </a>
        <a href="https://www.google.com/maps/search/emergency+hospital+near+me" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors border border-slate-200">
          📍 Find Nearest Emergency Room on Maps
        </a>
        <button onclick="document.getElementById('emergency-modal-overlay').remove()" class="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          I understand, return to navigation
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("careconnect_theme", isDark ? "dark" : "light");
      themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    });
  }
  initNavbarAuth();
});
