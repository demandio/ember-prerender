module.exports = {
  engine: 'phantom',
  baseUrl: 'http://localhost/',
  assetsPath: process.cwd() + '/dist/',
  plugins: [
    'removeScriptTags',
    'httpHeaders',
    //'prepareEmail',
    //'prettyPrintHtml',
    //'inMemoryHtmlCache',
    //'s3HtmlCache',
  ]
};
