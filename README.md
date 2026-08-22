# Care Connect — Real-time Local Healthcare Access & Queue-Management Platform

> **"Know where to go. Know when to go."**

Care Connect connects patients with suitable nearby healthcare providers and gives them full visibility into real-time availability and waiting times, while giving local clinics a simple, zero-hardware digital queue-management system.

---

## 1. The Core Problem & Product Vision

### The Problem
Existing platforms and Google Maps help users discover *where* doctors are located. However, after finding a clinic, patients—especially students, young professionals, and migrant workers new to a city—face significant uncertainty:
1. **Appropriateness:** Is this provider appropriate for my specific symptom?
2. **Current Status:** Are they actually open and accepting patients right now?
3. **Queue Delay:** How long will I have to sit in a crowded, infectious waiting room?
4. **Wasted Hours:** Can I join the queue digitally and arrive right when my turn is called?

### The Solution: The Care Connect Pipeline
$$\text{Healthcare Concern} \longrightarrow \text{Specialty Matching (AI)} \longrightarrow \text{Nearby Discovery} \longrightarrow \text{Smart Ranking} \longrightarrow \text{Real-time Availability} \longrightarrow \text{Digital Queue} \longrightarrow \text{Consultation}$$

---

## 2. Important Medical Safety Boundaries

> [!IMPORTANT]
> **Care Connect is strictly a Healthcare Navigation Platform, NOT a diagnostic system.**
> The application never claims to diagnose diseases, prescribe medicines, or replace licensed medical professionals.

- **Non-Diagnostic AI:** Gemini AI is used solely to parse natural language concerns (e.g. *"I've had a skin rash and itching for three days"*) and classify the most relevant medical department (e.g. *Dermatology*).
- **Automated Emergency Triage:** The system actively scans for life-threatening emergency symptoms (such as crushing chest pain, stroke symptoms, respiratory distress, or severe bleeding). When detected, standard navigation is suspended and an immediate red emergency modal is displayed directing the user to local emergency services (**112 / 911**).
- **Universal Safety Notice:** Displayed on every search and profile view:
  > *"Care Connect does not provide medical diagnosis or treatment. Specialty suggestions are for healthcare navigation only. If you are experiencing a medical emergency, contact local emergency services or visit the nearest emergency department."*

---

## 3. Core Product Differentiators

### A. Intent-Based Healthcare Search
Patients describe symptoms in plain words. The smart classifier identifies the appropriate specialty with non-diagnostic reasoning:
- *"I have persistent skin itching and red patches"* $\rightarrow$ **Dermatology**
- *"Severe toothache and swollen jaw"* $\rightarrow$ **Dentistry**
- *"My child has a high fever"* $\rightarrow$ **Pediatrics**
- *"Crushing chest pain and numbness"* $\rightarrow$ 🚨 **Urgent Emergency Triage**

### B. Multi-Factor Smart Provider Ranking
Providers are scored transparently using a balanced weighted algorithm:
$$\text{Score} = 30\% \cdot \text{Specialty Match} + 20\% \cdot \text{Distance} + 20\% \cdot \text{Wait Time} + 15\% \cdot \text{Rating} + 10\% \cdot \text{Fee} + 5\% \cdot \text{Availability}$$

Patients can customize their priority toggle in 1 click:
- ⚡ **Fastest:** Prioritizes shortest live waiting time (50% weight).
- 📍 **Nearest:** Prioritizes shortest physical distance (50% weight).
- 💰 **Most Affordable:** Prioritizes lowest consultation fee (50% weight).
- ⭐ **Highest Rated:** Prioritizes verified rating and reviews (50% weight).

Every provider card displays transparent **"Why this provider is recommended"** badges:
- `✓ 1.2 km away`
- `✓ 12 min estimated wait`
- `✓ ₹400 consultation`
- `✓ 4.8 rating (142+ reviews)`
- `✓ Currently accepting patients`

