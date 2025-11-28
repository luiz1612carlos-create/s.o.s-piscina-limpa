
// This is a workaround for the no-build-tool environment
declare const firebase: any;

// Initialize Firebase
const firebaseConfig = (window as any).firebaseConfig;
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const firebaseExport = firebase;

export { auth, db, firebaseExport as firebase };
