import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import appConfig from '../config/appConfig';

let firebaseApp;
let messagingInstance;

const getFirebaseConfig = () => ({
  apiKey: appConfig.firebase.apiKey,
  authDomain: appConfig.firebase.authDomain,
  projectId: appConfig.firebase.projectId,
  storageBucket: appConfig.firebase.storageBucket,
  messagingSenderId: appConfig.firebase.messagingSenderId,
  appId: appConfig.firebase.appId,
  measurementId: appConfig.firebase.measurementId,
});

const hasFirebaseConfig = (config) => (
  Boolean(config.apiKey) &&
  Boolean(config.projectId) &&
  Boolean(config.messagingSenderId) &&
  Boolean(config.appId)
);

export const initializeFirebase = async () => {
  const config = getFirebaseConfig();
  if (!hasFirebaseConfig(config)) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
  }

  if (!messagingInstance && typeof window !== 'undefined') {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(firebaseApp);
    }
  }

  return firebaseApp;
};

export const getFirebaseMessagingToken = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const config = getFirebaseConfig();
  if (!hasFirebaseConfig(config)) {
    return null;
  }

  if (!appConfig.firebase.vapidKey) {
    return null;
  }

  await initializeFirebase();

  if (!messagingInstance) {
    return null;
  }

  const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      swUrl.searchParams.set(key, value);
    }
  });

  const registration = await navigator.serviceWorker.register(swUrl.toString());

  return getToken(messagingInstance, {
    vapidKey: appConfig.firebase.vapidKey,
    serviceWorkerRegistration: registration,
  });
};
