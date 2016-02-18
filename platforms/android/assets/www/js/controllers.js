/**
 * Created by magdakowalska on 02/11/2015.
 */

var teleportApp = angular.module('teleport.controllers', []);

var myLat;
var myLng;

$ionicPlatform.ready(function() {
  var options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
  };

  function success(pos) {
    myLat = pos.coords.latitude;
    myLng = pos.coords.longitude;
  }

  function error(err) {
    console.warn('ERROR LOCATION(' + err.code + '): ' + err.message);
  }

  navigator.geolocation.getCurrentPosition(success, error, options);
});

teleportApp.controller('MapCtrl', function(FirebaseRef, $scope, $state, $cordovaGeolocation, $firebaseArray, $ionicPopup, $ionicLoading) {

  countPendingRequests();

  function isStillActive(ts) {
    var timestampMinutesAgo = Date.now() - 10 * 60 * 1000;
    var value = ts - timestampMinutesAgo;
    return value > 0;
  }

  var getDistance = function(p1, p2) {
    var distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    return distance;
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

  $scope.countPending = '...';

  function countPendingRequests() {
    var countRef = FirebaseRef.child("requests");
    var countRefArray = $firebaseArray(countRef);
    var count = 0;
    countRefArray.$loaded().then(function() {
      var myLoc = new google.maps.LatLng(myLat, myLng);
      for (var i = 0; i < countRefArray.length; i++) {
        var reqLoc = new google.maps.LatLng(countRefArray[i].latitude, countRefArray[i].longitude);
        var ts = countRefArray[i].timestamp;
        var reqRequester = countRefArray[i].requesterID;
        var distance = getDistance(myLoc, reqLoc);
        if ( distance <= 200 && reqRequester != FirebaseRef.getAuth().uid && isStillActive(ts) && !haveUserDeclined(countRefArray[i])) {
          count++;
        }
      }
      $scope.countPending = count;
    });
  }

  function takeScreenshot() {
    navigator.screenshot.URI(function(error,res){
      if(error){
        console.error(error);
      }else{
        $scope.reqScreenshot = res.URI;
      }
    },40);
  }

  $scope.disableTap = function(){
    container = document.getElementsByClassName('pac-container');
    angular.element(container).attr('data-tap-disabled', 'true');
    angular.element(container).on("click", function(){
      document.getElementById('pac-input').blur();
    });
  };

  $scope.sendRequest = function() {

    var requestLatitude = $scope.centerMap.lat();
    var requestLongitude = $scope.centerMap.lng();

    takeScreenshot();

    var popup = $ionicPopup.prompt({
      title: 'Where are you teleporting to?',
      subTitle: 'Add a short message',
      inputType: 'text'
    }).then(function(res) {
      $scope.requestName = res;
    });

    popup.then(function() {

      if($scope.requestName != undefined) {

        var fbAuth = FirebaseRef.getAuth();

        if(fbAuth) {
          var ts = Date.now();
          var requestsRef = FirebaseRef.child("requests").child(ts);

          var userRef = FirebaseRef.child("users").child(fbAuth.uid);

          userRef.once("value", function(data) {
            var userName = data.val().displayName;
            var userLocation = data.val().location;

            requestsRef.set({
              name: $scope.requestName,
              latitude: requestLatitude,
              longitude: requestLongitude,
              timestamp: ts,
              requesterName: userName,
              requesterID: fbAuth.uid,
              requesterLocation: userLocation,
              repliedBy: "none",
              declinedBy: "none",
              screenshot: $scope.reqScreenshot,
              repliesNumber: 0
            });

            var reqDate = new Date(ts);
            var data = {
              requestLatitude: $scope.centerMap.lat(),
              requestLongitude: $scope.centerMap.lng(),
              requestDate: reqDate,
              requesterName: userName,
              requesterFrom: userLocation
            };

            $$log$$('request-created', data);

          });

          var channelName = 'req' + ts;
          $ionicLoading.show({ template: 'Request sent!', noBackdrop: true, duration: 1500 });
          ParsePlugin.subscribe(channelName, function() {});
        }
      } else {
        $ionicLoading.show({ template: 'Request not sent', noBackdrop: true, duration: 1000 });
      }
    });
  };

  var options = {timeout: 10000, enableHighAccuracy: true};

  $cordovaGeolocation.getCurrentPosition(options).then(function(position){

    var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    var mapOptions = {
      center: latLng,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    };

    var map = new google.maps.Map(document.getElementById("map"), mapOptions);

    $scope.centerMap = map.getCenter();

    var circle = new google.maps.Circle({
      strokeWeight: 0,
      fillColor: '#0daba4',
      fillOpacity: 0.35,
      map: map,
      center: $scope.centerMap,
      radius: 200,
      draggable: false,
      geodesic: true
    });

    map.addListener('idle',function(){
      if($scope.centerMap !== this.getCenter()) {
        $scope.centerMap = this.getCenter();
        circle.setCenter($scope.centerMap);
      }
    });

    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    var markers = [];
    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();
      if (places.length == 0) {
        return;
      }
      markers.forEach(function(marker) {
        marker.setMap(null);
      });
      markers = [];

      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        markers.push(new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          position: place.geometry.location
        }));

        if (place.geometry.viewport) {
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
    });

  }, function(error){
    console.log("Could not get location");
  });

});

