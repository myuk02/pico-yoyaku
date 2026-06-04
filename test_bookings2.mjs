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
    const snap = await getDocs(collection(db, "children"));
    console.log("children count:", snap.docs.length);
    if (snap.docs.length > 0) {
      const child = snap.docs[0];
      console.log("child id:", child.id);
      
      // Let's query collectionGroups to find what exists
      const bookingsGroup = await getDocs(collectionGroup(db, "bookings"));
      console.log("bookings group count:", bookingsGroup.docs.length);
      
      const schedulesGroup = await getDocs(collectionGroup(db, "schedules"));
      console.log("schedules group count:", schedulesGroup.docs.length);
      
      const reservationsGroup = await getDocs(collectionGroup(db, "reservations"));
      console.log("reservations group count:", reservationsGroup.docs.length);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
testFetch();
