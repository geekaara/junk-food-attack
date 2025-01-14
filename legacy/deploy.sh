#!/usr/bin/env bash

###############################################################################
# 1) USER CONFIG: CHANGE THESE VARIABLES
###############################################################################
BUCKET_NAME="junk-food-attack-website-2025-aara"
AWS_REGION="ap-southeast-2"
PROFILE="default"  # your AWS CLI profile
LOCAL_BUILD_FOLDER="."  # folder containing index.html, game.js, etc.

# For CloudFront
CF_COMMENT="JunkFoodAttack Distribution"
ACM_CERT_ARN=""   # Keep empty if you don’t want HTTPS
CUSTOM_DOMAIN=""  # e.g. "mygame.example.com" (optional, leave empty if no custom domain)

###############################################################################
# 2) CREATE THE S3 BUCKET & ENABLE STATIC WEBSITE HOSTING
###############################################################################
echo "Creating S3 bucket: $BUCKET_NAME (region: $AWS_REGION)"
aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION" --profile "$PROFILE"

echo "Disabling public access block (allowing public read for website hosting)."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false \
  --profile "$PROFILE"

echo "Setting up Bucket Policy to allow public GET (needed for S3 website hosting)."
cat <<EOF > /tmp/bucket-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy file:///tmp/bucket-policy.json \
  --profile "$PROFILE"

echo "Enabling static website hosting (index.html)."
aws s3 website "s3://$BUCKET_NAME" \
  --index-document index.html \
  --error-document index.html \
  --profile "$PROFILE"

###############################################################################
# 3) SYNC LOCAL BUILD TO S3
###############################################################################
echo "Syncing local folder ($LOCAL_BUILD_FOLDER) to S3..."
aws s3 sync "$LOCAL_BUILD_FOLDER" "s3://$BUCKET_NAME" --profile "$PROFILE"

WEBSITE_ENDPOINT="$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
echo "Website is now potentially available at http://$WEBSITE_ENDPOINT"
echo "-----------------------------------------------"

###############################################################################
# 4) CREATE A CLOUDFRONT DISTRIBUTION (OPTIONAL)
###############################################################################
if [ -z "$ACM_CERT_ARN" ]; then
  echo "No ACM_CERT_ARN provided. Creating a basic HTTP (non-HTTPS) CloudFront distribution..."
  CF_OUTPUT=$(aws cloudfront create-distribution \
    --origin-domain-name "$WEBSITE_ENDPOINT" \
    --default-root-object "index.html" \
    --profile "$PROFILE" \
    --query "Distribution.{Id:Id,DomainName:DomainName}" \
    --output json)
else
  echo "Creating an HTTPS-enabled CloudFront distribution with ACM cert..."
  # If you have a custom domain & ACM cert in us-east-1:
  #  - The origin is your bucket's website endpoint
  #  - The ViewerCertificate block references your ACM cert
  #  - The Aliases block references your CUSTOM_DOMAIN
  CF_CONFIG=$(cat <<-EOC
{
  "CallerReference": "$(date +%s)",
  "Comment": "$CF_COMMENT",
  "Aliases": {
    "Quantity": 1,
    "Items": ["$CUSTOM_DOMAIN"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$BUCKET_NAME",
        "DomainName": "$WEBSITE_ENDPOINT",
        "OriginPath": "",
        "CustomHeaders": {
          "Quantity": 0
        },
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$BUCKET_NAME",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"},
      "Headers": {"Quantity": 0},
      "QueryStringCacheKeys": {"Quantity": 0}
    },
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "$ACM_CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "Certificate": "$ACM_CERT_ARN",
    "CertificateSource": "acm"
  },
  "Enabled": true
}
EOC
)
  CF_OUTPUT=$(aws cloudfront create-distribution \
    --distribution-config "$CF_CONFIG" \
    --profile "$PROFILE" \
    --query "Distribution.{Id:Id,DomainName:DomainName}" \
    --output json)
fi

CF_ID=$(echo "$CF_OUTPUT" | jq -r .Id)
CF_DOMAIN=$(echo "$CF_OUTPUT" | jq -r .DomainName)
echo "Created CloudFront Distribution ID: $CF_ID"
echo "CloudFront Domain: $CF_DOMAIN"

echo "-----------------------------------------------"
echo "Deployment complete!"
echo "S3 Website Endpoint: http://$WEBSITE_ENDPOINT"
if [ -z "$ACM_CERT_ARN" ]; then
  echo "CloudFront Distribution (HTTP): http://$CF_DOMAIN"
  echo "Since no custom domain/cert was provided, you can access your site via that CloudFront URL."
else
  echo "CloudFront Distribution (HTTPS): https://$CF_DOMAIN"
  echo "Custom Domain: $CUSTOM_DOMAIN  (Make sure to point DNS to CloudFront!)"
fi

