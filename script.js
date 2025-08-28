console.log("Script loaded");

// ---------- Firebase Initialization ----------
const firebaseConfig = {
    apiKey: "AIzaSyDWKz6O-5xir46vivUPBAse_vMSaXWKamU",
    authDomain: "parents-vitals-data.firebaseapp.com",
    projectId: "parents-vitals-data",
    storageBucket: "parents-vitals-data.firebasestorage.app",
    messagingSenderId: "34332288387",
    appId: "1:34332288387:web:ea67be6bb564e8f402c2b6"
};

firebase.initializeApp(firebaseConfig);
console.log("Firebase App Name:", firebase.app().name);
const db = firebase.firestore();
const auth = firebase.auth();
console.log("Firebase initialized");

// ---------- DOM Elements ----------
const loadingDiv = document.getElementById('loading');
const authDiv = document.getElementById('auth');
const appDiv = document.getElementById('app');

const vitalsForm = document.getElementById('vitals-form');
const patientSelect = document.getElementById('patient-select');
const systolicInput = document.getElementById('systolic');
const diastolicInput = document.getElementById('diastolic');
const heartrateInput = document.getElementById('heartrate');
const oxygenInput = document.getElementById('oxygen');
const timestampInput = document.getElementById('timestamp-input'); // New timestamp input
const vitalsList = document.getElementById('vitals-list');
const downloadPdfButton = document.getElementById('download-pdf');

const submitBtn = document.getElementById('submit-btn');
const updateBtn = document.getElementById('update-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const logoutButton = document.getElementById('logout-button');
const googleLoginButton = document.getElementById('google-login-button');

// New DOM elements for the custom confirmation modal
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');

let docIdToEdit = null;
let docIdToDelete = null;
let currentUserId = null; // Variable to store the current user's UID

// ---------- Patient Name Mapping ----------
const patientNames = {
    "Mom": "Susan",
    "Dad": "Gary"
};

// ---------- Auth Functions ----------
function logout() {
    auth.signOut()
        .then(() => console.log("User logged out"))
        .catch(error => console.error("Logout failed:", error));
}

// ---------- Google Login ----------
googleLoginButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => console.log("Google login successful:", result.user.email))
        .catch(error => alert("Google login failed: " + error.message));
});

// ---------- Vitals Functions ----------
async function addVitalSigns(patient, systolic, diastolic, heartrate, oxygen) {
    if (!currentUserId) {
        console.error("No user logged in. Cannot add vitals.");
        return;
    }
    try {
        await db.collection("users").doc(currentUserId).collection("vitals").add({
            patient_name: patient,
            systolic: parseInt(systolic),
            diastolic: parseInt(diastolic),
            heart_rate: parseInt(heartrate),
            oxygen_saturation: parseInt(oxygen),
            timestamp: new Date()
        });
        console.log("Vitals added for", patient);
        displayVitalSigns(patientSelect.value);
    } catch (e) {
        console.error("Error adding vitals:", e);
    }
}

async function updateVitalSign(docId, patient, systolic, diastolic, heartrate, oxygen, timestamp) {
    if (!currentUserId) {
        console.error("No user logged in. Cannot update vitals.");
        return;
    }
    try {
        await db.collection("users").doc(currentUserId).collection("vitals").doc(docId).update({
            patient_name: patient,
            systolic: parseInt(systolic),
            diastolic: parseInt(diastolic),
            heart_rate: parseInt(heartrate),
            oxygen_saturation: parseInt(oxygen),
            timestamp: new Date(timestamp)
        });
        console.log("Vitals updated for", patient);
        displayVitalSigns(patientSelect.value);
        resetForm();
    } catch (e) {
        console.error("Error updating vitals:", e);
    }
}

// Function to delete a vital sign entry from Firestore
async function deleteVitalSign(docId) {
    if (!currentUserId) {
        console.error("No user logged in. Cannot delete vitals.");
        return;
    }
    try {
        await db.collection("users").doc(currentUserId).collection("vitals").doc(docId).delete();
        console.log("Document successfully deleted!");
        displayVitalSigns(patientSelect.value); 
    } catch (error) {
        console.error("Error removing document: ", error);
    }
}

