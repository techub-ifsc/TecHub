const { v2: cloudinary } = require('cloudinary');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

cloudinary.config({
  cloud_name: cloudName,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Indica se as três variáveis foram definidas; sem elas o upload responde 503.
function isCloudinaryConfigured() {
  return Boolean(
    cloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

module.exports = { cloudinary, cloudName, isCloudinaryConfigured };
