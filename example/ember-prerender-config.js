module.exports = {
  engine: 'phantom',
  //engine: 'jsdom',
  //engine: 'webdriver',
  appUrl: 'http://localhost:4200/',
  plugins: [
      'removeScriptTags',
      'httpHeaders'
  ]
};