teleportApp.controller('LoginCtrl', function (FirebaseRef, $scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, $cordovaCamera) {

  if (isLoggedIn()) {
    $state.go('map');
    return;
  }

  function isLoggedIn() {
    return FirebaseRef.getAuth() != null;
  }

  $scope.pickPhoto = function() {

    var options = {
      quality: 30,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function (imageData) {
      document.getElementById('isPictureAdded').innerHTML = 'Photo added!';
      $scope.profilePictureURI = imageData;
    }, function (err) {
      document.getElementById('isPictureAdded').innerHTML = 'Photo not added.';
      $ionicPopup.alert({
        title: 'Teleport',
        template: 'Something went wrong when loading photo. Try again'
      })
    });
  };

  var auth = $firebaseAuth(FirebaseRef);

  $ionicModal.fromTemplateUrl('templates/signup.html', {
    scope: $scope
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.checkBox = false;
  $scope.isChecked = function() {
    $scope.checkBox = !$scope.checkBox;
  };

  $scope.createUser = function (user) {
    if (user && user.email && user.password && user.displayname && user.location && $scope.profilePictureURI != null && $scope.checkBox ) {
      $ionicLoading.show({
        template: 'Signing Up...'
      });

      auth.$createUser({
        email: user.email,
        password: user.password
      }).then(function (userData) {
        alert("User created successfully!");
        FirebaseRef.child("users").child(userData.uid).set({
          email: user.email,
          displayName: user.displayname,
          location: user.location,
          profilePicture: $scope.profilePictureURI,
          likes: 0,
          dislikes: 0
        });
        $ionicLoading.hide();
        $scope.modal.hide();
      }).catch(function (error) {
        alert("Error: " + error);
        $ionicLoading.hide();
      });
    } else
      alert("Please fill all details");
  };

  $scope.signIn = function (user) {

    if (user && user.email && user.pwdForLogin) {
      $ionicLoading.show({
        template: 'Signing In...'
      });
      auth.$authWithPassword({
        email: user.email,
        password: user.pwdForLogin
      }).then(function (authData) {
        ParsePlugin.initialize("QPhqq46IfsZuIT9GLUMydSwHHNRakPas2u2mIjDl", "ixkdoG5b66pJfR6s1PnlyTc1WX83XVKYLY7aMAar", authData.uid, function () {
        });
        FirebaseRef.child("users").child(authData.uid).once('value', function (snapshot) {
          var val = snapshot.val();
          $scope.$apply(function () {
            $rootScope.displayName = val;
          });
        });
        $ionicLoading.hide();
        $state.go('map');
      }).catch(function (error) {
        alert("Authentication failed:" + error.message);
        $ionicLoading.hide();
      });
    } else
      alert("Please enter email and password both");
  }
});

teleportApp.controller('ReceivedRequestsCtrl', function(FirebaseRef, $scope, $ionicViewSwitcher, $cordovaCamera, $firebaseArray, $firebaseObject, ReceivedRequests, $ionicPopup, $state) {

  var eventDate = new Date();
  var data = {
    view: "ReceivedRequests",
    eventDate: eventDate
  };
  $$log$$('view-changed', data);

  var fbAuth = FirebaseRef.getAuth();
  var myID = fbAuth.uid;

  $scope.loading = true;
  $scope.noRequestsToShow = false;
  $scope.receivedRequests = ReceivedRequests.all(myLat, myLng, myID, initImages);

  function initImages() {
    $scope.receivedRequests.forEach(function(req) {
      getRequestersPhotos(req.requesterID, req);
    });
    $scope.noRequestsToShow = $scope.receivedRequests.length === 0;
    $scope.loading = false;
  }

  function getRequestersPhotos(userID, req) {
    var tempRef = FirebaseRef.child("users").child(userID);
    var sync = $firebaseObject(tempRef);
    sync.$loaded(function(data) {
      req.authorImg = data.profilePicture;
    });
  }

  $scope.swipeRight = function() {
    $ionicViewSwitcher.nextDirection("back");
    $state.go("map");
  };

  $scope.reloadArray = function() {
    $scope.loading = true;
    $scope.receivedRequests = ReceivedRequests.all(myLat, myLng, myID, initImages);
    $scope.$broadcast('scroll.refreshComplete');
  };

  $scope.runTimer = function(request) {
    var reqTimestamp = request.timestamp / 1000;
    var now = Date.now() / 1000;
    var value = 600 - (now - reqTimestamp);
    if(value > 0){
      return value;
    } else {
      return -1;
    }
  };

  $scope.checkReplies = function(req) {
    if(req.repliedBy !="none"){
      for(reply in req.repliedBy) {
        if(reply === FirebaseRef.getAuth().uid) {
          return true;
        }
      }
      return false;
    }
    return false;
  };

  $scope.decline = function(request) {

    var reqDate = new Date(request.timestamp);
    var data = {
      requestLatitude: request.latitude,
      requestLongitude: request.longitude,
      requestDate: reqDate
    };
    $$log$$('request-declined', data);

    var declineRef =  FirebaseRef.child("requests").child(request.timestamp).child("declinedBy").child(FirebaseRef.getAuth().uid);
    declineRef.set(true);
    ReceivedRequests.remove(request);
  };

  $scope.myUserID = FirebaseRef.getAuth().uid;

  $scope.takePhoto = function (reqPhoto) {

    var photoTimestamp = Date.now();

    var reqDate = new Date(reqPhoto.timestamp);
    var photoDate = new Date(photoTimestamp);
    var data = {
      requestName: reqPhoto.name,
      requestLatitude: reqPhoto.latitude,
      requestLongitude: reqPhoto.longitude,
      requestDate: reqDate,
      photoDate: photoDate
    };
    $$log$$('photo-added', data);

    var requestGalleryRef = FirebaseRef.child("photos").child(reqPhoto.timestamp).child(photoTimestamp);

    var userDisplayName;
    var refUser = FirebaseRef.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
      var requestRef = FirebaseRef.child("requests").child(reqPhoto.timestamp).child("repliedBy").child(FirebaseRef.getAuth().uid);
      requestRef.set(true);
    });

    var tempRef = FirebaseRef.child("requests").child(reqPhoto.timestamp).child("repliesNumber");
    tempRef.on('value', function(dataSnapshot) {
      $scope.valReplies = dataSnapshot.val() + 1;
    });
    tempRef.set($scope.valReplies);

    var options = {
      quality: 40,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA,
      allowEdit: false,
      encodingType: Camera.EncodingType.JPEG,
      saveToPhotoAlbum: false,
      correctOrientation: true
    };

    $cordovaCamera.getPicture(options).then(function (imageData) {
      requestGalleryRef.set({
        image: imageData,
        author: userDisplayName,
        authorID: myID,
        timestamp: photoTimestamp
      });
    }, function (err) {
      $ionicPopup.alert({
        title: 'Teleport',
        template: 'Something went wrong when taking photo.'
      })
    });

    var photoLikesRef = FirebaseRef.child("likes").child(reqPhoto.timestamp).child(photoTimestamp);
    photoLikesRef.set({
      thumbsUp: {
        value: 0,
        whoClicked: 'none'
      },
      thumbsDown: {
        value: 0,
        whoClicked: 'none' }
    });

    var channelName = "req" + reqPhoto.timestamp;
    ParsePlugin.subscribe(channelName, function() {});

  };

});

