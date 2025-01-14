import pygame
import io
import os
import random
import boto3
from pygame import mixer

pygame.init()
mixer.init()

pygame.font.init()

# S3 Configuration
s3 = boto3.client('s3')
BUCKET_NAME = "junk-food-attack-assets-aa2025"

def load_image_from_s3(image_name):
    """Load image from S3 and convert to Pygame surface"""
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=f"assets/{image_name}")
        image_data = response['Body'].read()
        # Convert image data to a pygame surface
        return pygame.image.load(io.BytesIO(image_data)).convert_alpha()
    except Exception as e:
        print(f"Error loading {image_name}: {e}")
        return None

def load_font_from_s3(font_name, size):
    """Load font from S3 at runtime, store in /tmp, then load via Pygame"""
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=f"assets/{font_name}")
        font_data = response['Body'].read()

        # Save font temporarily to /tmp
        temp_path = f"/tmp/{font_name}"
        with open(temp_path, 'wb') as f:
            f.write(font_data)

        return pygame.font.Font(temp_path, size)
    except Exception as e:
        print(f"Error loading font {font_name}: {e}")
        # Fallback to a default font
        return pygame.font.SysFont('arial', size)

# Screen dimensions
SCREEN_WIDTH, SCREEN_HEIGHT = 750, 750
SCREEN = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Junk Food Attack")

# ---- LOAD IMAGES & FONTS FROM S3 ----
BURGER_IMG = load_image_from_s3("burger.png")
FRIES_IMG = load_image_from_s3("fries.png")
SODA_IMG   = load_image_from_s3("soda.png")
PLAYER_IMG = load_image_from_s3("player.png")

LASER_RED    = load_image_from_s3("laser_red.png")
LASER_GREEN  = load_image_from_s3("laser_green.png")
LASER_BLUE   = load_image_from_s3("laser_blue.png")
LASER_YELLOW = load_image_from_s3("laser_yellow.png")

raw_background = load_image_from_s3("background.png")
BACKGROUND = pygame.transform.scale(raw_background, (SCREEN_WIDTH, SCREEN_HEIGHT)) if raw_background else None

# Load fonts from S3
main_font   = load_font_from_s3("Jersey15-Regular.ttf", 50)
lost_font   = load_font_from_s3("Jersey15-Regular.ttf", 60)
title_font  = load_font_from_s3("Jersey15-Regular.ttf", 70)
button_font = load_font_from_s3("Jersey15-Regular.ttf", 45)

def collide(obj1, obj2):
    """
    Checks whether two masked objects overlap.
    Returns True if they collide, False otherwise.
    """
    offset_x = obj2.x - obj1.x
    offset_y = obj2.y - obj1.y
    return obj1.mask.overlap(obj2.mask, (offset_x, offset_y)) is not None

class Laser:
    """
    Represents a laser projectile within the game.
    Responsible for movement, off-screen checks, and collision detection.
    """
    def __init__(self, x, y, image):
        self.x = x
        self.y = y
        self.img = image
        self.mask = pygame.mask.from_surface(self.img) if image else None

    def draw(self, surface):
        if self.img:
            surface.blit(self.img, (self.x, self.y))

    def move(self, velocity):
        self.y += velocity

    def off_screen(self, height):
        return not (0 <= self.y <= height)

    def collision(self, target):
        return collide(self, target)

class Ship:
    """
    Base class for any ship-like entity (player or enemies).
    Handles drawing, laser cooldowns, and basic interactions.
    """
    COOLDOWN = 30  # frames between shots

    def __init__(self, x, y, health=100):
        self.x = x
        self.y = y
        self.health = health
        self.ship_img = None
        self.laser_img = None
        self.lasers = []
        self.cool_down_counter = 0

    def draw(self, surface):
        if self.ship_img:
            surface.blit(self.ship_img, (self.x, self.y))
        for laser in self.lasers:
            laser.draw(surface)

    def move_lasers(self, velocity, obj):
        """
        Updates laser positions and checks collision with a single object.
        """
        self._handle_cooldown()
        for laser in self.lasers[:]:
            laser.move(velocity)
            if laser.off_screen(SCREEN_HEIGHT):
                self.lasers.remove(laser)
            elif laser.collision(obj):
                obj.health -= 10
                self.lasers.remove(laser)

    def _handle_cooldown(self):
        """
        Manages the cooldown logic so lasers can't be fired endlessly.
        """
        if self.cool_down_counter >= self.COOLDOWN:
            self.cool_down_counter = 0
        elif self.cool_down_counter > 0:
            self.cool_down_counter += 1

    def shoot(self):
        """
        Fires a laser if cooldown is zero.
        """
        if self.cool_down_counter == 0 and self.laser_img:
            laser = Laser(self.x, self.y, self.laser_img)
            self.lasers.append(laser)
            self.cool_down_counter = 1

    def get_width(self):
        return self.ship_img.get_width() if self.ship_img else 0

    def get_height(self):
        return self.ship_img.get_height() if self.ship_img else 0

