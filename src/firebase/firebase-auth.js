import { initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

//  for development
// if (process.env.NODE_ENV === 'development') {
//   auth.settings.appVerificationDisabledForTesting = true;
// }

export { auth, RecaptchaVerifier, signInWithPhoneNumber };

// VITE_GOOGLE_MAPS_KEY="AIzaSyAk4WgZpl2DuYxnfgYLCXEQKvVLK3hJ7S0"
// VITE_RAZARPAY_KEY="rzp_test_6OPTIZsNbmHwoY"
// VITE_SECRET_KEY="your_super_secret_key_125^$^ggjgg"






// VITE_FIREBASE_API_KEY=AIzaSyAk4WgZpl2DuYxnfgYLCXEQKvVLK3hJ7S0
// VITE_FIREBASE_AUTH_DOMAIN=v3careapp-1560246438112.firebaseapp.com
// VITE_FIREBASE_DATABASE_URL=https://v3careapp-1560246438112.firebaseio.com
// VITE_FIREBASE_PROJECT_ID=v3careapp-1560246438112
// VITE_FIREBASE_STORAGE_BUCKET=v3careapp-1560246438112.firebasestorage.app
// VITE_FIREBASE_MESSAGING_SENDER_ID=857656837080


// VITE_FIREBASE_APP_ID=1:857656837080:web:44cca1388e47bb39f5e8ad

