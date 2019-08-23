const DIST_FOLDER = 'dist';

export default [
  {
    input: ['src/lib/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/motion-controllers.module.js`
      }
    ]
  },
  {
    input: ['src/mocks/index.js'],
    output: [
      {
        format: 'es',
        file: `${DIST_FOLDER}/motion-controllers-mocks.module.js`
      }
    ]
  }
];
