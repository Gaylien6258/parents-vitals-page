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
const auth = firebase.auth();
console.log("Firebase initialized");

// ---------- Debug Elements ----------
const loadingDiv = document.getElementById('loading');
const authDiv = document.getElementById('auth');
const appDiv = document.getElementById('app');

// ---------- Authentication Functions ----------
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

// ---------- Auth State Listener ----------
auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user);
    loadingDiv.style.display = "none";

    if (user) {
        console.log("User is logged in:", user.email);
        authDiv.style.display = "none";
        appDiv.style.display = "block";
    } else {
        console.log("User is logged out");
        authDiv.style.display = "block";
        appDiv.style.display = "none";
    }
});