// Function to fetch and display vital signs from Firestore with optional filtering
async function displayVitalSigns(patientToFilter) {
    if (!currentUserId) {
        console.error("No user logged in. Cannot display vitals.");
        return;
    }
    vitalsList.innerHTML = '';
    const vitals = [];
    
    let vitalsQuery = db.collection("users").doc(currentUserId).collection("vitals");

    // If a patient is selected, add a filter to the query
    if (patientToFilter) {
        vitalsQuery = vitalsQuery.where("patient_name", "==", patientToFilter);
    }

    const querySnapshot = await vitalsQuery.orderBy("timestamp", "desc").get();
    
    querySnapshot.forEach(doc => {
        const data = doc.data();
        vitals.push({ id: doc.id, ...data }); 
        
        const li = document.createElement('li');
        const timestamp = data.timestamp.seconds ? new Date(data.timestamp.seconds * 1000) : new Date(data.timestamp);
        li.textContent = `Patient: ${data.patient_name}, Systolic: ${data.systolic}, Diastolic: ${data.diastolic}, Heart Rate: ${data.heart_rate}, Oxygen: ${data.oxygen_saturation} - ${timestamp.toLocaleString()}`;
        
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.setAttribute('data-id', doc.id);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.setAttribute('data-id', doc.id);
        
        li.appendChild(editButton);
        li.appendChild(deleteButton);
        vitalsList.appendChild(li);
    });

    updateChart(vitals);
}

// Helper function to set the form for editing
function setFormForEdit(data) {
    patientSelect.value = data.patient_name;
    systolicInput.value = data.systolic;
    diastolicInput.value = data.diastolic;
    heartrateInput.value = data.heart_rate;
    oxygenInput.value = data.oxygen_saturation;
    
    const timestamp = data.timestamp.seconds ? new Date(data.timestamp.seconds * 1000) : new Date(data.timestamp);
    const localDateTime = new Date(timestamp.getTime() - timestamp.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    timestampInput.value = localDateTime;

    submitBtn.style.display = 'none';
    updateBtn.style.display = 'inline-block';
    cancelEditBtn.style.display = 'inline-block';
}

// Helper function to reset the form to add mode
function resetForm() {
    vitalsForm.reset();
    submitBtn.style.display = 'inline-block';
    updateBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
    docIdToEdit = null;
    timestampInput.value = '';
}

// ---------- Chart.js ----------
let vitalsChart = null;
function updateChart(vitals) {
    // Sort vitals by timestamp in ascending order for the chart
    vitals.sort((a, b) => (a.timestamp.seconds || a.timestamp) - (b.timestamp.seconds || b.timestamp));
    
    const labels = vitals.map(v => new Date((v.timestamp.seconds || v.timestamp) * 1000).toLocaleString());
    const systolicData = vitals.map(v => v.systolic);
    const diastolicData = vitals.map(v => v.diastolic);
    const heartRateData = vitals.map(v => v.heart_rate);
    const oxygenData = vitals.map(v => v.oxygen_saturation);

    const ctx = document.getElementById('vitals-chart').getContext('2d');
    if(vitalsChart) vitalsChart.destroy();
    vitalsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Systolic', data: systolicData, borderColor: 'red', fill: false },
                { label: 'Diastolic', data: diastolicData, borderColor: 'blue', fill: false },
                { label: 'Heart Rate', data: heartRateData, borderColor: 'green', fill: false },
                { label: 'Oxygen', data: oxygenData, borderColor: 'orange', fill: false }
            ]
        },
        options: { responsive: true }
    });
}

// Helper function to create a chart image from data
const generateChartImage = (chartType, data, options, width, height) => {
    return new Promise((resolve) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const tempCtx = tempCanvas.getContext('2d');
        const tempChart = new Chart(tempCtx, {
            type: chartType,
            data: data,
            options: options
        });
        
        // Use a timeout to ensure the chart is rendered
        setTimeout(() => {
            const dataURL = tempCanvas.toDataURL('image/png', 1.0);
            tempChart.destroy();
            resolve(dataURL);
        }, 100);
    });
};