### C. Live Real-Time Digital Queue
- Patients join the digital queue remotely with 1 click.
- Receive a token (e.g. **#17**).
- Track real-time progress: Current serving token (**#14**), patients ahead (**2**), and estimated waiting time (**~12 min**).
- **Reactive Live Alert:** When the doctor calls the patient, their screen instantly updates with:
  $$\text{🔔 You're next! Please proceed to the clinic.}$$

### D. Doctor Management Workspace
- Clinic open/closed status toggle (🟢 *Accepting Patients* / 🔴 *Closed*).
- Real-time patient token desk:
  - Currently consulting patient card with contact info.
  - **"Call Next Patient"** button (advances queue, completes current consultation, alerts the next patient).
  - Complete, Skip, and Cancel actions.
- Practice profile editor (fees, consultation duration, working hours, specialties).

---

## 4. Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, React Router v7, Lucide React Icons, Canvas Confetti.
- **Backend:** Node.js, Express.js, CORS, Dotenv.
- **Data Layer:** SQLite / Persistent JSON store with pre-seeded realistic clinics + PostgreSQL DDL schema for Supabase.
- **AI Engine:** Google Gemini API (`gemini-1.5-flash`) with structured output + high-accuracy offline deterministic fallback engine.

---

## 5. Project Folder Structure

```
care-connect/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DemoBar.jsx             
│   │   │   ├── EmergencyModal.jsx  
│   │   │   ├── Footer.jsx              # Footer with safety boundaries
│   │   │   ├── Navbar.jsx              # Responsive header with active token indicator
│   │   │   ├── ProviderCard.jsx        # Doctor card with smart ranking breakdown
│   │   │   └── SafetyDisclaimer.jsx    # Mandatory medical safety notice
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # Demo role switcher (Patient <-> Doctor)
│   │   ├── pages/
│   │   │   ├── DoctorDashboardPage.jsx # Doctor analytics & status switcher
│   │   │   ├── DoctorLoginPage.jsx     # 1-click doctor login
│   │   │   ├── DoctorProfileEditPage.jsx # Doctor clinic profile settings
│   │   │   ├── DoctorProfilePage.jsx   # Public doctor credentials & queue status
│   │   │   ├── DoctorQueueManagerPage.jsx # Real-time token caller & queue desk
│   │   │   ├── DoctorSearchPage.jsx    # Ranked doctor search & filters
│   │   │   ├── LandingPage.jsx         # Healthcare SaaS landing page
│   │   │   ├── LoginPage.jsx           # Unified login with demo shortcuts
│   │   │   ├── PatientProfilePage.jsx  # Patient history & saved doctors
│   │   │   ├── PatientQueuePage.jsx    # Real-time token live tracker
│   │   │   └── RegisterPage.jsx        # Registration form
│   │   ├── services/
│   │   │   └── api.js                  # Centralized REST API client
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.js         # Intent classification handler
│   │   │   ├── authController.js       # Auth & demo switcher endpoints
│   │   │   ├── doctorController.js     # Doctor search, ranking, profile
│   │   │   └── queueController.js      # Digital queue engine & token caller
│   │   ├── data/
│   │   │   └── database.js             # Seed database with 18+ realistic clinics
│   │   ├── routes/
│   │   │   ├── aiRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── doctorRoutes.js
│   │   │   └── queueRoutes.js
│   │   ├── services/
│   │   │   ├── geminiService.js        # Gemini AI & emergency triage
│   │   │   └── rankingService.js       # Multi-criteria scoring algorithm
│   │   └── server.js                   # Express server entry point
│   ├── supabase/
│   │   └── schema.sql                  # Supabase PostgreSQL DDL
│   ├── .env.example
│   └── package.json
├── package.json
└── README.md
```

---

## 6. Quick Start & Setup Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 1. Installation
Run from the root `care-connect` folder:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Configuration (Optional)
In `server/.env`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```
*(Note: If `GEMINI_API_KEY` is not provided, Care Connect automatically falls back to its built-in rule-based medical navigation classifier, guaranteeing 100% demo uptime).*

### 3. Run the Application
**Terminal 1 — Backend API:**
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

Open your browser at `http://localhost:5173`.

---

## 7. 1-Click Demo Accounts

| Role | Demo Email | Name / Profile | Default Password |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@careconnect.demo` | Jashandeep Singh (Bellandur) | *None (1-Click)* |
| **Doctor** | `doctor@careconnect.demo` | Dr. Raj Sharma (MD Dermatology, Apex Skin Clinic) | *None (1-Click)* |

You can also use the **Top Demo Bar** to switch between Patient and Doctor views instantly with zero friction.

---

## 8. Hackathon 11-Step Judging Presentation Walkthrough

Use this exact scenario to demonstrate Care Connect live:

1. **Step 1:** Open `http://localhost:5173`.
2. **Step 2:** In the hero input, enter:
   > *"I have persistent skin itching and rash."*
3. **Step 3:** Click **Find the Right Doctor**. Notice the AI badge:
   > **Suggested Specialty: Dermatology** *(Smart Navigation, Not a Diagnosis)*.
4. **Step 4:** View nearby dermatologists list.
5. **Step 5:** Observe the smart ranking results:
   - **Dr. Raj Sharma:** `1.2 km | ₹400 | ⭐ 4.8 | 12 min wait` $\rightarrow$ **#1 Best Overall Match**.
   - **Dr. Priya Nair:** `0.8 km | ₹300 | ⭐ 4.5 | 35 min wait`.
   - **Dr. Arun Mehta:** `2.1 km | ₹600 | ⭐ 4.9 | 5 min wait`.
6. **Step 6:** Click on **"⚡ Fastest"** priority $\rightarrow$ Notice Dr. Arun Mehta (5m wait) moves to the top. Switch back to **"🎯 Best Match"**.
7. **Step 7:** Open Dr. Raj Sharma's profile $\rightarrow$ Click **"Join Digital Queue"**.
8. **Step 8:** Confetti fires! Patient receives **Token #17** (Current token: #14, Patients ahead: 2, Wait: ~12m).
9. **Step 9:** Click **"Switch to Doctor View"** in the top demo bar $\rightarrow$ Opens Dr. Raj Sharma's Live Queue Desk showing `#17 Jashandeep — Waiting`.
10. **Step 10:** In the Doctor Desk, click **"Call Next Patient"**. Token #15 is completed, advancing the queue.
11. **Step 11:** Click **"Switch to Patient View"** $\rightarrow$ Notice the patient's tracker updates in real-time to:
    $$\text{🔔 You're next! Please proceed to the clinic.}$$

---

## 9. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/specialty` | Classifies symptom concern into specialty & runs emergency triage |
| `GET` | `/api/doctors/search` | Smart multi-factor ranked doctor discovery |
| `GET` | `/api/doctors/:id` | Full doctor profile with live queue status & reviews |
| `PATCH` | `/api/doctors/:id/status`| Toggles clinic Open / Closed status |
| `PATCH` | `/api/doctors/:id` | Updates clinic address, fees, and consultation time |
| `POST` | `/api/queue/join` | Adds patient to digital queue, assigns token number |
| `GET` | `/api/queue/:doctorId` | Live queue desk for doctor with consulting & waiting list |
| `GET` | `/api/queue/patient/:id`| Active token tracker for patient with dynamic wait calculation |
| `POST` | `/api/queue/call-next` | Doctor calls next waiting patient |
| `POST` | `/api/queue/complete` | Marks current consultation as finished |
| `POST` | `/api/queue/skip` | Skips an absent queue entry |
| `POST` | `/api/queue/leave` | Patient voluntarily leaves queue |
| `POST` | `/api/queue/reset` | Resets all demo queues to initial presentation state |

---

## 10. Known Limitations & Future Roadmap

- **Hardware Integration:** Add thermal token printer and waiting-room TV display mode via HDMI/Chromecast for local clinics.
- **Multilingual Voice Search:** Add speech-to-text in regional languages (Hindi, Kannada, Tamil, etc.) for migrant workers.
- **SMS / WhatsApp Alerts:** Add automated WhatsApp messages when token is 2 positions away.
- **Prescription & Follow-up Records:** Integrated digital health locker for post-consultation notes.

---

## License & Acknowledgements
Built for the Hackathon. Care Connect promotes safe, transparent, and ethical healthcare navigation.
