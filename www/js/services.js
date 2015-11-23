/**
 * Created by magdakowalska on 17/11/2015.
 */
var teleportServices = angular.module('teleport.services', []);

var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

teleportServices.factory('Requests', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var pendingRequests = [];


  return {
    all: function() {
      return friends;
    },
    remove: function(chat) {
      friends.splice(friends.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < friends.length; i++) {
        if (friends[i].id === parseInt(chatId)) {
          return friends[i];
        }
      }
      return null;
    }
  };
});