teleportApp.controller('CreatedRequestsCtrl', function(FirebaseRef, $scope, $firebaseObject, $firebaseArray, CreatedRequests, $state, $ionicViewSwitcher) {

  var eventDate = new Date();
  var data = {
    view: "MyCreatedRequests",
    eventDate: eventDate
  };
  $$log$$('view-changed', data);

  var myID = FirebaseRef.getAuth().uid;

  $scope.loading = true;
  $scope.noRequestsToShow = false;
  $scope.createdRequestsMine = CreatedRequests.all(myID, loadingInformation);

  $scope.reloadArray = function() {
    $scope.createdRequestsMine = CreatedRequests.all(myID, loadingInformation);
    $scope.$broadcast('scroll.refreshComplete');
  };

  $scope.swipeLeft = function() {
    $ionicViewSwitcher.nextDirection("forward");
    $state.go("map");
  };

  $scope.runTimer = function(request) {
    var reqTimestamp = request.timestamp / 1000;
    var now = Date.now() / 1000;
    var value = 600 - (now - reqTimestamp);
    if(value > 0){
      return value;
    } else {
      return -1;
    }
  };

  function loadingInformation() {
    $scope.createdRequestsMine.forEach(function(req) {
      getNumberOfPhotos(req);
    });
    $scope.noRequestsToShow = $scope.createdRequestsMine.length === 0;
    $scope.loading = false;
  }

  function convertToString(size) {
    if(size == 0) {
      return "0 photos in gallery";
    } else if (size == 1) {
      return "1 photo in gallery";
    } else {
      return size + " photos in gallery";
    }
  }

  function getNumberOfPhotos(req) {
    var tempRef = FirebaseRef.child("requests").child(req.timestamp);
    tempRef.once("value", function (snapshot) {
      req.numberOfPhotos = convertToString(snapshot.val().repliesNumber);
    });
  }

});

