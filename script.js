// ---------- Firebase Initialization ----------

const firebaseConfig = {
    apiKey: "AIzaSyDWKz6O-5xir46vivUPBAse_vMSaXWKamU",
    authDomain: "parents-vitals-data.firebaseapp.com",
    projectId: "parents-vitals-data",
    storageBucket: "parents-vitals-data.firebasestorage.app",
    messagingSenderId: "34332288387",
    appId: "1:34332288387:web:ea67be6bb564e8f402c2b6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ---------- Firestore Functions ----------

async function addVitalSigns(patient, systolic, diastolic, heartrate, oxygen) {
    try {
        await db.collection("vitals").add({
            patient_name: patient,
            systolic: systolic,
            diastolic: diastolic,
            heart_rate: heartrate,
            oxygen_saturation: oxygen,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

async function displayVitalSigns() {
    const vitalsList = document.getElementById('vitals-list');
    vitalsList.innerHTML = '';
    const vitals = [];
    const snapshot = await db.collection("vitals").get();
    snapshot.forEach(doc => vitals.push(doc.data()));

    vitals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    vitals.forEach(vital => {
        const li = document.createElement('li');
        li.textContent = `Patient: ${vital.patient_name}, Systolic: ${vital.systolic}, Diastolic: ${vital.diastolic}, Heart Rate: ${vital.heart_rate}, Oxygen: ${vital.oxygen_saturation}`;
        vitalsList.appendChild(li);
    });

    renderChart(vitals);
}

// ---------- Chart.js Setup ----------

let vitalsChart;

function renderChart(vitals) {
    const ctx = document.getElementById("vitals-chart").getContext("2d");

    vitals.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = vitals.map(v => new Date(v.timestamp).toLocaleString());
    const systolic = vitals.map(v => v.systolic);
    const diastolic = vitals.map(v => v.diastolic);
    const heartRate = vitals.map(v => v.heart_rate);
    const oxygen = vitals.map(v => v.oxygen_saturation);

    if (vitalsChart) vitalsChart.destroy();

    vitalsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                { label: "Systolic (mmHg)", data: systolic, borderColor: "#007bff", backgroundColor: "rgba(0,123,255,0.2)", tension:0.3, fill:false, pointRadius:4 },
                { label: "Diastolic (mmHg)", data: diastolic, borderColor: "#6610f2", backgroundColor: "rgba(102,16,242,0.2)", tension:0.3, fill:false, pointRadius:4 },
                { label: "Heart Rate (BPM)", data: heartRate, borderColor: "#28a745", backgroundColor: "rgba(40,167,69,0.2)", tension:0.3, fill:false, pointRadius:4 },
                { label: "Oxygen Saturation (%)", data: oxygen, borderColor: "#dc3545", backgroundColor: "rgba(220,53,69,0.2)", tension:0.3, fill:false, pointRadius:4 }
            ]
        },
        options: {
            responsive:true,
            plugins:{ legend:{ position:"top" } },
            scales:{ x:{ ticks:{ autoSkip:true, maxTicksLimit:6 }}, y:{ beginAtZero:false } }
        }
    });
}

// ---------- Authentication Functions ----------

function signup(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => console.log("Signed up:", userCredential.user.uid))
        .catch(error => alert("Sign up failed: " + error.message));
}

function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => console.log("Logged in:", userCredential.user.uid))
        .catch(error => alert("Login failed: " + error.message));
}

function logout() {
    auth.signOut()
        .then(() => console.log("User logged out"))
        .catch(error => console.error("Logout failed:", error));
}

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

document.getElementById('logout-button').addEventListener('click', logout);

document.getElementById('vitals-form').addEventListener('submit', e => {
    e.preventDefault();
    const patient = document.getElementById('patient-select').value;
    const systolic = document.getElementById('systolic').value;
    const diastolic = document.getElementById('diastolic').value;
    const heartrate = document.getElementById('heartrate').value;
    const oxygen = document.getElementById('oxygen').value;

    addVitalSigns(patient, systolic, diastolic, heartrate, oxygen);
    displayVitalSigns();

    document.getElementById('vitals-form').reset();
});

// ---------- Auth State Listener ----------

auth.onAuthStateChanged(user => {
    const authDiv = document.getElementById('auth');
    const appDiv = document.getElementById('app');
    const loadingDiv = document.getElementById('loading');

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
