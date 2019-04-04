const fs = require('fs-extra');
const { join } = require('path');

export default function generateProfilesList(options) {
  const { src, dest } = options;

  function isDirectory(path) {
    return fs.lstatSync(path).isDirectory();
  }

  async function getDirectories(folder) {
    const folderContents = await fs.readdir(folder);
    const directories = folderContents.filter(item => isDirectory(join(folder, item)));
    return directories;
  }

  return {
    name: 'profiles',
    async generateBundle() {
      if (!src || !(await fs.pathExists(src)) || !isDirectory(src)) {
        throw new Error('Invalid src folder supplied');
      }

      if (!dest || (await fs.pathExists(dest) && !isDirectory(dest))) {
        throw new Error('Invalid dest folder supplied');
      }

      // Build list of profile paths by type
      const profileNames = await getDirectories(src);

      // Clean up the target folder
      await fs.emptyDir(dest);
      await fs.copy(src, dest);
      const profileListPath = join(dest, 'list.json');
      return fs.writeJSON(profileListPath, profileNames);
    }
  };
}
