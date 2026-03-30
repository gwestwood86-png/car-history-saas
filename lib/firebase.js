import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrCSO7mvbG7VUdXcMSJSJNy7Y04Yomh4Y",
  authDomain: "car-history-saas.firebaseapp.com",
  projectId: "car-history-saas",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);