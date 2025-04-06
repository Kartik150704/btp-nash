// src/auth/googleSignInRedirect.js
import { signInWithRedirect } from "firebase/auth";
import { auth, provider } from "./firebase";

const signInWithGoogleRedirect = () => {
  signInWithRedirect(auth, provider);
};

export default signInWithGoogleRedirect;
