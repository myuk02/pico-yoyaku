const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function run() {
  const childId = "nUkQXMeVUdOjDgVUEnUT"; // 井上みゆき
  const childRef = doc(db, "children", childId);
  await updateDoc(childRef, {
    isTodayActive: true,
    lastAttendanceDate: "2026-06-08"
  });
  console.log("Updated 井上みゆき to true!");
  process.exit(0);
}

run().catch(console.error);
