const fs = require('fs').promises;
const path = require('path');

async function clearUploads() {
  const targetDir = path.join(__dirname, '..', 'tmp', 'uploads');

  try {
    await fs.mkdir(targetDir, { recursive: true });

    const items = await fs.readdir(targetDir);

    // Process all items in parallel
    await Promise.all(items.map(async (item) => {
      const itemPath = path.join(targetDir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isFile()) {
        await fs.unlink(itemPath);
        console.log(`Deleted file: ${item}`);
      }
    }));

    console.log('Uploads directory cleaned successfully');
  } catch (err) {
    console.error('Error processing uploads directory:', err);
  }
}

