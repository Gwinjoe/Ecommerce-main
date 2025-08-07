require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const pLimit = require("p-limit")
const fs = require("fs")

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploader = async (file) => {
  const results = await cloudinary.uploader.upload(file);
  const url = cloudinary.url(results.public_id, {
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto'
      },
      {
        width: 500,
        height: 500,
        crop: 'fill',
        gravity: 'auto'
      }
    ]
  });
  fs.unlink(file);
  return { url, publicId: results.public_id };
}

async function uploadMultiple(documentPaths) {
  const limit = pLimit(10);
  const uploadPromises = documentPaths.map((path) => {
    limit(() => {
      cloudinary.uploader.upload(path)
    })
    fs.unlink(path)
  });
  const results = await Promise.all(uploadPromises);
  console.log(results);
  const finalResults = results.map((result) => {
    const url = cloudinary.url(result.public_id, {
      transformation: [
        {
          quality: 'auto',
          fetch_format: 'auto'
        },
        {
          width: 500,
          height: 500,
          crop: 'fill',
          gravity: 'auto'
        }
      ]
    })
    return { url, publicId: result.public_id };
  });
  return finalResults;
}


module.exports = { uploader, uploadMultiple }

