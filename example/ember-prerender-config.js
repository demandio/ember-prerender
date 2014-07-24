module.exports = {
  engine: 'phantom',
  baseUrl: 'http://localhost:4200/',
  plugins: [
      'removeScriptTags',
      'httpHeaders'
  ]
};
