const license = require('rollup-plugin-license');

const DIST_FOLDER = 'dist';

export default [
  {
    plugins: [
      license({
        banner: '<%= pkg.name %> <%= pkg.version %> https://github.com/immersive-web/webxr-input-profiles'
      })
    ],
    input: ['src/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/motion-controllers.module.js`
      },
      {
        format: 'cjs',
        file: `${DIST_FOLDER}/motion-controllers.js`
      }
    ]
  }
];