// ---------- PDF Export ----------
downloadPdfButton.addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const patientName = patientNames[patientSelect.value];
    const reportDate = new Date().toLocaleDateString();

    // Cover Page
    doc.setFontSize(30);
    doc.text(`Vitals Report`, 105, 120, null, null, 'center');
    doc.setFontSize(20);
    doc.text(`for ${patientName}`, 105, 130, null, null, 'center');
    doc.setFontSize(14);
    doc.text(`Generated on ${reportDate}`, 105, 140, null, null, 'center');
    doc.text(`Created by: The Caregiver App`, 105, 150, null, null, 'center');
    doc.text(`All data is sourced from private patient records and is intended for medical use only.`, 105, 160, null, null, 'center');

    // Header and Footer for all subsequent pages
    const headerFooter = (doc, pageNumber) => {
      doc.setFontSize(10);
      doc.text(`Vitals Report for ${patientName}`, 10, 10);
      doc.text(`Page ${pageNumber}`, 190, 10, null, null, 'right');
      doc.setDrawColor(0);
      doc.line(10, 12, 200, 12); // Header line
      
      doc.text(`Created by: The Caregiver App`, 10, 290);
      doc.line(10, 288, 200, 288); // Footer line, adjusted to be above the text
    };
    
    // Page 2: Line Chart
    doc.addPage();
    headerFooter(doc, 1);
    doc.setFontSize(20);
    doc.text("Vital Signs Over Time", 10, 20);
    doc.setFontSize(12);
    
    const vitalsData = await getVitalsData();
    const vitals = vitalsData.sort((a, b) => (a.timestamp.seconds || a.timestamp) - (b.timestamp.seconds || b.timestamp));
    const chartData = {
      labels: vitals.map(v => new Date((v.timestamp.seconds || v.timestamp) * 1000).toLocaleString()),
      datasets: [
          { label: 'Systolic', data: vitals.map(v => v.systolic), borderColor: 'red', fill: false },
          { label: 'Diastolic', data: vitals.map(v => v.diastolic), borderColor: 'blue', fill: false },
          { label: 'Heart Rate', data: vitals.map(v => v.heart_rate), borderColor: 'green', fill: false },
          { label: 'Oxygen', data: vitals.map(v => v.oxygen_saturation), borderColor: 'orange', fill: false }
      ]
    };
    
    const lineChartImage = await generateChartImage('line', chartData, { responsive: false, maintainAspectRatio: false }, 600, 300);
    doc.addImage(lineChartImage, 'PNG', 15, 40, 180, 90);
    
    // Page 3: Summary Charts and Readings
    doc.addPage();
    headerFooter(doc, 2);

    const lastReading = {
      systolic: vitals[vitals.length - 1].systolic,
      diastolic: vitals[vitals.length - 1].diastolic,
      heartRate: vitals[vitals.length - 1].heart_rate,
      oxygen: vitals[vitals.length - 1].oxygen_saturation
    };
    
    // Define chart options for PDF export
    const chartOptions = {
        responsive: false,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
    };
    
    const barChartData = {
        labels: chartData.labels,
        datasets: [
            { label: 'Systolic', data: chartData.datasets[0].data, backgroundColor: '#42a5f5' },
            { label: 'Diastolic', data: chartData.datasets[1].data, backgroundColor: '#66bb6a' },
            { label: 'Heart Rate', data: chartData.datasets[2].data, backgroundColor: '#ef5350' },
            { label: 'Oxygen', data: chartData.datasets[3].data, backgroundColor: '#ffca28' }
        ]
    };
    
    const radarData = {
        labels: ['Systolic', 'Diastolic', 'Heart Rate', 'Oxygen'],
        datasets: [{
            label: 'Last Reading',
            data: [lastReading.systolic, lastReading.diastolic, lastReading.heartRate, lastReading.oxygen],
            backgroundColor: 'rgba(66, 165, 245, 0.2)',
            borderColor: '#42a5f5',
            borderWidth: 2
        }]
    };
    
    const radarOptions = {
      responsive: false,
      maintainAspectRatio: false,
      elements: { line: { borderWidth: 3 } },
      scales: {
          r: {
              angleLines: { display: false },
              suggestedMin: 0,
              suggestedMax: 100,
              pointLabels: {
                  font: { size: 10 }
              }
          }
      }
    };
    
    // Generate images for the second page charts
    const [barChartImage, radarChartImage] = await Promise.all([
        generateChartImage('bar', barChartData, chartOptions, 600, 300),
        generateChartImage('radar', radarData, radarOptions, 600, 300)
    ]);

    // Add charts to PDF on the new page
    doc.setFontSize(16);
    doc.text("Bar Chart Analysis:", 10, 20);
    doc.addImage(barChartImage, 'PNG', 15, 30, 180, 90);

    doc.text("Radar Chart Analysis:", 10, 130);
    doc.addImage(radarChartImage, 'PNG', 15, 140, 180, 90);

    doc.text("Recent Readings:", 10, 240);
    doc.setFontSize(12);
    let y = 250;
    const lis = vitalsList.querySelectorAll('li');
    lis.forEach(li => {
        const text = li.textContent.replace('Patient: Mom, ', '').replace('Patient: Dad, ', '').replace('Delete', '').replace('Edit', '').trim();
        doc.text(text, 10, y);
        y += 7;
    });

    doc.save(`vitals_report_${patientName}.pdf`);
});