class Player(Ship):
    """
    Player-controlled ship with a health bar overlay.
    """
    def __init__(self, x, y, health=100):
        super().__init__(x, y, health)
        self.ship_img = PLAYER_IMG
        self.laser_img = LASER_YELLOW
        if self.ship_img:
            self.mask = pygame.mask.from_surface(self.ship_img)
        else:
            self.mask = None
        self.max_health = health

    def move_lasers(self, velocity, targets):
        """
        Moves each laser and checks for collisions with a list of targets.
        Returns how many enemies were destroyed for scoring.
        """
        self._handle_cooldown()
        destroyed_enemies = 0
        for laser in self.lasers[:]:
            laser.move(velocity)
            if laser.off_screen(SCREEN_HEIGHT):
                self.lasers.remove(laser)
            else:
                for obj in targets[:]:
                    if laser.collision(obj):
                        targets.remove(obj)
                        destroyed_enemies += 1
                        if laser in self.lasers:
                            self.lasers.remove(laser)
        return destroyed_enemies

    def draw(self, surface):
        super().draw(surface)
        self._draw_healthbar(surface)

    def _draw_healthbar(self, surface):
        """
        Renders the player's health bar below the ship.
        """
        if not self.ship_img:
            return
        bar_width = self.ship_img.get_width()
        bar_height = 10
        pygame.draw.rect(surface, (255, 0, 0),
                         (self.x, self.y + self.get_height() + 10,
                          bar_width, bar_height))
        green_width = bar_width * (self.health / self.max_health)
        pygame.draw.rect(surface, (0, 255, 0),
                         (self.x, self.y + self.get_height() + 10,
                          green_width, bar_height))

class Enemy(Ship):
    """
    Enemy unit with different color (fast-food) types and lasers.
    """
    COLOR_MAP = {
        "red":   (BURGER_IMG, LASER_RED),
        "green": (FRIES_IMG, LASER_GREEN),
        "blue":  (SODA_IMG, LASER_BLUE)
    }

    def __init__(self, x, y, color, health=100):
        super().__init__(x, y, health)
        self.ship_img, self.laser_img = self.COLOR_MAP[color]
        if self.ship_img:
            self.mask = pygame.mask.from_surface(self.ship_img)

    def move(self, velocity):
        self.y += velocity

    def shoot(self):
        """
        Fires a laser from the enemy ship if cooldown allows.
        Slight offset so the laser appears from the enemy's center.
        """
        if self.cool_down_counter == 0 and self.laser_img:
            laser = Laser(self.x - 20, self.y, self.laser_img)
            self.lasers.append(laser)
            self.cool_down_counter = 1

