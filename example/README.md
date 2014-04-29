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
