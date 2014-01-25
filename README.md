# Ember Prerender #

This project allows [Ember.js](http://emberjs.com/) (and likely other)
web applications to be prerendered on the server using [Node.js](http://nodejs.org/)
and either [PhantomJS](http://phantomjs.org/) or
[JSDOM](https://github.com/tmpvar/jsdom) based on your preference.

The goal of the project is to couple server-side rendering more closely
with a specific web app. By utilizing a long-lived instance of the app
rather than restarting it upon every request, rendering times can be 
reduced.

The concept and plugin code is based loosely off of the [Prerender
Service](https://github.com/collectiveip/prerender) by Todd Hooper.

## Usage ##

Clone the repository:

    git clone https://github.com/zipfworks/prerender

Install dependencies:

    npm install

Set the environment variables to match your environment or edit the
configuration in server.js.

Run the service:

    node server.js

## Deployment / Middleware ##

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
      rewrite .* $request_uri break;
      #proxy_pass http://localhost:3000;
      proxy_pass http://prerender.herokuapp.com;
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
