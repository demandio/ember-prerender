# Ember Prerender #

[![Code Climate](https://codeclimate.com/github/zipfworks/ember-prerender.png)](https://codeclimate.com/github/zipfworks/ember-prerender)
[![Dependency Status](https://gemnasium.com/zipfworks/ember-prerender.svg)](https://gemnasium.com/zipfworks/ember-prerender)
[![Stories in Ready](https://badge.waffle.io/zipfworks/ember-prerender.png?label=ready&title=Ready)](https://waffle.io/zipfworks/ember-prerender)

This project allows web apps built with [Ember.js](http://emberjs.com/) (and other
frameworks) to be executed on the server and rendered into static HTML. The main
reason you'd want to use ember-prerender is to serve static HTML content to web
crawlers and bots which aren't capable of executing Javascript. This is useful
for SEO purposes, such as general indexing of page content, Facebook's Link Preview,
Pinterest's Rich Pins, Twitter Cards, Google's Rich Snippets, and other structured
data formats.

The project makes use of [Node.js](http://nodejs.org/) and
[JSDOM](https://github.com/tmpvar/jsdom), [PhantomJS](http://phantomjs.org/), 
or [WebDriverJS](https://code.google.com/p/selenium/wiki/WebDriverJs)
based on your requirements and preference. Note: WebDriver support is still
experimental and mostly useful for debugging.

The concept and plugin code is based loosely off of
the [Prerender Service](https://github.com/collectiveip/prerender) by Todd Hooper.
Unlike the Prerender Service, the goal of ember-prerender is to reduce rendering times
by utilizing a long-lived instance of an app instead of reloading it on every request.
In addition, you have the flexibility of using JSDOM or WebDriverJs instead of PhantomJS.

Although the current focus of this project is to support Ember apps, the code is
completely decoupled from Ember.js and can be used with Angular, Backbone, Knockout,
jQuery, etc. (assuming your app implements the XPushState and XContentReady events
described in this README). In the future, this project may be more
closely coupled with [HTMLBars](https://github.com/tildeio/htmlbars) /
[Bound Templates](https://github.com/tildeio/bound-templates.js).

## Usage ##

Install ember-prerender:

From npm (https://www.npmjs.org/package/ember-prerender):

    $ sudo npm install -g ember-prerender

Or, if you prefer to get it directly from github:

    $ sudo npm install -g zipfworks/ember-prerender

Copy or edit the default configuration file (in /config/) to match your
app's environment.

Run the service with the path to your configuration file:

    $ ember-prerender config/default.js [optional process num]

If you're invoking ember-prerender directly from the cloned repository,
you can do this instead:

    $ export CONFIG="./your-app-config.js"
    $ export PROCESS_NUM=0
    $ node server.js

Test the prerender service by visiting it in your browser at
[http://localhost:3000](http://localhost:3000) (default).

## Configuration Options ##

Configuration files should be in javascript module format, the following is an
annotated version of a complete config file.

```
module.exports = {
  // The port that prerender runs on (Phantom will use additional ports)
  port: 3000,

  // Process number (starting from 0) which is added to the above port, used when running multiple instances
  processNum: 0,

  // Can be: jsdom, phantom, or webdriver
  engine: "phantom",

  // Milliseconds to wait after the page load but before getting the HTML
  contentReadyDelay: 0,

  // Maximum milliseconds to wait before the initial app load times out
  initializeTimeout: 25000,

  // Maximum milliseconds to wait before a render job times out
  renderTimeout: 15000,

  // Maximum number of requests a worker can handle before it's restarted
  maxRequestsPerRenderer: 200,

  // Whether to restart a renderer gracefully or exit the process after reaching maxRequestsPerRenderer
  // Note: Exiting the process and having something like supervisor automatically restart it can
  //       help avoid memory leaks which seems to affect the JSDOM engine
  //       This could be investigated with: https://github.com/lloyd/node-memwatch
  exitAfterMaxRequests: false,

  // If exitAfterMaxRequets is true, setting this to true will cause all
  // queued requests to be rendered before the process is terminated
  gracefulExit: true,

  // Maximum number of rendering requests to queue up before dropping new ones
  maxQueueSize: 1000,

  // Your app's default URL
  appUrl: "http://localhost/",

  // Serve static files
  serveFiles: true,

  // Log requests for static files
  serveFilesLog: true,

  // Regular expression of static file patterns
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf|map)(?:\?|$)/,

  // Regular expression containing assets you don't want to download or process
  ignoreAssets: /google-analytics\.com|fonts\.googleapis\.com|typekit\.com|platform\.twitter\.com|connect\.facebook\.net|apis\.google\.com|\.css(?:\?|$)/,

  logging: {
    // Logging verbosity
    "level": "debug",

    // Add a timestamp to logs
    "timestamp": true,

    // Add color formatting to logs
    "format": true
  },

  // Available plugins:
  plugins: [
    "removeScriptTags",
    "httpHeaders",
    //"prepareEmail",
    //"prettyPrintHtml",
    //"inMemoryHtmlCache",
    //"s3HtmlCache",
    //require('./your-own-plugin.js')
  ]
}
```

## Example Ember.js Project ##

If you want to see ember-prerender in action, check out the example project at: 
[https://github.com/zipfworks/ember-prerender/tree/master/example](https://github.com/zipfworks/ember-prerender/tree/master/example)

The example demonstrates the following use cases: 

  * Rendering a page that loads an external resource
  * Returning 404 headers
  * Returning 301 redirects
  * Recovering from fatal Javascript errors
  * Updating the page title and meta tags for each route

## XPushState and XContentReady Events ##

Your application must accept the XPushState event with a 'url'
property on the event. After receiving the event, your app should
transition to the route that matches the URL. After the route has loaded,
your must emit the
[XContentReady](https://github.com/n-fuse/the-XContentReady-Event/) event
to let ember-prerender know that the page is ready.

To find out more about implmenting the events, the best place to start is
by looking at the initializers and mixins in the example project of this
repository.

### Example Configuration (CoffeeScript) ###

Add to: app/initialize.coffee
```CoffeeScript
# Prerender event
if document.createEvent
  window.prerenderReadyEvent = document.createEvent('Event')
  window.prerenderReadyEvent.initEvent('XContentReady', false, false)

  window.prerenderTransitionEvent = document.createEvent('Event')
  window.prerenderTransitionEvent.initEvent('XPushState', false, false)

  App.prerenderReady = ->
    console.log('PRERENDER READY')
    document.dispatchEvent(window.prerenderReadyEvent)

  document.addEventListener('XPushState', (event) ->
    router = App.__container__.lookup 'router:main'
    Ember.run ->
      router.replaceWith(event.url).then (route) ->
        if route.handlerInfos
          // The requested route was already loaded
          App.prerenderReady()
  , false)
```

In your routes (tested with Ember 1.4, 1.5, 1.6, and 1.7):
```CoffeeScript
  # Promise hook for when a page has loaded, can be overridden in subclasses
  willComplete: -> Em.RSVP.resolve()

  actions:
    didTransition: ->
      @_super()
      promises = []
      for handler in @router.router.currentHandlerInfos
        if handler.handler.willComplete
          promises.push handler.handler.willComplete()
      Ember.RSVP.all(promises).then App.prerenderReady
```
Instead of adding this to each of your routes, you can extend Ember.Route to
create a base route or use Ember.Route.reopen to change the default behavior.

Depending on your app, you may need to postpone firing the XContentReady event
by overriding willTransition. You can do so by returning a deferred promise
and resolving it after the other parts of the page have loaded.

To detect whether your app is being loaded in a browser or through prerender,
you can check the window.isPrerender variable which is set to true by
ember-prerender.

## Search Engine Support ##

Google is now executing Javascript pages directly, however, you may wish
to inform Google about ember-prerender's HTML snapshots by adding the
"fragment" meta tag. For push state apps, the tag looks like this:

```<meta name="fragment" content="!">```

Please visit Google's [AJAX Crawling documentation](
https://developers.google.com/webmasters/ajax-crawling/docs/getting-started)
for more information.

Bing and Yandex also support the "fragment" meta tag. In addition, most
of Google's bots support the tag, including Googlebot, Googlebot Mobile,
AdsBot-Google and Googlebot-Image.

## Running ##

You may manually start ember-prerender or preferably use
[supervisord](http://supervisord.org/), forever, foreman, upstart, etc to
start, stop, restart, and monitor ember-prerender.

If your web application changes, you can send a SIGUSR2 signal to the
master prerender process to cause the page to be reloaded.

The following is an example supervisord configuration file which should be
placed in /etc/supervisor/conf.d/:

```
[program:prerender-yourappname]
command = ember-prerender /mnt/ebs1/www/yourappname/conf/prerender.js %(process_num)d
directory = /mnt/ebs1/www/yourappname
user = yourappname
autostart = true
autorestart = true
stopasgroup = true
stdout_logfile = /mnt/ebs1/www/yourappname/logs/prerender.log
stderr_logfile = /mnt/ebs1/www/yourappname/logs/prerender.error.log
process_name = %(program_name)s_%(process_num)02d
numprocs = 1
```

## Web Server Setup ##

Once Ember Prerender is working with your project, you'll probably
want to enable prerendering for certain user agents (e.g. web crawlers)
while serving Javascript for compatible browsers. One way to do this
is by setting up a reverse proxy, such as nginx, haproxy,
apache, squid, etc.

### Nginx Reverse Proxy + Load Balancer Setup ###

Example configuration (you can add additional instances to the upstream
backend for load balancing):

```Nginx
upstream prerender-yourappname-backend {
  #ip_hash;
  #least_conn;
  server localhost:3000;
  #server localhost:3001;
  #server localhost:3002;
  #server localhost:3003;
}

server {
  listen 80;
  listen [::]:80;
  server_name yourserver.com;
 
  root /path/to/your/htdocs;
 
  error_page 404 /404.html
  index index.html;
 
  location ~ /\. {
    deny all;
  }
 
  location / {
    try_files $uri @prerender;
  }
 
  location @prerender {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #proxy_intercept_errors on;
    proxy_next_upstream error timeout;
 
    set $prerender 0;
    if ($http_user_agent ~* "baiduspider|yeti|yodaobot|gigabot|ia_archiver|facebookexternalhit|twitterbot|pinterest|tumblr|bingpreview|shopwiki|duckduckbot|rogerbot|slackbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|developers\.google\.com/\+/") {
      set $prerender 1;
    }
    if ($args ~ "_escaped_fragment_=|prerender=1") {
      set $prerender 1;
    }
    if ($http_user_agent ~ "Prerender") {
      set $prerender 0;
    }

    if ($prerender = 1) {
      proxy_pass http://prerender-yourappname-backend;
    }
    if ($prerender = 0) {
      rewrite .* /index.html break;
    }
  }
}
```

## License ##

The MIT License (MIT)

Copyright (c) 2013-2014 ZipfWorks Inc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
