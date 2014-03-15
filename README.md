# Ember Prerender #

This project allows [Ember.js](http://emberjs.com/) (and likely other)
web applications to be prerendered on the server using [Node.js](http://nodejs.org/)
and either [PhantomJS](http://phantomjs.org/) or
[JSDOM](https://github.com/tmpvar/jsdom) based on your preference.

The goal of the project is to couple server-side rendering more closely
with a specific web app framework. By utilizing a long-lived instance of
an app rather than reloading it on every request, rendering times can be 
reduced.

The concept and plugin code is based loosely off of the [Prerender
Service](https://github.com/collectiveip/prerender) by Todd Hooper.

## Usage ##

Clone the repository:

    git clone https://github.com/zipfworks/prerender

Install dependencies:

    npm install

Copy or edit the ./app/default.js configuration file to match your
app's environment.

Run the service (with the environment variable containing the name of the 
app config file):

    export APP="default"
    node server.js

## Ember Prerender Event ##

In order for ember-prerender to know that your pages are fully rendered,
your application must emit the prerenderReady event whenever each of your routes
finishes rendering their templates.

Example configuration (CoffeeScript):

Add to: app/initialize.coffee
```CoffeeScript
# Prerender event
prerenderEvent = document.createEvent('Event')
prerenderEvent.initEvent('prerenderReady', true, true)
App.prerenderReady = ->
  console.log('PRERENDER READY')
  document.dispatchEvent(prerenderEvent)
```

In your routes (as of Ember 1.4):
```CoffeeScript
  # Promise hook for when a page has loaded, can be overridden in subclasses
  willComplete: -> Em.RSVP.resolve()

  actions:
    didTransition: ->
      promises = []
      for handler in @router.router.currentHandlerInfos
        if handler.handler.willComplete
          promises.push handler.handler.willComplete()
      Ember.RSVP.all(promises).then App.prerenderReady
```
Instead of adding this to each of your routes, you can extend Ember.Route to
create a base route or use Ember.Route.reopen to change the default behavior.

Depending on your app, you may need to postpone firing the prerenderReady event
by overriding willTransition. You can do so by returning a deferred promise
and resolving it after the other parts of the page have loaded.

To detect whether your app is being loaded in a browser or through prerender,
you can check the window.isPrerender variable which is set to true by
ember-prerender.

## Web Server Setup ##

Once Ember Prerender is working with your project, you'll probably
want to enable prerendering for certain user agents (e.g. web crawlers)
while serving Javascript for compatible browsers. One way to do this
is by setting up Nginx as a reverse proxy (below).

### Reloading ###

If your web application changes, you can send a SIGUSR2 signal to the
master prerender process to cause the workers to restart.

### Nginx Reverse Proxy Setup ###

Example configuration:

```Nginx
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
 
    set $prerender 0;
    if ($http_user_agent ~* "googlebot|yahoo|bingbot|baiduspider|yandex|yeti|yodaobot|gigabot|ia_archiver|facebookexternalhit|twitterbot|developers\.google\.com") {
      set $prerender 1;
    }
    if ($args ~ "_escaped_fragment_|prerender=1") {
      set $prerender 1;
    }
    if ($http_user_agent ~ "Prerender") {
      set $prerender 0;
    }

    if ($prerender = 1) {
      proxy_pass http://localhost:3000;
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
