import { eslint } from 'rollup-plugin-eslint';
import copy from 'rollup-plugin-copy-glob';
import buildProfilesList from './rollup-plugin-profiles';

const DIST_FOLDER = 'dist';
const VIEWER_FOLDER = 'profileViewer';

export default [
  {
    input: ['src/lib/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/webxr-input-profiles.module.js`
      }
    ],
    plugins: [
      eslint({ throwOnError: true }),
      copy(
        [
          { files: 'src/profiles/**', dest: `${DIST_FOLDER}/profiles` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      buildProfilesList({
        profilePaths: ['src/profiles/**'],
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
    ],
    plugins: [
      eslint({ throwOnError: true })
    ]
  },
  {
    input: ['src/profileViewer/index.js'],
    output: [
      {
        format: 'es',
        file: `${VIEWER_FOLDER}/index.js`
      }
    ],
    external: [
      './three/build/three.module.js',
      './three/examples/jsm/loaders/GLTFLoader.js',
      './three/examples/jsm/controls/OrbitControls.js',
      '../dist/webxr-input-profiles.module.js',
      '../dist/webxr-input-mocks.module.js'
    ],
    plugins: [
      eslint({ throwOnError: true }),
      copy(
        [
          { files: 'src/profileViewer/*.{html,css}', dest: `${VIEWER_FOLDER}` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: 'node_modules/three/**', dest: `${VIEWER_FOLDER}/three` }
        ],
        { verbose: false, watch: process.env.ROLLUP_WATCH }
      )
    ]
  }
];
