import { initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig);
  return app;
}
