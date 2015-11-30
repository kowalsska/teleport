/**
 * Created by magdakowalska on 17/11/2015.
 */
var teleportServices = angular.module('teleport.services', []);



teleportServices.factory('ReceivedRequests', function($firebaseArray) {
  // Might use a resource here that returns a JSON array

  var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

  var rad = function(x) {
    return x * Math.PI / 180;
  };

  var getDistance = function(p1, p2) {
    //console.log("p1: " + p1 + " p2: " + p2);
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat() - p1.lat());
    var dLong = rad(p2.lng() - p1.lng());
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
  };

  var requests = [];
  var requestRef = ref.child("requests");
  var requestSync = $firebaseArray(requestRef);
  requests = requestSync;

  var filteredRequests = [];

  var getMatchingRequest = function(l1, l2, reqArray) {
    var myLoc = new google.maps.LatLng(l1, l2);
    for(var i=0; i < reqArray.length; i++) {
      var reqLoc = new google.maps.LatLng(reqArray[i].latitude, reqArray[i].longitude);
      var distance = getDistance(myLoc, reqLoc);
      console.log(distance);
      if( distance > 200) {
        reqArray.splice(i, 1);
      }
    }
    return reqArray;
  };

  function startGettingRequests(lat, lng) {
    var requestRef = ref.child("requests");
    var requests = $firebaseArray(requestRef);

    requests.$loaded().then(function() {
      var reqArray = requests;
      var myLoc = new google.maps.LatLng(lat, lng);
      for(var i=0; i < reqArray.length; i++) {
        var reqLoc = new google.maps.LatLng(reqArray[i].latitude, reqArray[i].longitude);
        var distance = getDistance(myLoc, reqLoc);
        console.log(distance);
        if( distance < 200) {
          filteredRequests.push(reqArray[i]);
        }
      }
    });
  }

  return {
    all: function(lat, lng) {
//      return getMatchingRequest(lat, lng, requests);
      startGettingRequests(lat, lng);
      return filteredRequests;
    },
    remove: function(chat) {
      requests.splice(requests.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < requests.length; i++) {
        if (requests[i].id === parseInt(chatId)) {
          return requests[i];
        }
      }
      return null;
    }
  };
});

teleportServices.factory('CreatedRequests', function($firebaseArray) {

  var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

  var createdRequests = [];
  var createdRequestRef = ref.child("requests");
  var createdRequestSync = $firebaseArray(createdRequestRef);
  createdRequests = createdRequestSync;

  var getCreatedRequests = function(uid, reqArray) {
    console.log("haaalllooo " + uid + " :: " + reqArray.length);
    for(var j=0; j < reqArray.length; j++) {
      var reqRequester = reqArray[i].requester;
      console.log("requester: " + reqRequester);
      if(  reqRequester !== uid ) {
        reqArray.splice(j, 1);
      }
    }
    return reqArray;
  };

  return {
    all: function(uid) {
      return getCreatedRequests(uid, createdRequests);
      //return createdRequests;
    },
    remove: function(chat) {
      createdRequests.splice(createdRequests.indexOf(chat), 1);
    },
    get: function(id) {
      for (var i = 0; i < createdRequests.length; i++) {
        if (createdRequests[i].id === parseInt(id)) {
          return createdRequests[i];
        }
      }
      return null;
    }
  };


});
