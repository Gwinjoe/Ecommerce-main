const fs = require('fs').promises;
const path = require('path');

exports.clearUploads = async () => {
  const targetDir = path.join(__dirname, "..", 'tmp', 'uploads');

  try {
    await fs.access(targetDir);
    const items = await fs.readdir(targetDir);

    await Promise.all(items.map(async item => {
      const itemPath = path.join(targetDir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isFile()) {
        await fs.unlink(itemPath);
        console.log(`Deleted file: ${item}`);
      }
    }));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Directory ${targetDir} does not exist`);
    } else {
      console.error('Error clearing uploads:', err);
    }
  }
}

