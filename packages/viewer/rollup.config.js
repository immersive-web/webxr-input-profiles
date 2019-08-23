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
      './motion-controllers.module.js',
      './motion-controllers-mocks.module.js'
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
          { files: '../profiles-registry/dist/**', dest: `${DIST_FOLDER}/profiles` }
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
