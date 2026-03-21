const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

class FileUploadService {
  constructor() {
    // Allowed file types
    this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    
    // Upload directory
    this.uploadDir = path.join(__dirname, '../../uploads/sample-entries');
    
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Configure multer storage
   */
  getMulterStorage() {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        await this.ensureUploadDir();
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `sample-${uniqueSuffix}${ext}`);
      }
    });
  }

  /**
   * File filter for multer
   */
  fileFilter(req, file, cb) {
    if (this.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return multer({
      storage: this.getMulterStorage(),
      fileFilter: this.fileFilter.bind(this),
      limits: {
        fileSize: this.maxFileSize
      }
    });
  }

  /**
   * Upload a single file
   * @param {Object} file - Multer file object
   * @param {Object} options - Upload options
   * @param {boolean} options.compress - Whether to compress the image
   * @returns {Promise<Object>} Upload result with file URL
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      }

      if (file.size > this.maxFileSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      let filePath = file.path;
      let fileName = file.filename;

      // Compress image if requested
      if (options.compress) {
        const compressedPath = await this.compressImage(filePath);
        // Delete original file
        await fs.unlink(filePath);
        filePath = compressedPath;
        fileName = path.basename(compressedPath);
      }

      // Generate file URL (relative to server)
      const fileUrl = `/uploads/sample-entries/${fileName}`;

      return {
        success: true,
        fileName,
        filePath,
        fileUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };

    } catch (error) {
      // Clean up file if upload failed
      if (file && file.path) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      throw error;
    }
  }

  /**
   * Compress image using sharp
   * @param {string} filePath - Path to image file
   * @returns {Promise<string>} Path to compressed image
   */
  async compressImage(filePath) {
    const ext = path.extname(filePath);
    const compressedPath = filePath.replace(ext, `-compressed${ext}`);

    await sharp(filePath)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(compressedPath);

    return compressedPath;
  }

  /**
   * Delete a file
   * @param {string} fileName - File name to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(fileName) {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
    } else {
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        errors.push('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      }

      if (file.size > this.maxFileSize) {
        errors.push('File size exceeds 10MB limit');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new FileUploadService();
