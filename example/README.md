# Ember-Prerender Example Project #

This is an example Ember.js project that demonstrates how
ember-prerender works.

## Getting Started ##

To build, run, and test this project, please install ember-cli, bower,
and ember-prerender:

    npm install -g ember-cli
    npm install -g bower
    npm install -g zipfworks/ember-prerender
    
Once you've downloaded the dependencies, clone this repository and run the following:

    cd example
    npm install
    bower install

## Running ##

To view the project in your browser:

    ember server
    
In your browser, open [http://localhost:4200](http://localhost:4200) to view the Javascript version of the site.

To render the project with ember-prerender:

    ember build
    ember-prerender ember-prerender-config.js

In your browser, open [http://localhost:3000](http://localhost:3000) to view the static html version of the site.

The example project includes three routes, an index at /, an AJAX page at /dynamic, and a 404 page at any other url (e.g. /foo).

## How does it work? ##

A custom initializer in **_app/initializers/ember-prerender.js_** registers a custom XContentReady event and creates a method on your application object which dispatches the event.

A mixin in **_app/mixins/ember-prerender.js_** gets added to the routes in **_app/routes/*_** which dispatches the custom event when Ember.js has finished transitioning to the route and any promises have been resolved. (Promises can be returned by the optional willComplete method in your controllers if there is something on the page that gets lazily loaded.)

The rest of the project is your everyday, run-of-the-mill Ember.js code.

## Caveats ##

Ember-prerender expects your Ember app to be located at window.App. This could be a configuration option if there's demand for it.