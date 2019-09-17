import copy from 'rollup-plugin-copy-glob';

const DIST_FOLDER = 'dist';

export default [
  {
    input: ['src/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/index.js`
      }
    ],
    external: [
      './three/build/three.module.js',
      './three/examples/jsm/loaders/GLTFLoader.js',
      './three/examples/jsm/controls/OrbitControls.js',
      './ajv/ajv.min.js',
      './motion-controllers.module.js',
      '../motion-controllers.module.js',
      './assetTools/mergeProfile.js',
      './registryTools/validateRegistryProfile.js'
    ],
    plugins: [
      copy(
        [
          { files: 'src/*.{html,css}', dest: `${DIST_FOLDER}` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: '../../node_modules/three/**', dest: `${DIST_FOLDER}/three` }
        ],
        { verbose: false, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: '../assets/dist/profiles/**', dest: `${DIST_FOLDER}/profiles` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: '../registry/dist/profilesTools/**', dest: `${DIST_FOLDER}/registryTools` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: '../assets/dist/profilesTools/**', dest: `${DIST_FOLDER}/assetTools` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: '../../node_modules/ajv/dist/ajv.min.js*', dest: `${DIST_FOLDER}/ajv` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      ),
      copy(
        [
          { files: '../motion-controllers/dist/*.js', dest: `${DIST_FOLDER}` }
        ],
        { verbose: true, watch: process.env.ROLLUP_WATCH }
      )
    ]
  }
];
