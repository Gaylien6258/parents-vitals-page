// Import Firebase SDK functions
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWKz6O-5xir46vivUPBAse_vMSaXWKamU",
    authDomain: "parents-vitals-data.firebaseapp.com",
    projectId: "parents-vitals-data",
    storageBucket: "parents-vitals-data.firebasestorage.app",
    messagingSenderId: "34332288387",
    appId: "1:34332288387:web:ea67be6bb564e8f402c2b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---------- Firestore Functions ----------

// Add vital signs
async function addVitalSigns(patient, systolic, diastolic, heartrate, oxygen) {
    try {
        const docRef = await addDoc(collection(db, "vitals"), {
            patient_name: patient,
            systolic: systolic,
            diastolic: diastolic,
            heart_rate: heartrate,
            oxygen_saturation: oxygen,
            timestamp: new Date()
        });
        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// Display recent vital signs
async function displayVitalSigns() {
    const vitalsList = document.getElementById('vitals-list');
    vitalsList.innerHTML = '';
    const vitals = [];
    const querySnapshot = await getDocs(collection(db, "vitals"));
    querySnapshot.forEach((doc) => {
        vitals.push(doc.data());
    });

    vitals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    vitals.forEach(vital => {
        const li = document.createElement('li');
        li.textContent = `Patient: ${vital.patient_name}, Systolic: ${vital.systolic}, Diastolic: ${vital.diastolic}, Heart Rate: ${vital.heart_rate}, Oxygen: ${vital.oxygen_saturation}`;
        vitalsList.appendChild(li);
    });

    // Update chart with latest data
    renderChart(vitals);
}

// ---------- Chart.js Setup ----------

let vitalsChart; // global chart instance

function renderChart(vitals) {
    const ctx = document.getElementById("vitals-chart").getContext("2d");

    // Sort by time (oldest to newest)
    vitals.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Prepare data
    const labels = vitals.map(v => new Date(v.timestamp).toLocaleString());
    const systolic = vitals.map(v => v.systolic);
    const diastolic = vitals.map(v => v.diastolic);
    const heartRate = vitals.map(v => v.heart_rate);
    const oxygen = vitals.map(v => v.oxygen_saturation);

    // If chart already exists, destroy before re-creating
    if (vitalsChart) {
        vitalsChart.destroy();
    }

    vitalsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
