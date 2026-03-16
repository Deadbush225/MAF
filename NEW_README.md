# AI Medical Symptom Triage and Scheduling Assistant

<img src="https://placehold.co/1200x380?text=Placeholder+Banner+Top" alt="Placeholder Banner Top" width="900">

An AI-assisted medical intake system that lets patients speak or type their symptoms, summarizes their concerns into a cleaner clinical format, and helps triage urgency before suggesting available doctor schedules near the patient.

## Features

- **Voice and Text Input**: Patients can open the app and either speak or write their symptoms.
- **Smart Symptom Summary**: The assistant generates a cleaner, structured summary from free-form input.
- **Structured Intake Details**: The system extracts and organizes:
  - Current Date
  - Date the symptom started
  - Area of Concern
  - Symptoms
  - Other Additional Information (the AI can ask follow-up questions when needed)
- **Urgency Categorization**: The AI classifies symptom urgency based on the provided details.
- **Doctor Schedule Suggestions**: Based on urgency, the system suggests open doctor schedules the patient can choose from, prioritized by nearby hospitals/clinics.

---

## Patient Flow (Web App)

The web experience is designed for fast intake and triage with AI-guided follow-ups.

### Front Banner and Intake Screen
<img src="https://placehold.co/1200x380?text=Placeholder+Banner+Front" alt="Placeholder Banner Front" width="900">

### Symptom Summary and Urgency Classification
<img src="https://placehold.co/1200x500?text=Placeholder+Triage+Output" alt="Placeholder Triage Output" width="900">

---

## Backend AI Workflow

The backend handles AI response generation, symptom cleaning, and triage-ready formatting for scheduling recommendations.

### Intake Processing Pipeline
<img src="https://placehold.co/1200x500?text=Placeholder+Backend+Pipeline" alt="Placeholder Backend Pipeline" width="900">

### Scheduling Suggestion Logic
<img src="https://placehold.co/1200x500?text=Placeholder+Doctor+Schedule+Suggestions" alt="Placeholder Doctor Schedule Suggestions" width="900">

---
## Comprehensive Repository Structure

```text
MAF/
├── Source Code/
│   ├── backend/                          # Express API and triage logic
│   │   ├── server.js                     # Main backend server
│   │   ├── triageController.js           # Symptom cleanup and urgency flow
│   │   ├── package.json                  # Backend dependencies and scripts
│   │   └── .env.example                  # Environment variable template
│   └── frontend/                         # Vite-based client application
│       ├── src/                          # React source files
│       ├── img/                          # Member photos and project images
│       ├── package.json                  # Frontend dependencies and scripts
│       └── index.html                    # Frontend HTML entry
├── NEW_README.md                         # Updated project documentation
├── README.md                             # Legacy/readme reference
└── .gitignore                            # Git ignore rules
```

---
## Project Members

<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" width="50%">
      <img src="Source Code/frontend/img/inso.jpg" alt="Eliazar Inso" style="border-radius: 50%; width: 120px; height: 120px; object-fit: cover;"><br>
      <strong>Eliazar Inso</strong><br>
      <a href="#">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
      </a>
    </td>
    <td align="center" width="50%">
      <img src="Source Code/frontend/img/adriel.jpg" alt="Adriel Magalona" style="border-radius: 50%; width: 120px; height: 120px; object-fit: cover;"><br>
      <strong>Adriel Magalona</strong><br>
      <a href="#">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%" style="padding-top: 20px;">
      <img src="Source Code/frontend/img/hanzlei.jpg" alt="Hanzlei Jamison" style="border-radius: 50%; width: 120px; height: 120px; object-fit: cover;"><br>
      <strong>Hanzlei Jamison</strong><br>
      <a href="#">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
      </a>
    </td>
    <td align="center" width="50%" style="padding-top: 20px;">
      <img src="Source Code/frontend/img/Vince.jpg" alt="Vincent Puti" style="border-radius: 50%; width: 120px; height: 120px; object-fit: cover;"><br>
      <strong>Vincent Puti</strong><br>
      <a href="#">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
      </a>
    </td>
  </tr>
</table>


Made by BSCS students of the Polytechnic University of the Philippines under Professor John Patrick B. Sta Maria.