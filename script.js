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

// ---------- Auth Functions ----------
function signup(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => console.log("Signed up:", userCredential.user.email))
        .catch(error => alert("Sign up failed: " + error.message));
}

function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => console.log("Logged in:", userCredential.user.email))
        .catch(error => alert("Login failed: " + error.message));
}

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
    try {
        await db.collection("vitals").add({
            patient_name: patient,
            systolic: parseInt(systolic),
            diastolic: parseInt(diastolic),
            heart_rate: parseInt(heartrate),
            oxygen_saturation: parseInt(oxygen),
            timestamp: new Date()
        });
        console.log("Vitals added for", patient);
        displayVitalSigns();
    } catch (e) {
        console.error("Error adding vitals:", e);
    }
}

// Function to delete a vital sign entry from Firestore
async function deleteVitalSign(docId) {
    try {
        await db.collection("vitals").doc(docId).delete();
        console.log("Document successfully deleted!");
        // Refresh the list and chart after deletion
        displayVitalSigns(); 
    } catch (error) {
        console.error("Error removing document: ", error);
    }
}

// Function to fetch and display vital signs from Firestore
async function displayVitalSigns() {
    vitalsList.innerHTML = '';
    const vitals = [];
    const querySnapshot = await db.collection("vitals").orderBy("timestamp", "desc").get();
    
    querySnapshot.forEach(doc => {
        const data = doc.data();
        vitals.push(data); 
        
        const li = document.createElement('li');
        li.textContent = `Patient: ${data.patient_name}, Systolic: ${data.systolic}, Diastolic: ${data.diastolic}, Heart Rate: ${data.heart_rate}, Oxygen: ${data.oxygen_saturation}`;
        
        // Create a delete button
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

// ---------- PDF Export ----------
downloadPdfButton.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Parental Vitals Report", 10, 10);

    // List vitals
    let y = 20;
    const lis = vitalsList.querySelectorAll('li');
    lis.forEach(li => {
        doc.text(li.textContent, 10, y);
        y += 7;
    });

    // Chart
    const chartCanvas = document.getElementById('vitals-chart');
    const chartDataURL = chartCanvas.toDataURL("image/png", 1.0);
    doc.addPage();
    doc.addImage(chartDataURL, 'PNG', 10, 20, 180, 100);

    doc.save("parental_vitals_report.pdf");
});

// ---------- Event Listeners ----------
document.getElementById('signup-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signup(email, password);
});

document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});

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

// New Event Listener for Delete Buttons
vitalsList.addEventListener('click', (e) => {
    // Check if the clicked element has the 'delete-btn' class
    if (e.target.classList.contains('delete-btn')) {
        const docId = e.target.getAttribute('data-id');
        // Ask for confirmation before deleting
        if (confirm('Are you sure you want to delete this vital sign entry?')) {
            deleteVitalSign(docId);
        }
    }
});


// ---------- Auth State Listener ----------
auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user);
    loadingDiv.style.display = "none";
    if(user){
        authDiv.style.display = "none";
        appDiv.style.display = "block";
        displayVitalSigns();
    } else {
        authDiv.style.display = "block";
        appDiv.style.display = "none";
    }
});
