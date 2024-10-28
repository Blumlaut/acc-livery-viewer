#!/bin/bash

# Define the file extensions to search for
extensions=("*.mat" "*.txt" "*Sponsors*.png")

# Loop through each extension and remove matching files
for ext in "${extensions[@]}"; do
  find . -type f -name "$ext" -exec rm {} -v \;
done

# find and delete all files ending with .gltf and .bin unless they end with "_exterior.gtlf/bin"
find . -type f \( -name "*.gltf" -o -name "*.bin" -o -name "*.md5mesh" \) ! -name "*_exterior.gltf" ! -name "*_exterior.bin" -exec rm {} -v \;

rm -rfv */*Skeleton*/
rm -rfv */display/
rm -rfv */textures/
rm -rfv */skins/20*/
rm -rfv */skins/0_banner/
rm -rfv */skins/preseason/
rm -rfv */skins/custom/custom_fana
rm -rfv */skins/custom/rim*
rm -rfv */skins/custom/*/EXT_Skin_Colour.png
rm -rfv */skins/custom/*/EXT_Skin_Mask.png


# delete all folders 1 level deep that contain no files
find . -type d -empty -delete