def main():
    """
    Primary game loop handling events, rendering,
    and spawning enemies in waves.
    """
    run = True
    fps = 60
    level = 0
    lives = 5
    
    score = 0
    enemies = []
    wave_length = 5
    enemy_vel = 1

    player_vel = 5
    laser_vel = 5

    player = Player(300, 630)
    clock = pygame.time.Clock()
    lost = False
    lost_count = 0

    def redraw_window():
        if BACKGROUND:
            SCREEN.blit(BACKGROUND, (0, 0))
        else:
            SCREEN.fill((0,0,0))  # Fallback if background is None

        # Render Lives, Level, Score in red using Jersey font
        lives_label = main_font.render(f"Lives: {lives}", True, (255, 0, 0))
        level_label = main_font.render(f"Level: {level}", True, (255, 0, 0))
        score_label = main_font.render(f"Score: {score}", True, (255, 0, 0))

        SCREEN.blit(lives_label, (10, 10))
        SCREEN.blit(level_label, (SCREEN_WIDTH - level_label.get_width() - 10, 10))
        SCREEN.blit(score_label, ((SCREEN_WIDTH - score_label.get_width()) // 2, 10))

        # Draw enemies
        for enemy_entity in enemies:
            enemy_entity.draw(SCREEN)

        # Draw the player
        player.draw(SCREEN)

        if lost:
            lost_text = lost_font.render("You Lost!!", True, (255, 0, 0))
            SCREEN.blit(lost_text, (SCREEN_WIDTH / 2 - lost_text.get_width() / 2, 350))
            
            final_score_text = lost_font.render(f"Final Score: {score}", True, (255, 0, 0))
            SCREEN.blit(final_score_text, (SCREEN_WIDTH / 2 - final_score_text.get_width() / 2, 420))

        pygame.display.update()

    while run:
        clock.tick(fps)
        redraw_window()

        if lives <= 0 or player.health <= 0:
            lost = True
            lost_count += 1

        if lost:
            if lost_count > fps * 3:
                run = False
            else:
                continue

        # Spawn new wave if all enemies are gone
        if len(enemies) == 0:
            level += 1
            wave_length += 5
            for i in range(wave_length):
                x_pos = random.randrange(50, SCREEN_WIDTH - 100)
                y_pos = random.randrange(-1500, -100)
                color_type = random.choice(["red", "blue", "green"])
                enemy_unit = Enemy(x_pos, y_pos, color_type)
                enemies.append(enemy_unit)

        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return

        # Movement inputs
        keys = pygame.key.get_pressed()
        if keys[pygame.K_a] and player.x - player_vel > 0:  
            player.x -= player_vel
        if keys[pygame.K_d] and player.x + player_vel + player.get_width() < SCREEN_WIDTH:
            player.x += player_vel
        if keys[pygame.K_w] and player.y - player_vel > 0:
            player.y -= player_vel
        if keys[pygame.K_s] and player.y + player_vel + player.get_height() + 15 < SCREEN_HEIGHT:
            player.y += player_vel
        if keys[pygame.K_SPACE]:
            player.shoot()

        # Move enemies and their lasers
        for enemy_entity in enemies[:]:
            enemy_entity.move(enemy_vel)
            enemy_entity.move_lasers(laser_vel, player)

            if random.randrange(0, 2 * 60) == 1:
                enemy_entity.shoot()

            if collide(enemy_entity, player):
                player.health -= 10
                enemies.remove(enemy_entity)
            elif enemy_entity.y + enemy_entity.get_height() > SCREEN_HEIGHT:
                lives -= 1
                enemies.remove(enemy_entity)

        # Move player's lasers and check collisions
        destroyed_enemies = player.move_lasers(-laser_vel, enemies)
        score += destroyed_enemies

def main_menu():
    """
    Main menu loop with a clickable "Start" button.
    """
    # If we can't load the background for some reason, fallback to a solid color
    run = True
    button_width = 200
    button_height = 60
    button_x = (SCREEN_WIDTH - button_width) // 2
    button_y = 450  
    start_button_rect = pygame.Rect(button_x, button_y, button_width, button_height)

    while run:
        if BACKGROUND:
            SCREEN.blit(BACKGROUND, (0, 0))
        else:
            SCREEN.fill((30, 30, 30))  # fallback background

        # Render the title in red
        title_text = title_font.render("Junk Food Attack!", True, (255, 0, 0))
        SCREEN.blit(title_text, (SCREEN_WIDTH // 2 - title_text.get_width() // 2, 300))
        
        # Draw the Start Button
        pygame.draw.rect(SCREEN, (0, 128, 0), start_button_rect)
        start_text = button_font.render("START", True, (255, 255, 255))
        text_rect = start_text.get_rect(center=start_button_rect.center)
        SCREEN.blit(start_text, text_rect)
        
        pygame.display.update()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            if event.type == pygame.MOUSEBUTTONDOWN:
                if start_button_rect.collidepoint(event.pos):
                    main()

if __name__ == "__main__":
    main_menu()



