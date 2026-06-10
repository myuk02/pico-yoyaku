import { initializeApp } from "firebase/app";
try {
  initializeApp({
    apiKey: undefined,
    authDomain: undefined,
    projectId: undefined
  });
  console.log("Initialized without error");
} catch(e) {
  console.error("Error:", e.message);
}
