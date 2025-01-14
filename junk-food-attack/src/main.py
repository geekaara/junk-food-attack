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
        # Save font to a temporary file
        temp_font_path = os.path.join('/tmp', font_name)
        with open(temp_font_path, 'wb') as f:
            f.write(font_data)
        return pygame.font.Font(temp_font_path, size)
    except Exception as e:
        print(f"Error loading font {font_name}: {e}")
        return None