const sharp = require('sharp');
const path = require('path');

class ImageProcessor {
  /**
   * Compress image with quality optimization
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {Object} options - Compression options
   * @param {number} options.quality - JPEG quality (1-100)
   * @param {number} options.maxWidth - Maximum width
   * @param {number} options.maxHeight - Maximum height
   * @returns {Promise<Object>} Compression result
   */
  async compressImage(inputPath, outputPath, options = {}) {
    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1920
    } = options;

    try {
      const metadata = await sharp(inputPath).metadata();
      
      const pipeline = sharp(inputPath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });

      // Apply format-specific compression
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        pipeline.jpeg({ quality, mozjpeg: true });
      } else if (metadata.format === 'png') {
        pipeline.png({ quality, compressionLevel: 9 });
      } else if (metadata.format === 'webp') {
        pipeline.webp({ quality });
      } else {
        // Convert to JPEG for other formats
        pipeline.jpeg({ quality, mozjpeg: true });
      }

      const info = await pipeline.toFile(outputPath);

      return {
        success: true,
        originalSize: metadata.size,
        compressedSize: info.size,
        compressionRatio: ((1 - info.size / metadata.size) * 100).toFixed(2) + '%',
        width: info.width,
        height: info.height,
        format: info.format
      };

    } catch (error) {
      console.error('Image compression error:', error);
      throw new Error(`Failed to compress image: ${error.message}`);
    }
  }

  /**
   * Create thumbnail from image
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output thumbnail path
   * @param {Object} options - Thumbnail options
   * @param {number} options.width - Thumbnail width
   * @param {number} options.height - Thumbnail height
   * @returns {Promise<Object>} Thumbnail result
   */
  async createThumbnail(inputPath, outputPath, options = {}) {
    const {
      width = 200,
      height = 200
    } = options;

    try {
      const info = await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      return {
        success: true,
        width: info.width,
        height: info.height,
        size: info.size
      };

    } catch (error) {
      console.error('Thumbnail creation error:', error);
      throw new Error(`Failed to create thumbnail: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   * @param {string} imagePath - Image path
   * @returns {Promise<Object>} Image metadata
   */
  async getMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Optimize image for web
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeForWeb(inputPath, outputPath) {
    return await this.compressImage(inputPath, outputPath, {
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1920
    });
  }

  /**
   * Convert image to WebP format
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output WebP path
   * @param {Object} options - Conversion options
   * @param {number} options.quality - WebP quality (1-100)
   * @returns {Promise<Object>} Conversion result
   */
  async convertToWebP(inputPath, outputPath, options = {}) {
    const { quality = 85 } = options;

    try {
      const info = await sharp(inputPath)
        .webp({ quality })
        .toFile(outputPath);

      return {
        success: true,
        size: info.size,
        width: info.width,
        height: info.height,
        format: 'webp'
      };

    } catch (error) {
      console.error('WebP conversion error:', error);
      throw new Error(`Failed to convert to WebP: ${error.message}`);
    }
  }
}

module.exports = new ImageProcessor();
