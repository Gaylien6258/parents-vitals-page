// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// Your web app's Firebase configuration
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

// Add vital signs to Firestore
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

    vitals.sort((a, b) => b.timestamp - a.timestamp);

    vitals.forEach(vital => {
        const li = document.createElement('li');
        li.textContent = `Patient: ${vital.patient_name}, Systolic: ${vital.systolic}, Diastolic: ${vital.diastolic}, Heart Rate: ${vital.heart_rate}, Oxygen: ${vital.oxygen_saturation}`;
        vitalsList.appendChild(li);
    });
}

// Sign up a new user
async function signup(email, password) {
    const auth = getAuth();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Signed in 
        const user = userCredential.user;
        console.log("User signed up successfully: ", user.uid);
        alert("Sign up successful! You can now log in.");
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Sign up failed: ", errorMessage);
        alert("Sign up failed: " + errorMessage);
    }
}

// Log in an existing user
async function login(email, password) {
    const auth = getAuth();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Signed in 
        const user = userCredential.user;
        console.log("User logged in successfully: ", user.uid);
        alert("Login successful! You can now add readings.");
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Login failed: ", errorMessage);
        alert("Login failed: " + errorMessage);
    }
}
// Event listener for form submission
document.getElementById('vitals-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const patient = document.getElementById('patient-select').value;
    const systolic = document.getElementById('systolic').value;
    const diastolic = document.getElementById('diastolic').value;
    const heartrate = document.getElementById('heartrate').value;
    const oxygen = document.getElementById('oxygen').value;

    addVitalSigns(patient, systolic, diastolic, heartrate, oxygen);
    displayVitalSigns();

    // Clear form fields
    document.getElementById('vitals-form').reset();
});

// Initial display of data
displayVitalSigns();
