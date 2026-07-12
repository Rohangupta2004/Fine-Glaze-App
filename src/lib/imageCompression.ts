/**
 * imageCompression.ts
 *
 * Compress images before upload per PRD spec:
 *   - Max dimension: 1280 px
 *   - Target size: ~200 KB
 *   - Format: JPEG
 *
 * Uses expo-image-manipulator for resizing and quality adjustment.
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1280;
const INITIAL_QUALITY = 0.7;

/**
 * Compress an image to fit within MAX_DIMENSION and reduce file size.
 * Returns the URI of the compressed image.
 */
export async function compressImage(
  uri: string,
  maxDimension: number = MAX_DIMENSION,
  quality: number = INITIAL_QUALITY,
): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDimension } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Compress a selfie image (front camera, lower resolution needed).
 */
export async function compressSelfie(uri: string): Promise<CompressedImage> {
  return compressImage(uri, 640, 0.6);
}
