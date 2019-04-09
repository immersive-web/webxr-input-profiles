import copy from 'rollup-plugin-copy-glob';

const DIST_FOLDER = 'dist';

export default [
  {
    input: ['src/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/xr-gamepad-mappings.module.js`
      }
    ],
    plugins: [
      copy([
        { files: 'mappings/**/mapping.json', dest: `${DIST_FOLDER}/mappings` }
      ])
    ]
  },
  {
    input: ['src/mockGamepad/mockGamepad.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/mock-gamepad.module.js`
      }
    ]
  }
];
