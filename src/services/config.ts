/** Firebase ayarları. Değişken adları eski CRA sürümüyle aynı (REACT_APP_*). */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY as string | undefined,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.REACT_APP_FIREBASE_APP_ID as string | undefined,
  measurementId: env.REACT_APP_FIREBASE_MEASUREMENT_ID as string | undefined,
};

/** Yerel geliştirme / testler için Firebase Emulator Suite (derleme anında sabit) */
export const useEmulators: boolean = __USE_EMULATORS__;

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
