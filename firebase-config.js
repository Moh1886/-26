import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// يجب استبدال هذه الإعدادات بإعدادات مشروعك الحقيقي من Firebase لاحقاً
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey-PleaseReplaceWithRealKey",
  authDomain: "islamic-app-123.firebaseapp.com",
  projectId: "islamic-app-123",
  storageBucket: "islamic-app-123.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseAuth = auth;
window.firebaseDb = db;

// Auth Functions
window.handleLogin = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

window.handleSignup = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

window.handleLogout = () => {
  return signOut(auth);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Logged in:", user.email);
    window.currentUser = user;
    if(document.getElementById('auth-status')) {
        document.getElementById('auth-status').innerText = `تم تسجيل الدخول كـ: ${user.email}`;
    }
    // load user data from firestore
    loadUserData(user.uid);
  } else {
    console.log("Not logged in");
    window.currentUser = null;
    if(document.getElementById('auth-status')) {
        document.getElementById('auth-status').innerText = ``;
    }
  }
});

async function loadUserData(uid) {
   try {
       const docRef = doc(db, "users", uid);
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
           const data = docSnap.data();
           if(data.tasbihTotal) {
               window.tasbihTotal = data.tasbihTotal;
               const totalElem = document.getElementById('tasbih-total');
               if(totalElem) totalElem.innerText = window.tasbihTotal;
           }
       }
   } catch(e) {
       console.error("Error loading user data", e);
   }
}

window.saveUserData = async (uid, data) => {
    try {
        await setDoc(doc(db, "users", uid), data, { merge: true });
    } catch(e) {
        console.error("Error saving user data", e);
    }
};
