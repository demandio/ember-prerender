module.exports = {
  engine: 'phantom',
  //engine: 'jsdom',
  //engine: 'webdriver',
  baseUrl: 'http://localhost:4200/',
  plugins: [
      'removeScriptTags',
      'httpHeaders'
  ]
};
