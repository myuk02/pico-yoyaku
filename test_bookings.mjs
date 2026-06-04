import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, collectionGroup } from "firebase/firestore";

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

async function testFetch() {
  try {
    const snap = await getDocs(collectionGroup(db, "bookings"));
    console.log("bookings count:", snap.docs.length);
    if (snap.docs.length > 0) {
      console.log("booking 0 data:", snap.docs[0].data());
      console.log("booking 0 path:", snap.docs[0].ref.path);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
testFetch();
