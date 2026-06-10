const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function check() {
  const querySnapshot = await getDocs(collection(db, "children"));
  console.log("Found", querySnapshot.size, "children:");
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`- ${doc.id}: isTodayActive=${data.isTodayActive}, lastAttendanceDate=${data.lastAttendanceDate}, name=${data.name}`);
  });
  process.exit(0);
}

check().catch(console.error);
