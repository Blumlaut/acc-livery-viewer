#!/bin/bash

# Define the file extensions to search for
extensions=("*.mat" "*.txt" "*Sponsors*.png")

# Loop through each extension and remove matching files
for ext in "${extensions[@]}"; do
  find . -type f -name "$ext" -exec rm {} \;
done

# find and delete all files ending with .gltf and .bin unless they end with "_exterior.gtlf/bin"
find . -type f \( -name "*.gltf" -o -name "*.bin" \) ! -name "*_exterior.gltf" ! -name "*_exterior.bin" -exec rm {} \;