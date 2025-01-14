# Junk Food Attack: A Fast-Paced Space Shooter Game

Junk Food Attack is an exciting space shooter game where players defend against waves of enemy fast food ships. Navigate through space, dodge enemy fire, and blast away burgers, fries, and sodas to survive and progress through increasingly challenging levels.

This game is built using Pygame and features a player-controlled ship that must defend against waves of enemy ships firing lasers. The player can move their ship using the WASD keys and fire lasers using the spacebar to destroy the enemies. As the game progresses, the waves of enemies become more numerous and challenging.

## Repository Structure

The repository has a simple structure:

- `main.py`: The main game script containing all game logic and classes
- `assets/`: Directory containing game images (not visible in the tree, but referenced in the code)

## Usage Instructions

### Installation

1. Ensure you have Python 3.x installed on your system.
2. Install Pygame:
   ```
   pip install pygame
   ```

### Running the Game

To start the game, run the following command in the terminal:

```
python main.py
```

### Game Controls

- W: Move Up
- A: Move Left
- S: Move Down
- D: Move Right
- Spacebar: Fire Laser

### Gameplay

1. The game starts with a main menu. Click to begin.
2. Control your ship to avoid enemy fire and collisions.
3. Shoot enemy ships to destroy them and progress through levels.
4. Your health is displayed as a green bar below your ship.
5. The game ends when you run out of lives or your health reaches zero.

### Troubleshooting

If you encounter issues running the game:

1. Ensure all game assets are in the correct `assets/` directory.
2. Verify that Pygame is correctly installed:
   ```
   python -c "import pygame; print(pygame.ver)"
   ```
3. If you see `ImportError: No module named 'pygame'`, reinstall Pygame.

For performance issues:
- Close other applications to free up system resources.
- Reduce the game's FPS by modifying the `fps` variable in the `main()` function if needed.

## Data Flow

The game loop in Junk Food Attack follows this general flow:

1. Initialize game (set up window, load assets)
2. Main menu waits for player input
3. Game loop starts:
   - Handle events (player input)
   - Update game state (move player, enemies, lasers)
   - Check collisions
   - Render graphics
   - Spawn new enemy waves when necessary
4. Game over when player loses all lives or health

```
[Main Menu] -> [Game Initialization] -> [Game Loop] -> [Game Over]
                      ^                     |
                      |                     v
                      +---- [New Level] <---+
```

The `Player`, `Enemy`, and `Laser` classes manage their respective entities, while the main game loop in the `main()` function orchestrates the overall game flow.