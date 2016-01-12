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
    console.log("Distance: " + d);
    return d; // returns the distance in meter
  };

  var filteredRequests = [];

  function startGettingRequests(lat, lng, uid) {
    var requestRef = ref.child("requests");
    requestRef.orderByChild("timestamp");
    var requests = $firebaseArray(requestRef);
    filteredRequests = [];

    requests.$loaded().then(function() {
      var reqArray = requests;
      var myLoc = new google.maps.LatLng(lat, lng);
      for (var i = 0; i < reqArray.length; i++) {
        var reqLoc = new google.maps.LatLng(reqArray[i].latitude, reqArray[i].longitude);
        var reqRequester = reqArray[i].requesterID;
        var distance = getDistance(myLoc, reqLoc);
        if (distance < 200 && reqRequester != uid) {
          filteredRequests.push(reqArray[i]);
        }
      }
    });
  }

  return {
    all: function(lat, lng, uid) {
      startGettingRequests(lat, lng, uid);
      return filteredRequests;
    },
    remove: function(req) {
      filteredRequests.splice(filteredRequests.indexOf(req), 1);
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

teleportServices.factory('CreatedRequests', function($firebaseArray, $ionicLoading) {

  var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

  var requests = [];
  var requestRef = ref.child("requests");
  var requestSync = $firebaseArray(requestRef);
  requests = requestSync;

  var filteredRequests = [];

  function isStillActive(ts) {
    var timestamp5minutesAgo = Date.now() - 5 * 60 * 1000;
    var requestTimestamp = ts;
    var value = requestTimestamp - timestamp5minutesAgo;
    if(value > 0) {
      console.log(value);
      return true
    } else {
      console.log(value);
      return false
    }
  }

  function startGettingRequests(uid) {
    $ionicLoading.show({
      template: '<ion-spinner icon="spiral"></ion-spinner>'
    });
    var requestRef = ref.child("requests");
    requestRef.orderByChild("timestamp");
    var requests = $firebaseArray(requestRef);
    filteredRequests = [];

    requests.$loaded().then(function() {
      var reqArray = requests;
      for( var i = 0; i < reqArray.length; i++ ) {
        var reqRequester = reqArray[i].requesterID;
        var ts = reqArray[i].timestamp;
        if( reqRequester === uid && isStillActive(ts)) { //add && isStillActive(ts)
          filteredRequests.push(reqArray[i]);
        }
      }
    });
    $ionicLoading.hide();
  }

  return {
    all: function(uid) {
      startGettingRequests(uid);
      return filteredRequests;
    },
    remove: function(chat) {
      requests.splice(requests.indexOf(chat), 1);
    },
    get: function(id) {
      for (var i = 0; i < requests.length; i++) {
        if (requests[i].id === parseInt(id)) {
          return requests[i];
        }
      }
      return null;
    }
  };


});
