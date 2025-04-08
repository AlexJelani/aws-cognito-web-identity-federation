#!/bin/bash

# Script to download sample pet images for the project
# These images are not included in the repository due to their size

echo "Downloading sample pet images..."

# Create the directory structure if it doesn't exist
mkdir -p private-data/private-data/pets

# Download sample images from public URLs
# Replace these URLs with actual image sources as needed
curl -o private-data/private-data/pets/cat1.jpg https://source.unsplash.com/random/800x600/?cat
curl -o private-data/private-data/pets/cat2.jpg https://source.unsplash.com/random/800x600/?kitten
curl -o private-data/private-data/pets/cat3.jpg https://source.unsplash.com/random/800x600/?kitty
curl -o private-data/private-data/pets/dog1.jpg https://source.unsplash.com/random/800x600/?dog
curl -o private-data/private-data/pets/dog2.jpg https://source.unsplash.com/random/800x600/?puppy
curl -o private-data/private-data/pets/dog3.jpg https://source.unsplash.com/random/800x600/?doggy

echo "Pet images downloaded successfully!"
echo "You can now deploy these images to your private S3 bucket."
