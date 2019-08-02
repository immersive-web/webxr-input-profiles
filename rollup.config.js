// import copy from 'rollup-plugin-copy-glob';
import { eslint } from 'rollup-plugin-eslint';
import profiles from './rollup-plugin-profiles';

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
      profiles(
        {
          src: 'profiles',
          dest: `${DIST_FOLDER}/profiles`
        }
      )
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
