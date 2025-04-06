// src/auth/googleSignIn.js
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, provider } from "./firebase";


const signInWithGoogle = async () => {
  if (localStorage.getItem('userEmail')) {
    return {
      success: true,
      email:localStorage.getItem('userEmail')
    }
  }
  try {
    const result = await signInWithPopup(auth, provider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;


    return {
      success: true,
      email: user.email,

    }

  } catch (error) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    const email = error.customData?.email;
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Error during sign in:", errorCode, errorMessage, email, credential);
    return {
      success: false
    }
    // Optionally, display error messages to the user
  }
};

export default signInWithGoogle;


// import { jwtDecode } from "jwt-decode";
// import { CreateCandidateEntry } from "./api";

// /**
//  * Signs in the user using Google Cloud Identity Services.
//  * Instead of Firebase’s signInWithPopup, we use the GSI client.
//  */
// const signInWithGoogle = async () => {
//   // If a user is already signed in (tracked locally), return success.
//   if (localStorage.getItem("userEmail")) {
//     return { success: true };
//   }

//   return new Promise((resolve, reject) => {
//     // Initialize GSI
//     window.google.accounts.id.initialize({
//       client_id: "282552188535-jdcjtcg12ff042i8cq2ak4rhqc5jc91k.apps.googleusercontent.com",
//       callback: async (response) => {
//         if (response.credential) {
//           try {
//             // Decode the JWT credential to extract user info (e.g., email)
//             const decoded = jwtDecode(response.credential);
//             const email = decoded.email;

//             // Call your API to create a candidate entry
//             const apiResponse = await CreateCandidateEntry(email);
//             if (apiResponse.success) {
//               localStorage.setItem("id", apiResponse.id);
//             }
//             localStorage.setItem("userEmail", email);

//             resolve({ success: true, email, id: apiResponse.id });
//           } catch (error) {
//             console.error("Error decoding credential or calling API:", error);
//             reject({ success: false, error: error.message });
//           }
//         } else {
//           console.error("No credential returned from Google Identity Services.");
//           reject({ success: false, error: "No credential returned." });
//         }
//       },
//     });

//     // Display the sign-in prompt.
//     window.google.accounts.id.prompt((notification) => {
//       // Optionally handle the notification:
//       if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
//         reject({
//           success: false,
//           error: "Google sign-in prompt was not displayed or was skipped.",
//         });
//       }
//     });
//   });
// };

// export default signInWithGoogle;
