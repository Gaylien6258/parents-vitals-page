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
const vitalsList = document.getElementById('vitals-list');
const downloadPdfButton = document.getElementById('download-pdf');

const logoutButton = document.getElementById('logout-button');
const googleLoginButton = document.getElementById('google-login-button');

// New DOM elements for the custom confirmation modal
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');

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
        // After adding, refresh the display for the patient currently being viewed
        displayVitalSigns(patientSelect.value);
    } catch (e) {
        console.error("Error adding vitals:", e);
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
        // After deleting, refresh the display for the patient currently being viewed
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
        vitals.push(data); 
        
        const li = document.createElement('li');
        li.textContent = `Patient: ${data.patient_name}, Systolic: ${data.systolic}, Diastolic: ${data.diastolic}, Heart Rate: ${data.heart_rate}, Oxygen: ${data.oxygen_saturation}`;
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.setAttribute('data-id', doc.id);
        
        li.appendChild(deleteButton);
        vitalsList.appendChild(li);
    });

    updateChart(vitals);
}

// ---------- Chart.js ----------
let vitalsChart = null;
function updateChart(vitals) {
    const labels = vitals.map(v => new Date(v.timestamp.seconds * 1000).toLocaleString()).reverse();
    const systolicData = vitals.map(v => v.systolic).reverse();
    const diastolicData = vitals.map(v => v.diastolic).reverse();
    const heartRateData = vitals.map(v => v.heart_rate).reverse();
    const oxygenData = vitals.map(v => v.oxygen_saturation).reverse();

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
    
    // Get current chart data and last reading for the radar chart
    const chartData = vitalsChart.data;
    const lastReading = {
      systolic: chartData.datasets[0].data[chartData.datasets[0].data.length - 1],
      diastolic: chartData.datasets[1].data[chartData.datasets[1].data.length - 1],
      heartRate: chartData.datasets[2].data[chartData.datasets[2].data.length - 1],
      oxygen: chartData.datasets[3].data[chartData.datasets[3].data.length - 1]
    };
    
    // Page 1: Line Chart
    doc.setFontSize(20);
    doc.text(`Vitals Report for ${patientName}`, 10, 20);
    doc.setFontSize(12);
    doc.text(`Report Date: ${reportDate}`, 10, 30);
    
    const lineChartImage = await generateChartImage('line', chartData, { responsive: false, maintainAspectRatio: false }, 600, 300);
    doc.addImage(lineChartImage, 'PNG', 15, 40, 180, 90);
    
    // Page 2: Summary Charts and Readings
    doc.addPage();
    
    // Define chart options for PDF export
    const chartOptions = {
        responsive: false,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
    };

    const barChartData = {
        labels: chartData.labels,
        datasets: [
            { label: 'Systolic', data: chartData.datasets[0].data, backgroundColor: 'rgba(255, 99, 132, 0.5)' },
            { label: 'Diastolic', data: chartData.datasets[1].data, backgroundColor: 'rgba(54, 162, 235, 0.5)' },
            { label: 'Heart Rate', data: chartData.datasets[2].data, backgroundColor: 'rgba(75, 192, 192, 0.5)' },
            { label: 'Oxygen', data: chartData.datasets[3].data, backgroundColor: 'rgba(255, 159, 64, 0.5)' }
        ]
    };
    
    const radarData = {
        labels: ['Systolic', 'Diastolic', 'Heart Rate', 'Oxygen'],
        datasets: [{
            label: 'Last Reading',
            data: [lastReading.systolic, lastReading.diastolic, lastReading.heartRate, lastReading.oxygen],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
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
        const text = li.textContent.replace('Patient: Mom, ', '').replace('Patient: Dad, ', '').replace('Delete', '').trim();
        doc.text(text, 10, y);
        y += 7;
    });

    doc.save(`vitals_report_${patientName}.pdf`);
});

// ---------- Event Listeners ----------
logoutButton.addEventListener('click', logout);

vitalsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addVitalSigns(
        patientSelect.value,
        systolicInput.value,
        diastolicInput.value,
        heartrateInput.value,
        oxygenInput.value
    );
    vitalsForm.reset();
});

vitalsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        docIdToDelete = e.target.getAttribute('data-id');
        confirmModal.style.display = 'flex';
        confirmMessage.textContent = 'Are you sure you want to delete this vital sign entry?';
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
        // Store the user ID for later use
        currentUserId = user.uid;
        authDiv.style.display = "none";
        appDiv.style.display = "block";
        // Display vitals for the initially selected patient
        displayVitalSigns(patientSelect.value);
    } else {
        currentUserId = null;
        authDiv.style.display = "block";
        appDiv.style.display = "none";
    }
});
