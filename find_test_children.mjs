import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function findTestChildren() {
  try {
    // Check facilities
    const facSnap = await getDocs(collection(db, "facilities"));
    const facilities = facSnap.docs.map(d => ({id: d.id, ...d.data()}));
    console.log("Facilities found:", facilities);

    const testFac = facilities.find(f => (f.name && f.name.includes("テスト")) || (f.name && f.name.includes("test")));
    let testFacId = testFac ? testFac.id : null;

    if (!testFacId) {
      console.log("No test facility found by name. Looking at all children to infer facility fields...");
    }

    // Fetch all children
    const childSnap = await getDocs(collection(db, "children"));
    const children = childSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    console.log(`Total children found: ${children.length}`);

    if (testFacId) {
      console.log(`Filtering by test facility ID: ${testFacId} (${testFac.name})`);
      const testChildren = children.filter(c => c.facilityId === testFacId || c.facility_id === testFacId || (c.facilities && c.facilities.includes(testFacId)));
      console.log("Test Children:", testChildren.slice(0, 5));
    } else {
      console.log("Sample of 5 children to see their structure:");
      console.log(children.slice(0, 5).map(c => ({id: c.id, name: c.name, facilityId: c.facilityId})));
    }
    
    // Check if there are kids with "テスト" in their name
    const testNamedKids = children.filter(c => c.name && c.name.includes("テスト"));
    console.log("Children with 'テスト' in name:", testNamedKids.map(c => ({id: c.id, name: c.name, facilityId: c.facilityId})));

  } catch (error) {
    console.error("Error:", error);
  }
}

findTestChildren();
