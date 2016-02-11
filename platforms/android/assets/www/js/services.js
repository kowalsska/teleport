/**
 * Created by magdakowalska on 17/11/2015.
 */
var teleportServices = angular.module('teleport.services', []);

teleportServices.factory('FirebaseRef', function() {
  var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

  return ref;
});

teleportServices.factory('ReceivedRequests', function(FirebaseRef, $firebaseArray) {

  var filteredRequests = [];

  function isStillActive(ts) {
    var timestamp15minutesAgo = Date.now() - 10 * 60 * 1000;
    var value = ts - timestamp15minutesAgo;
    return value > 0;
  }

  var rad = function(x) {
    return x * Math.PI / 180;
  };

  var getDistance = function(p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat() - p1.lat());
    var dLong = rad(p2.lng() - p1.lng());
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  };

  function haveUserDeclined(req) {
    if(req.declinedBy !="none"){
      for(decline in req.declinedBy) {
        if(decline === FirebaseRef.getAuth().uid) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  function startGettingRequests(lat, lng, uid, cb) {
    var requestRef = FirebaseRef.child("requests");
    var requests = $firebaseArray(requestRef);
    filteredRequests.splice(0);

    requests.$loaded().then(function() {
      var reqArray = requests;
      var myLoc = new google.maps.LatLng(lat, lng);
      for (var i = 0; i < reqArray.length; i++) {
        var reqLoc = new google.maps.LatLng(reqArray[i].latitude, reqArray[i].longitude);
        var reqRequester = reqArray[i].requesterID;
        var ts = reqArray[i].timestamp;

        var distance = getDistance(myLoc, reqLoc);
        if ( distance < 500 && reqRequester != uid && isStillActive(ts) && !haveUserDeclined(reqArray[i]) ) {
          filteredRequests.push(reqArray[i]);
        }
      }
      filteredRequests.reverse();
      if (cb) cb();
    });
  }

  return {
    all: function(lat, lng, uid, cb) {
      startGettingRequests(lat, lng, uid, cb);
      return filteredRequests;
    },
    remove: function(req) {
      filteredRequests.splice(filteredRequests.indexOf(req), 1);
    }
  };
});

teleportServices.factory('CreatedRequests', function(FirebaseRef, $firebaseArray) {

  var requests = [];
  var requestRef = FirebaseRef.child("requests");
  var requestSync = $firebaseArray(requestRef);
  requests = requestSync;

  var filteredRequests = [];

  function isStillActive(ts) {
    var timestamp5minutesAgo = Date.now() - 10 * 60 * 1000;
    var value = ts - timestamp5minutesAgo;
    return value > 0;
  }

  function startGettingRequests(uid, cb) {
    var requestRef = FirebaseRef.child("requests");
    var requests = $firebaseArray(requestRef);
    filteredRequests.splice(0);

    requests.$loaded().then(function() {
      for( var i = 0; i < requests.length; i++ ) {
        var reqRequester = requests[i].requesterID;
        var ts = requests[i].timestamp;
        if( reqRequester === uid && isStillActive(ts) ) {
          filteredRequests.push(requests[i]);
        }
      }
      filteredRequests.reverse();
      if (cb) {
        if(filteredRequests.length > 0){
          cb(false);
        } else {
          cb(true);
        }

      }
    });
  }

  return {
    all: function(uid, cb) {
      startGettingRequests(uid, cb);
      return filteredRequests;
    },
    remove: function(chat) {
      requests.splice(requests.indexOf(chat), 1);
    }
  };
});

teleportServices.factory('GalleryService', function(FirebaseRef, $firebaseArray) {

  var photos = [];

  function isUserAuthor(img) {
    console.log("Am I the author?", img.authorID == FirebaseRef.getAuth().uid);
    var value = (img.authorID == FirebaseRef.getAuth().uid);
    return value;
  }

  function startGettingPhotos(requestTimestamp, cb) {
    var galleryRef = FirebaseRef.child("photos").child(requestTimestamp);
    var gallery = $firebaseArray(galleryRef);
    photos.splice(0);
    var i;
    gallery.$loaded().then(function() {
      for( i = 0; i < gallery.length; i++ ) {
        var galleryObject = gallery[i];
        if(isUserAuthor(gallery[i])) {
          gallery[i].isAuthor = true;
          gallery[i].canAddLike = false;
          gallery[i].canAddDislike = false;
        } else {
          gallery[i].isAuthor = false;
          console.log('PRINT IT!', requestTimestamp, gallery[i].timestamp, 'thumbsUp', 'whoClicked');
          var likeRef = FirebaseRef.child("likes").child(requestTimestamp).child(gallery[i].timestamp).child('thumbsUp').child('whoClicked');
          likeRef.once("value", function(snapshot) {
            var childName = FirebaseRef.getAuth().uid;
            var hasClicked = snapshot.hasChild(childName);
            if(hasClicked){
              console.log('I liked this photo');
              galleryObject.canAddLike = false;
            } else {
              console.log('I didnt like this photo');
              galleryObject.canAddLike = true;
            }
          });
          var dislikeRef = FirebaseRef.child("likes").child(requestTimestamp).child(gallery[i].timestamp).child('thumbsDown').child('whoClicked');
          dislikeRef.once("value", function(snapshot) {
            var childName = FirebaseRef.getAuth().uid;
            var hasClicked = snapshot.hasChild(childName);
            if(hasClicked){
              console.log('I disliked this photo');
              galleryObject.canAddDislike = false;
            } else {
              console.log('I didnt dislike this photo');
              galleryObject.canAddDislike = true;
            }
          });
        }
        photos.push(gallery[i]);
      }
      photos.reverse();
      if (cb) cb(photos);
    });
  }

  return {
    all: function(requestTimestamp, cb) {
      startGettingPhotos(requestTimestamp, cb);
      return photos;
    },
    remove: function(chat) {
      requests.splice(requests.indexOf(chat), 1);
    }
  };
});
