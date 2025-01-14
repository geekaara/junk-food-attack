///////////////////////////////////////////////////////////
// cognitoConfig.js – Cognito + DynamoDB (highest score) integration
///////////////////////////////////////////////////////////

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
  selectedField: null,
  error: null,
};

// Current logged-in user's "username" (from your front-end perspective)
export let currentUser = null;

// Track the user's highest score (fetched from DynamoDB)
export let globalHighestScore = 0;

// For convenience, store your Identity Pool ID and region here too
const identityPoolId = "ap-southeast-2:17dd68b9-7d46-4a64-b6a0-e5059f549247";
const awsRegion = "ap-southeast-2"; // or your region

///////////////////////////////////////////////////////////
// 2) HANDLE LOGIN
///////////////////////////////////////////////////////////
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
        // result contains accessToken, idToken, refreshToken
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
// 3) HANDLE SIGNUP
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
        // result: { userConfirmed: boolean, userSub: '...', user: CognitoUser }
        resolve(result);
      }
    );
  });
}

///////////////////////////////////////////////////////////
// 4) FETCH HIGHEST SCORE
///////////////////////////////////////////////////////////
async function fetchHighestScore(cognitoResult) {
  // 1) Extract the ID token
  const idToken = cognitoResult.getIdToken().getJwtToken();

  // 2) Configure AWS region + credentials
  AWS.config.region = awsRegion;
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: identityPoolId,
    Logins: {
      // For example: "cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_uH4J0jxLc": idToken
      [`cognito-idp.${awsRegion}.amazonaws.com/${cognitoConfig.UserPoolId}`]:
        idToken,
    },
  });

  // 3) Force refresh to fetch the identity ID
  await new Promise((resolve, reject) => {
    AWS.config.credentials.refresh((err) => {
      if (err) {
        console.error("Error refreshing AWS creds:", err);
        return reject(err);
      }
      resolve();
    });
  });

  const userId = AWS.config.credentials.identityId;
  console.log("Got AWS creds. userId =", userId);

  // 4) Now do a getItem on the "UserScores" table
  const dynamo = new AWS.DynamoDB.DocumentClient();
  try {
    const data = await dynamo
      .get({
        TableName: "UserScores", // Adjust to your actual table name
        Key: { userId },
      })
      .promise();

    const highest = data.Item?.highestScore || 0;
    globalHighestScore = highest;
    console.log("Fetched highestScore from DDB:", highest);
  } catch (dbErr) {
    console.error("Error fetching highestScore:", dbErr);
    globalHighestScore = 0;
  }
}

///////////////////////////////////////////////////////////
// 5) UPDATE HIGH SCORE IF NEEDED
///////////////////////////////////////////////////////////
export async function updateHighScoreIfNeeded(newScore) {
  if (newScore > globalHighestScore) {
    const userId = AWS.config.credentials?.identityId;
    if (!userId) {
      console.warn("No AWS credentials yet—cannot update score.");
      return;
    }

    console.log(
      `Updating high score in Dynamo from ${globalHighestScore} to ${newScore}`
    );
    const dynamo = new AWS.DynamoDB.DocumentClient();

    try {
      await dynamo
        .put({
          TableName: "UserScores",
          Item: {
            userId,
            highestScore: newScore,
          },
        })
        .promise();

      globalHighestScore = newScore;
      console.log("High score updated to", newScore);
    } catch (err) {
      console.error("Failed to update high score in Dynamo:", err);
    }
  }
}

///////////////////////////////////////////////////////////
// 6) ATTEMPT LOGIN OR SIGNUP
///////////////////////////////////////////////////////////
export async function attemptLoginOrSignup(drawMenuCallback) {
  try {
    // 1) Try to log in
    const loginResult = await handleLogin();
    console.log("Login succeeded, user might be confirmed or not.");
    loginState.error = null;
    currentUser = loginState.username;

    // 2) Fetch highest score
    await fetchHighestScore(loginResult);

    // 3) Re-draw the menu
    drawMenuCallback();
  } catch (err) {
    console.warn("Login failed:", err);

    // 4) If user not found => sign up => re-login => fetch score
    if (err.code === "UserNotFoundException") {
      try {
        const signupRes = await handleSignup();
        console.log("Signup result => userConfirmed:", signupRes.userConfirmed);

        // Then auto-login
        const loginResult2 = await handleLogin();
        currentUser = loginState.username;
        loginState.error = null;

        await fetchHighestScore(loginResult2);
      } catch (signupErr) {
        console.error("Signup failed:", signupErr);
        loginState.error = "Signup error: " + (signupErr.message || signupErr);
      }
    } else {
      // Some other error
      loginState.error = "Login error: " + (err.message || err);
    }
    drawMenuCallback();
  }
}
