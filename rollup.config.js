import { eslint } from 'rollup-plugin-eslint';
import copy from 'rollup-plugin-copy-glob';
import buildProfilesList from './rollup-plugin-profiles';

const DIST_FOLDER = 'dist';

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
          { files: 'profiles/**', dest: `${DIST_FOLDER}/profiles`}
        ],
        { verbose: true, watch: true }
      ),
      buildProfilesList({
        profilePaths: ['profiles/**'],
        dest: `${DIST_FOLDER}/profiles/profilesList.json`,
        verbose: true, 
        watch: true
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
