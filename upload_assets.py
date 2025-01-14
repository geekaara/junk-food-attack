import boto3
import os

def upload_assets_to_s3(local_assets_path, bucket_name):
    s3 = boto3.client('s3')
    
    # First, create the bucket
    try:
        s3.create_bucket(
            Bucket=bucket_name,
            CreateBucketConfiguration={'LocationConstraint': 'ap-southeast-2'}  # Your configured region
        )
        print(f"Created bucket: {bucket_name}")
    except s3.exceptions.BucketAlreadyExists:
        print(f"Bucket {bucket_name} already exists")
    except Exception as e:
        print(f"Error creating bucket: {e}")
        return

    # Upload each asset
    for filename in os.listdir(local_assets_path):
        if filename.endswith(('.png', '.ttf')):
            file_path = os.path.join(local_assets_path, filename)
            s3_path = f"assets/{filename}"
            
            print(f"Uploading {filename} to S3...")
            try:
                with open(file_path, 'rb') as file:
                    s3.upload_fileobj(file, bucket_name, s3_path)
                print(f"Successfully uploaded {filename}")
            except Exception as e:
                print(f"Error uploading {filename}: {e}")

# Use a unique bucket name - S3 buckets must be globally unique
bucket_name = "junk-food-attack-assets-aa2025"  # You can change this if it's taken
local_assets_path = "assets"  # Your local assets folder

upload_assets_to_s3(local_assets_path, bucket_name)