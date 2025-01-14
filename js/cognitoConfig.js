// 1) CONFIG
const cognitoConfig = {
  UserPoolId: "ap-southeast-2_uH4J0jxLc", // <--- Your Pool ID
  ClientId: "59flb735bfbotiog46dfdsh95d", // <--- Your Client ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(cognitoConfig);

// We'll store typed credentials and an error message
export let loginState = {
  username: "",
  password: "",
  selectedField: null, // "username" or "password"
  error: null,
};

export let currentUser = null; // The logged-in user's username

export function handleLogin() {
  return new Promise((resolve, reject) => {
    const authData = {
      Username: loginState.username,
      Password: loginState.password,
    };
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails(
      authData
    );

    const userData = {
      Username: loginState.username,
      Pool: userPool,
    };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    // Optionally force "USER_PASSWORD_AUTH" flow:
    // cognitoUser.setAuthenticationFlowType("USER_PASSWORD_AUTH");

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        console.log("Cognito login success:", result);
        resolve(result);
      },
      onFailure: (err) => {
        console.warn("Cognito login failure:", err);
        reject(err);
      },
    });
  });
}

///////////////////////////////////////////////////////////
// 3) handleSignup
///////////////////////////////////////////////////////////
export function handleSignup() {
  return new Promise((resolve, reject) => {
    userPool.signUp(
      loginState.username,
      loginState.password,
      [], // no additional attributes
      null,
      (err, result) => {
        if (err) {
          console.error("Cognito signup failure:", err);
          return reject(err);
        }
        console.log("Cognito signup success:", result);
        resolve(result);
      }
    );
  });
}

export async function attemptLoginOrSignup(drawMenuCallback) {
  // drawMenuCallback is a function we can call to re-draw the menu
  try {
    await handleLogin();
    // If login success
    loginState.error = null;
    currentUser = loginState.username;
    drawMenuCallback();
  } catch (err) {
    console.warn("Login failed:", err);

    // If user doesn't exist, try signup
    if (err.code === "UserNotFoundException") {
      try {
        await handleSignup();
        // Then auto-login
        await handleLogin();
        currentUser = loginState.username;
        loginState.error = null;
      } catch (signupErr) {
        console.error("Signup failed:", signupErr);
        loginState.error = "Signup error: " + (signupErr.message || signupErr);
      }
    } else {
      loginState.error = "Login error: " + (err.message || err);
    }
    drawMenuCallback();
  }
}
