import Ember from 'ember';

export default Ember.Controller.extend({
  init: function() {
    console.log("Throwing error in 1 second...");

    Ember.run.later(function() {
      throw new Error("An error occurred");
    }, 1000);
  }
});
