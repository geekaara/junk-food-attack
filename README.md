# Junk Food Attack: A Top-Down Shooter Game

Junk Food Attack is a browser-based top-down shooter game where players defend against waves of enemy junk food ships.

The game features a player-controlled character that must survive increasingly difficult waves of enemy ships. Players can move in all directions and shoot lasers to destroy incoming enemies. The game includes multiple enemy types, each with unique characteristics and behaviors.

Key features of Junk Food Attack include:
- Dynamic gameplay with increasing difficulty
- Multiple enemy types (burgers, fries, and sodas)
- Score tracking and level progression
- Browser-based gameplay with canvas rendering
- Asset loading from Amazon S3 for improved performance

## Repository Structure

```
.
├── bucket-policy.json
├── deploy.sh
├── index.html
├── js
│   └── game.js
└── upload_assets.py
```

### Key Files

- `index.html`: The main HTML file that loads the game
- `js/game.js`: Contains the core game logic and rendering code
- `deploy.sh`: Deployment script for setting up AWS infrastructure
- `upload_assets.py`: Python script for uploading game assets to Amazon S3
- `bucket-policy.json`: S3 bucket policy for public read access

## Usage Instructions

### Installation

Prerequisites:
- Node.js (v14 or later)
- Python 3.7+
- AWS CLI configured with appropriate credentials

Steps:
1. Clone the repository:
   ```
   git clone <repository-url>
   cd junk-food-attack
   ```

2. Install dependencies (if any):
   ```
   npm install
   ```

3. Upload assets to S3:
   ```
   python upload_assets.py
   ```

4. Deploy the game:
   ```
   ./deploy.sh
   ```

### Configuration

1. S3 Bucket: Update the `bucket-policy.json` file with your S3 bucket name:
   ```json
   {
     "Resource": "arn:aws:s3:::your-bucket-name/*"
   }
   ```

2. Deployment: Modify the `deploy.sh` script to set your desired AWS region, S3 bucket name, and CloudFront settings.

3. Asset Upload: In `upload_assets.py`, update the `bucket_name` variable with your chosen S3 bucket name.

### Running Locally

To run the game locally for development:

1. Start a local web server in the project root:
   ```
   python -m http.server 8000
   ```

2. Open a web browser and navigate to `http://localhost:8000`

### Deployment

To deploy the game to AWS:

1. Ensure your AWS CLI is configured with the correct credentials and region.

2. Run the deployment script:
   ```
   ./deploy.sh
   ```

3. The script will output the S3 website endpoint and CloudFront distribution URL (if configured).

## Data Flow

The game's data flow follows this sequence:

1. Asset Loading: Game assets (images, fonts) are loaded from Amazon S3.
2. Game Initialization: The game state, player, and initial enemies are set up.
3. Game Loop:
   a. User Input: Player movement and shooting are processed.
   b. Game Logic: Enemy movement, collision detection, and scoring are updated.
   c. Rendering: The game state is drawn to the canvas.
4. State Management: The game switches between menu, playing, and lost states.

```
[S3 Assets] -> [Asset Loading] -> [Game Initialization]
                                         |
                                         v
[User Input] -> [Game Loop] <- [State Management]
                    |
                    v
               [Rendering]
```

## Infrastructure

The game utilizes the following AWS resources:

### S3
- Bucket: `junk-food-attack-game`
  - Purpose: Hosts the game assets and website files
  - Configuration: Public read access enabled for web hosting

### CloudFront (Optional)
- Distribution:
  - Purpose: Content delivery network for improved global performance
  - Configuration: 
    - Origin: S3 website endpoint
    - Viewer Protocol Policy: Redirect HTTP to HTTPS (if SSL certificate provided)
    - Default Root Object: index.html

### Route 53 (Not explicitly defined, but mentioned in deploy.sh)
- DNS Configuration:
  - Purpose: Map custom domain to CloudFront distribution (if configured)

## Troubleshooting

### Common Issues

1. Assets not loading
   - Problem: Game assets (images, fonts) fail to load
   - Possible causes:
     a. S3 bucket permissions are incorrect
     b. Asset URLs in `game.js` are outdated
   - Solution:
     a. Verify the S3 bucket policy allows public read access
     b. Update asset URLs in `game.js` to match your S3 bucket name

2. Deployment fails
   - Problem: The `deploy.sh` script encounters errors
   - Possible causes:
     a. AWS CLI not configured correctly
     b. Insufficient IAM permissions
   - Solution:
     a. Run `aws configure` to set up your AWS credentials
     b. Ensure your IAM user has the necessary permissions for S3 and CloudFront

### Debugging

To enable debug mode:

1. Open `js/game.js` in a text editor
2. Locate the `DEBUG` constant at the top of the file
3. Set `DEBUG = true`
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
   - Consider using a CDN (like CloudFront) for global distribution

If performance issues persist, profile the game using browser dev tools to identify bottlenecks in the JavaScript execution.