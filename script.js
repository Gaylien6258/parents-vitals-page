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
}

// ---------- Authentication Functions ----------

// Sign up
async function signup(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User signed up successfully: ", userCredential.user.uid);
    } catch (error) {
        console.error("Sign up failed: ", error.message);
        alert("Sign up failed: " + error.message);
    }
}

// Log in
async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in successfully: ", userCredential.user.uid);
    } catch (error) {
        console.error("Login failed: ", error.message);
        alert("Login failed: " + error.message);
    }
}

// Log out
async function logout() {
    try {
        await signOut(auth);
        console.log("User logged out.");
    } catch (error) {
        console.error("Logout failed: ", error.message);
    }
}

// ---------- Event Listeners ----------

// Vitals form submit
document.getElementById('vitals-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const patient = document.getElementById('patient-select').value;
    const systolic = document.getElementById('systolic').value;
    const diastolic = document.getElementById('diastolic').value;
    const heartrate = document.getElementById('heartrate').value;
    const oxygen = document.getElementById('oxygen').value;

    addVitalSigns(patient, systolic, diastolic, heartrate, oxygen);
    displayVitalSigns();

    // Clear form
    document.getElementById('vitals-form').reset();
});

// Sign up button
document.getElementById('signup-button').addEventListener('click', function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signup(email, password);
});

// Login button
document.getElementById('login-button').addEventListener('click', function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});

// Logout button
document.getElementById('logout-button').addEventListener('click', function() {
    logout();
});

// ---------- Authentication State Listener ----------

onAuthStateChanged(auth, (user) => {
    const authDiv = document.getElementById('auth');
    const appDiv = document.getElementById('app');
    const loadingDiv = document.getElementById('loading');

    // Hide loading once Firebase answers
    loadingDiv.style.display = "none";

    if (user) {
        // Logged in
        authDiv.style.display = 'none';
        appDiv.style.display = 'block';
        console.log("User is logged in:", user.uid);
        displayVitalSigns();
    } else {
        // Logged out
        authDiv.style.display = 'block';
        appDiv.style.display = 'none';
        console.log("User is logged out");
    }
});
