
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyB82otnxaf4Zv4gJpoQjNTq2eJjdJVFgiQ",
  authDomain: "logio-prod.firebaseapp.com",
  projectId: "logio-prod",
  storageBucket: "logio-prod.firebasestorage.app",
  messagingSenderId: "293378908626",
  appId: "1:293378908626:web:795e9be2ab7f4e500d280b",
  measurementId: "G-7G0T8T999Z"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
