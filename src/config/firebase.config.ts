import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

let firebaseAdmin: admin.app.App;

export const initializeFirebase = (
  configService: ConfigService,
): admin.app.App => {
  if (!firebaseAdmin) {
    const projectId = configService.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = configService.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = configService.get<string>("FIREBASE_PRIVATE_KEY");

    if (projectId && clientEmail && privateKey) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      console.log("✅ Firebase Admin initialized successfully");
    } else {
      console.warn(
        "⚠️ Firebase credentials not configured. Running without Firebase.",
      );
    }
  }

  return firebaseAdmin;
};

export const getFirebaseAdmin = (): admin.app.App => {
  if (!firebaseAdmin) {
    throw new Error(
      "Firebase Admin not initialized. Call initializeFirebase first.",
    );
  }
  return firebaseAdmin;
};

export const getFirestore = (): admin.firestore.Firestore => {
  return getFirebaseAdmin().firestore();
};

export const getAuth = (): admin.auth.Auth => {
  return getFirebaseAdmin().auth();
};

export const getStorage = (): admin.storage.Storage => {
  return getFirebaseAdmin().storage();
};
