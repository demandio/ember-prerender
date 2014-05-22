module.exports = {
  engine: 'phantom',
  contentReadyDelay: 0,
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