teleportApp.controller('GalleryCtrl', function(FirebaseRef, $scope, $firebaseArray, $firebaseObject, $stateParams, $cordovaCamera, $ionicPopup, GalleryService) {

  var requestTimestamp = $stateParams.req;
  $scope.requestName = $stateParams.reqname;

  FirebaseRef.child("photos").on("child_changed", function(childSnapshot) {
    if(childSnapshot.key() === requestTimestamp) {
      reloadArray();
    }
  });

  var eventDate = new Date();
  var data = {
    view: "Gallery",
    eventDate: eventDate,
    galleryName: $scope.requestName
  };
  $$log$$('view-changed', data);

  $scope.loading = true;
  $scope.images = GalleryService.all(requestTimestamp, initImages);

  function initImages() {
    $scope.loading = false;
    $scope.images.forEach(function(img) {
      startFetchingPhoto(img.authorID, img);
      startFetchingLikes(img);
      addTimers(img);
    });
  }

  function addTimers(img) {
    var value = Math.floor((Date.now()/60000) - (img.timestamp/60000));
    if(value === 0) {
      img.minutesAgo = "less than minute ago";
    }
    else if(value === 1) {
      img.minutesAgo = "1 minute ago";
    }
    else {
      img.minutesAgo = value + " minutes ago";
    }
  }

  function startFetchingLikes(img) {
    var tempRef = FirebaseRef.child("likes").child(requestTimestamp).child(img.timestamp);
    var sync = $firebaseObject(tempRef);
    sync.$loaded(function(data) {
      img.thumbsUp = data.thumbsUp.value;
      img.thumbsDown = data.thumbsDown.value;
    });
  }

  function startFetchingPhoto(userID, img) {
    var tempRef = FirebaseRef.child("users").child(userID);
    var sync = $firebaseObject(tempRef);
    sync.$loaded(function(data) {
      img.authorImg = data.profilePicture;
    });
  }

  function reloadArray() {
    $scope.loading = true;
    $scope.images = GalleryService.all(requestTimestamp, initImages);
    $scope.$broadcast('scroll.refreshComplete');
  }

  $scope.reloadArray = reloadArray;

  $scope.likePhoto = function(img) {
    var photoDate = new Date(img.timestamp);
    var data = {
      photoAuthor: img.author,
      photoDate: photoDate
    };
    $$log$$('like-added', data);

    img.thumbsUp += 1;
    var saveTime = img.minutesAgo;
    var likeRef = FirebaseRef.child("likes").child(requestTimestamp).child(img.timestamp).child("thumbsUp");
    likeRef.on('value', function(dataSnapshot) {
      $scope.val = dataSnapshot.val().value + 1;
    });
    likeRef.update({value:$scope.val});
    switchLikes(false, false, img);
    addLikeToAuthor(img, 'thumbsUp');
    addLikerToWhoClicked(img);
    img.minutesAgo = saveTime;
  };

  function switchLikes(like, dislike, img) {
    img.canAddDislike = like;
    img.canAddLike = dislike;
  }

  $scope.dislikePhoto = function(img) {
    var photoDate = new Date(img.timestamp);
    var data = {
      photoAuthor: img.author,
      photoDate: photoDate
    };
    $$log$$('dislike-added', data);

    img.thumbsDown += 1;
    var saveTime = img.minutesAgo;
    var likeRef = FirebaseRef.child("likes").child(requestTimestamp).child(img.timestamp).child("thumbsDown");
    likeRef.on('value', function(dataSnapshot) {
      $scope.val = dataSnapshot.val().value + 1;
    });
    likeRef.update({value:$scope.val});
    switchLikes(false, false, img);
    addLikeToAuthor(img, 'thumbsDown');
    addLikerToWhoClicked(img);
    img.minutesAgo = saveTime;
  };

  function addLikeToAuthor(img, yesno) {
    var authorRef = FirebaseRef.child("users").child(img.authorID);
    authorRef.on('value', function(dataSnapshot) {
      if(yesno === 'thumbsUp') {
        $scope.val = dataSnapshot.val().likes + 1;
      } else {
        $scope.val = dataSnapshot.val().dislikes + 1;
      }
    });
    if(yesno === 'thumbsUp') {
      authorRef.update({likes:$scope.val});
    } else {
      authorRef.update({dislikes:$scope.val});
    }
  }

  function addLikerToWhoClicked(img) {
    var tempRef1 = FirebaseRef.child("likes").child(requestTimestamp).child(img.timestamp).child('thumbsUp').child("whoClicked").child(FirebaseRef.getAuth().uid);
    tempRef1.set(true);
    var tempRef2 = FirebaseRef.child("likes").child(requestTimestamp).child(img.timestamp).child('thumbsDown').child("whoClicked").child(FirebaseRef.getAuth().uid);
    tempRef2.set(true);
  }

  $scope.takeNextPhoto = function() {

    var photoTimestamp = Date.now();

    var reqDate = new Date(requestTimestamp);
    var photoDate = new Date(photoTimestamp);
    var data = {
      requestName: $scope.requestName,
      requestDate: reqDate,
      photoDate: photoDate
    };
    $$log$$('photo-added', data);

    var fbAuth = FirebaseRef.getAuth();


    var requestGalleryRef = FirebaseRef.child("photos").child(requestTimestamp).child(photoTimestamp);

    var userDisplayName;
    var refUser = FirebaseRef.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
    });

    var tempRef = FirebaseRef.child("requests").child(requestTimestamp).child("repliesNumber");
    tempRef.on('value', function(dataSnapshot) {
      $scope.valReplies = dataSnapshot.val() + 1;
    });
    tempRef.set($scope.valReplies);

    var options = {
      quality: 40,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA,
      allowEdit: false,
      encodingType: Camera.EncodingType.JPEG,
      saveToPhotoAlbum: false,
      correctOrientation: true
    };

    $cordovaCamera.getPicture(options).then(function (imageData) {
      requestGalleryRef.set({
        image: imageData,
        author: userDisplayName,
        authorID: fbAuth.uid,
        timestamp: photoTimestamp
      });
    }, function (err) {
      $ionicPopup.alert({
        title: 'teleport',
        template: 'Something went wrong when taking photo.'
      })
    });

    var photoLikesRef = FirebaseRef.child("likes").child(requestTimestamp).child(photoTimestamp);
    photoLikesRef.set({
      thumbsUp: {
        value: 0,
        whoClicked: 'none'
      },
      thumbsDown: {
        value: 0,
        whoClicked: 'none' }
    });

    var channelName = "req" + requestTimestamp;
    ParsePlugin.subscribe(channelName, function() {});

  };

});

