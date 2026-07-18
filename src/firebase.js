import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase project config (from the "john-fish" Firebase project).
// The Web API key below is meant to be public in client bundles -- Firebase
// enforces access via Realtime Database Security Rules, not by hiding this key.
const firebaseConfig = {
  apiKey: 'AIzaSyCkcTwp77-mOeTAuZ8xJN3S60fieiBGg7U',
  authDomain: 'john-fish.firebaseapp.com',
  // TODO verify: open Firebase Console > Build > Realtime Database and copy the
  // exact URL shown at the top of the data viewer. Older projects look like
  // https://john-fish-default-rtdb.firebaseio.com, newer regional projects look
  // like https://john-fish-default-rtdb.<region>.firebasedatabase.app
  databaseURL: 'https://john-fish-default-rtdb.firebaseio.com',
  projectId: 'john-fish',
  storageBucket: 'john-fish.firebasestorage.app',
  messagingSenderId: '92849505612',
  appId: '1:92849505612:web:9f7d45aaa5df0518797be9',
  measurementId: 'G-7MY4DNYNEZ',
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
