import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOLbYKS84HB7C1h4ySLvvQF3ET-Xdli9s",
  authDomain: "studio-4866279312-20f76.firebaseapp.com",
  projectId: "studio-4866279312-20f76",
  storageBucket: "studio-4866279312-20f76.firebasestorage.app",
  messagingSenderId: "329743428077",
  appId: "1:329743428077:web:441201ca4db4ac89631fe4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkNames() {
  try {
    const q = query(collection(db, "children"));
    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({id: d.id, name: d.data().name}));
    console.log("All children:", users.slice(0, 10));
    
    const inoues = users.filter(u => u.name && u.name.includes("井上みゆき"));
    console.log("Found 井上みゆき:", inoues);
  } catch (error) {
    console.error("Error:", error);
  }
}
checkNames();