// A new function to fetch vitals data for the PDF
async function getVitalsData() {
    if (!currentUserId) return [];
    
    const vitals = [];
    let vitalsQuery = db.collection("users").doc(currentUserId).collection("vitals");
    if (patientSelect.value) {
        vitalsQuery = vitalsQuery.where("patient_name", "==", patientSelect.value);
    }
    const querySnapshot = await vitalsQuery.orderBy("timestamp", "asc").get();
    querySnapshot.forEach(doc => {
        const data = doc.data();
        vitals.push({ id: doc.id, ...data });
    });
    return vitals;
}

// ---------- Event Listeners ----------
logoutButton.addEventListener('click', logout);

vitalsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (updateBtn.style.display === 'inline-block') {
        updateVitalSign(
            docIdToEdit,
            patientSelect.value,
            systolicInput.value,
            diastolicInput.value,
            heartrateInput.value,
            oxygenInput.value,
            timestampInput.value
        );
    } else {
        addVitalSigns(
            patientSelect.value,
            systolicInput.value,
            diastolicInput.value,
            heartrateInput.value,
            oxygenInput.value
        );
        vitalsForm.reset();
    }
});

cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

vitalsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        docIdToDelete = e.target.getAttribute('data-id');
        confirmModal.style.display = 'flex';
        confirmMessage.textContent = 'Are you sure you want to delete this vital sign entry?';
    } else if (e.target.classList.contains('edit-btn')) {
        docIdToEdit = e.target.getAttribute('data-id');
        db.collection("users").doc(currentUserId).collection("vitals").doc(docIdToEdit).get().then(doc => {
            if (doc.exists) {
                setFormForEdit(doc.data());
            } else {
                console.error("No such document!");
            }
        });
    }
});

confirmYesBtn.addEventListener('click', () => {
    if (docIdToDelete) {
        deleteVitalSign(docIdToDelete);
    }
    confirmModal.style.display = 'none';
    docIdToDelete = null;
});

confirmNoBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    docIdToDelete = null;
});

// Event listener to automatically refresh display when patient selection changes
patientSelect.addEventListener('change', (e) => {
    displayVitalSigns(e.target.value);
});

// ---------- Auth State Listener ----------
auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user);
    loadingDiv.style.display = "none";
    if(user){
        currentUserId = user.uid;
        authDiv.style.display = "none";
        appDiv.style.display = "block";
        displayVitalSigns(patientSelect.value);
    } else {
        currentUserId = null;
        authDiv.style.display = "block";
        appDiv.style.display = "none";
    }
});
