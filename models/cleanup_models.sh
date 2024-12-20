#!/bin/bash

# Define the file extensions to search for
extensions=("*.mat" "*.txt")

# Loop through each extension and remove matching files
for ext in "${extensions[@]}"; do
  echo "Removing files with extension: $ext"
  find . -type f -name "$ext" -exec rm {} -v \;
done

find . -type f -name "*Sponsors*.png" ! -path "*lexus*" -exec rm {} -v \;

# find and delete all files ending with .gltf and .bin unless they end with "_exterior.gtlf/bin"
find . -type f \( -name "*.gltf" -o -name "*.bin" -o -name "*.md5mesh" \) ! -name "*_exterior*.gltf" ! -name "*_exterior*.bin" ! -name "*_rim*Lod1*" -exec rm {} -v \;

find . -type f \( -name "*Lod*.md5mesh" \) -exec rm {} -v \;

# delete all models ending with .gltf and .bin if they do not contain "Lod" in the name
find . -type f \( -name "*.gltf" -o -name "*.bin" \) ! -name "*Lod*.gltf" ! -name "*Lod*.bin" -exec rm {} -v \;

rm -rfv */*Skeleton*/
rm -rfv */*rim_blur*
rm -rfv */display/
rm -rfv */textures/*Map*
rm -rfv */textures/*NM*
rm -rfv */textures/*Mask*
rm -rfv */textures/*Scuffle*
rm -rfv */textures/*Dirt*
rm -rfv */textures/*Emissive*
rm -rfv */textures/INT*
rm -rfv */textures/dirt_damage
rm -rfv */skins/20*/
rm -rfv */skins/0_banner/
rm -rfv */skins/preseason/
rm -rfv */skins/custom/rim*
rm -rfv */skins/custom/*/EXT_Skin_Colour.png
rm -rfv */skins/custom/*/EXT_Skin_Mask.png


# delete all folders 1 level deep that contain no files
find . -type d -empty -delete