teleportApp.controller('SettingsCtrl', function(FirebaseRef, $scope, $firebaseObject, $ionicHistory, $ionicPopup, $state, $ionicLoading) {

  var eventDate = new Date();
  var data = {
    view: "Settings",
    eventDate: eventDate
  };
  $$log$$('view-changed', data);

  var fbAuth = FirebaseRef.getAuth();
  var userRef = FirebaseRef.child("users").child(fbAuth.uid);
  var sync = $firebaseObject(userRef);
  sync.$loaded(function(data) {
    $scope.userLocation = data.location;
    $scope.userLikes = data.likes;
    $scope.userDislikes = data.dislikes;
    $scope.userPhoto = data.profilePicture;
  });

  $scope.logout = function() {
    FirebaseRef.unauth();
    ParsePlugin.logout();
    $state.go('login');
    $ionicLoading.show({ template: 'Successful log out', noBackdrop: true, duration: 1000 });
  };

  $scope.updateLocation = function() {
    var popup = $ionicPopup.prompt({
      title: 'What\'s your usual location?',
      inputType: 'text'
    }).then(function(res) {
      $scope.newLocationName = res;
      userRef.update({location : $scope.newLocationName});
    });
  };

  $scope.goBackFunc = function() {
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    });
    $ionicHistory.goBack();
  };

});


