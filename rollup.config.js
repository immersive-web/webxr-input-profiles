import { eslint } from 'rollup-plugin-eslint';
import copy from 'rollup-plugin-copy-glob';
import buildProfilesList from './rollup-plugin-profiles';

const DIST_FOLDER = 'dist';
const VIEWER_FOLDER = 'profileViewer';

export default [
  {
    input: ['src/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/webxr-input-profiles.module.js`
      }
    ],
    plugins: [
      eslint(),
      copy(
        [
          { files: 'profiles/**', dest: `${DIST_FOLDER}/profiles` },
          { files: 'node_modules/three/**', dest: `${VIEWER_FOLDER}/three` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      buildProfilesList({
        profilePaths: ['profiles/**'],
        dest: `${DIST_FOLDER}/profiles/profilesList.json`,
        verbose: true,
        watch: process.env.ROLLUP_WATCH 
      })
    ]
  },
  {
    input: ['src/mocks/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/webxr-input-mocks.module.js`
      }
    ]
  }
];
