# Junk Food Attack: A Top-Down Shooter Game

Junk Food Attack is a browser-based top-down shooter game where players defend their health against waves of junk-food. The main aim is to make people eat healthy.

The game features humans who must survive increasingly difficult temptation to eat junk food. Players can move in all directions and shoot lasers to destroy incoming junks.

Key features of Junk Food Attack include:

- Dynamic gameplay with increasing difficulty
- Multiple junk foods (burgers, fries, and sodas)
- Score tracking and level progression
- Browser-based gameplay with canvas rendering
- Asset loading from Amazon S3 for improved performance
- User authentication and high score tracking with Amazon Cognito and DynamoDB

## Repository Structure

```
.
├── index.html
├── js
│   ├── assets.js
│   ├── cognitoConfig.js
│   ├── gameCore.js
│   └── main.js
├── README.md
└── upload_assets.py
```

### Key Files

- `index.html`: The main HTML file that loads the game
- `js/assets.js`: Manages game assets and screen dimensions
- `js/cognitoConfig.js`: Handles user authentication and high score tracking
- `js/gameCore.js`: Contains the core game logic and rendering code
- `js/main.js`: The main entry point, tying everything together
- `upload_assets.py`: Python script for uploading game assets to Amazon S3

## Usage Instructions

### Installation

Prerequisites:

- Python 3.7+
- AWS CLI configured with appropriate credentials

Steps:

1. Clone the repository:

   ```
   git clone <repository-url>
   cd junk-food-attack
   ```

2. Upload assets to S3:
   ```
   python upload_assets.py
   ```

### Configuration

1. Cognito: Update the `cognitoConfig.js` file with your Cognito User Pool ID, Client ID, and Identity Pool ID.

2. S3: In `assets.js`, update the `S3_BASE` constant with your S3 bucket URL.

3. DynamoDB: Ensure you have a "UserScores" table set up in DynamoDB.

### Running Locally

To run the game locally for development:

1. Just open the index.html either directly or through a live server

### Deployment

To deploy the game:

1. Ensure your AWS CLI is configured with the correct credentials and region.

2. Upload the HTML and JS files to your S3 bucket configured for static website hosting.

3. Ensure your S3 bucket has the correct CORS configuration to allow access from your domain.

## Data Flow

The game's data flow follows this sequence:

1. User Authentication: Players log in or sign up using Amazon Cognito.
2. Asset Loading: Game assets (images, fonts) are loaded from Amazon S3.
3. Game Initialization: The game state, player, and initial enemies are set up.
4. Game Loop:
   a. User Input: Player movement and shooting are processed.
   b. Game Logic: Enemy movement, collision detection, and scoring are updated.
   c. Rendering: The game state is drawn to the canvas.
5. State Management: The game switches between menu, playing, and lost states.
6. High Score Tracking: The player's highest score is fetched from and updated in DynamoDB.

```
[Cognito] -> [User Authentication] -> [S3 Assets] -> [Asset Loading] -> [Game Initialization]
                                                                              |
                                                                              v
[User Input] -> [Game Loop] <- [State Management]
                    |
                    v
               [Rendering]
                    |
                    v
             [DynamoDB] <- [High Score Tracking]
```

## Infrastructure

The game utilizes the following AWS resources:

### S3

- Bucket: `junk-food-attack-assets-aa2025`
  - Purpose: Hosts the game assets and website files
  - Configuration: Public read access enabled for web hosting

### Cognito

- User Pool and Identity Pool:
  - Purpose: Handles user authentication and authorization

### DynamoDB

- Table: "UserScores"
  - Purpose: Stores and retrieves user high scores

### DynamoDB

- Amazon Q"
  - Purpose: Getting help in writing code and navigating aws

## Troubleshooting

### Common Issues

1. Assets not loading

   - Problem: Game assets (images, fonts) fail to load
   - Possible causes:
     a. S3 bucket permissions are incorrect
     b. Asset URLs in `assets.js` are outdated
   - Solution:
     a. Verify the S3 bucket policy allows public read access
     b. Update asset URLs in `assets.js` to match your S3 bucket name

2. Authentication fails
   - Problem: Unable to log in or sign up
   - Possible causes:
     a. Cognito configuration in `cognitoConfig.js` is incorrect
     b. Cognito User Pool or Identity Pool not set up correctly
   - Solution:
     a. Verify the Cognito settings in `cognitoConfig.js`
     b. Check your Cognito setup in the AWS Console

### Debugging

To enable debug mode:

1. Open `js/main.js` in a text editor
2. Look for a `DEBUG` or similar constant
3. Set it to `true`
4. Refresh the game in your browser

Debug output will be logged to the browser console. Access it by:

- Chrome/Firefox: Right-click > Inspect > Console tab
- Safari: Develop > Show Web Inspector > Console tab

### Performance Optimization

To optimize game performance:

1. Monitor frame rate:

   - Open browser dev tools
   - Run `requestAnimationFrame(() => console.log(frameCount))` in the console
   - A stable 60 FPS is ideal

2. Reduce draw calls:

   - Group similar objects (e.g., enemies) into sprite sheets
   - Use canvas layers for static elements

3. Asset loading:
   - Ensure all assets are properly compressed
   - Verify that the S3 bucket is in the same region as your primary user base

If performance issues persist, profile the game using browser dev tools to identify bottlenecks in the JavaScript execution.
