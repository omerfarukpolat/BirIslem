import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseApp } from './app';
import { useEmulators } from './config';

let db: Firestore | null = null;

export function firestore(): Firestore {
  if (!db) {
    db = getFirestore(firebaseApp());
    if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return db;
}
