import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function checkUser() {
  const docRef = doc(db, "children", "PO894rreclpDwWfwENZg");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log("Found user PO894rreclpDwWfwENZg:", snap.data());
  } else {
    console.log("User PO894rreclpDwWfwENZg not found!");
  }

  const docRef2 = doc(db, "children", "ULPikDEEvs2C9nzikWv6");
  const snap2 = await getDoc(docRef2);
  if (snap2.exists()) {
    console.log("Found user ULPikDEEvs2C9nzikWv6:", snap2.data());
  } else {
    console.log("User ULPikDEEvs2C9nzikWv6 not found!");
  }
}
checkUser();
