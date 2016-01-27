/**
 * Created by magdakowalska on 02/11/2015.
 */

var teleportApp = angular.module('teleport.controllers', []);

var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

var myLat;
var myLng;

var options = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 0
};

function success(pos) {
  var crd = pos.coords;

  myLat = pos.coords.latitude;
  myLng = pos.coords.longitude;

  console.log('Your current position is:');
  console.log('Latitude : ' + crd.latitude);
  console.log('Longitude: ' + crd.longitude);
  console.log('More or less ' + crd.accuracy + ' meters.');
}

function error(err) {
  console.warn('ERROR LOCATION(' + err.code + '): ' + err.message);
}

navigator.geolocation.getCurrentPosition(success, error, options);

teleportApp.controller('MapCtrl', function($scope, $state, $cordovaGeolocation, $firebaseArray, $ionicPopup, $ionicLoading, $ionicViewSwitcher) {

  function takeScreenshot() {
    navigator.screenshot.URI(function(error,res){
      if(error){
        console.error(error);
      }else{
        $scope.reqScreenshot = res.URI;
      }
    },50);
  }

  $scope.disableTap = function(){
    container = document.getElementsByClassName('pac-container');
    // disable ionic data tab
    angular.element(container).attr('data-tap-disabled', 'true');
    // leave input field if google-address-entry is selected
    angular.element(container).on("click", function(){
      document.getElementById('pac-input').blur();
    });
  };

  $scope.sendRequest = function() {

    takeScreenshot();

    var popup = $ionicPopup.prompt({
      title: 'Where are you teleporting?',
      subTitle: 'Give it a name',
      inputType: 'text'
    }).then(function(res) {
      $scope.requestName = res;
    });

    popup.then(function() {

      if($scope.requestName != undefined) {

        var fbAuth = ref.getAuth();

        if(fbAuth) {
          var requestsRef = ref.child("requests");
          var newRequestRef = requestsRef.push();
          var ts = Date.now();

          var userRef = ref.child("users").child(fbAuth.uid);

          userRef.once("value", function(data) {
            var user = data.val();
            var userName = user.displayName;
            var userLocation = user.location;

            newRequestRef.set({
              ref: newRequestRef.key(),
              name: $scope.requestName,
              latitude: $scope.centerMap.lat(),
              longitude: $scope.centerMap.lng(),
              timestamp: ts,
              requesterName: userName,
              requesterID: fbAuth.uid,
              requesterLocation: userLocation,
              repliedBy: "none",
              declinedBy: "none",
              screenshot: $scope.reqScreenshot
            });
          });
          $ionicLoading.show({ template: 'Request sent!', noBackdrop: true, duration: 1500 });
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

    // Construct a draggable red triangle with geodesic set to true.
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

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    var markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {

      var places = searchBox.getPlaces();

      if (places.length == 0) {
        return;
      }

      // Clear out the old markers.
      markers.forEach(function(marker) {
        marker.setMap(null);
      });
      markers = [];

      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        markers.push(new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          position: place.geometry.location
        }));

        if (place.geometry.viewport) {
          // Only geocodes have viewport.
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

teleportApp.controller('LoginCtrl', function ($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, $cordovaCamera) {

  console.log('Login Controller Initialized');

  if (isLoggedIn()) {
    $state.go('map');
    return;
  }

  function isLoggedIn() {
    return ref.getAuth() != null;
  }

  //$scope.profilePictureURI = null;

  $scope.pickPhoto = function() {

    var options = {
      quality: 60,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function (imageData) {
      document.getElementById('isPictureAdded').innerHTML = 'Photo added!';
      $scope.profilePictureURI = imageData;
    }, function (err) {
      $ionicPopup.alert({
        title: 'teleport',
        template: 'Something went wrong when loading photo.'
      })
    });
  };

  var auth = $firebaseAuth(ref);

  $ionicModal.fromTemplateUrl('templates/signup.html', {
    scope: $scope
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.createUser = function (user) {
    console.log("Create User Function called");
    if (user && user.email && user.password && user.displayname && user.location && $scope.profilePictureURI != null) {
      $ionicLoading.show({
        template: 'Signing Up...'
      });

      auth.$createUser({
        email: user.email,
        password: user.password
      }).then(function (userData) {
        alert("User created successfully!");
        ref.child("users").child(userData.uid).set({
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
        console.log("Logged in as: " + authData.uid);
        //Parse
        if (!!window.ParsePlugin) {
          ParsePlugin.initialize("QPhqq46IfsZuIT9GLUMydSwHHNRakPas2u2mIjDl", "ixkdoG5b66pJfR6s1PnlyTc1WX83XVKYLY7aMAar", authData.uid, function () {
          });
        }
        ref.child("users").child(authData.uid).once('value', function (snapshot) {
          var val = snapshot.val();
          // To Update AngularJS $scope either use $apply or $timeout
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

teleportApp.controller('ReceivedRequestsCtrl', function($scope, $timeout, $ionicViewSwitcher, $cordovaCamera, $firebaseArray, $firebaseObject, ReceivedRequests, $ionicPopup, $state) {

  var fbAuth = ref.getAuth();
  var myID = fbAuth.uid;

  $scope.receivedRequests = ReceivedRequests.all(myLat, myLng, myID);

  $scope.$watch('receivedRequests', initImages);

  function initImages() {
    $scope.receivedRequests.forEach(function(img) {
      startFetchingPhoto(img.authorID, img);
    });
  }

  function startFetchingPhoto(userID, req) {
    //var tempRef = ref.child("users").child(userID);
    //var sync = $firebaseObject(tempRef);
    //sync.$loaded(function(data) {
    //  req.authorImg = data.profilePicture;
    //});
  }

  $scope.swipeRight = function() {
    $ionicViewSwitcher.nextDirection("back");
    $state.go("map");
  };

  $scope.reloadArray = function() {
    $scope.receivedRequests = ReceivedRequests.all(myLat, myLng, myID);
    $scope.$broadcast('scroll.refreshComplete');
  };

  $scope.runTimer = function(request) {
    var reqTimestamp = request.timestamp / 1000;
    var now = Date.now() / 1000;
    var value = 300 - (now - reqTimestamp);
    if(value > 0){
      return value;
    } else {
      return -1;
    }
  };

  $scope.checkReplies = function(req) {
    if(req.repliedBy != "none") {
      for (reply in req.repliedBy) {
        var replyRef = ref.child("requests").child(req.ref).child("repliedBy").child(reply);
        replyRef.on("value", function (snapshot) {
          $scope.whoReplied = snapshot.val().repliedByID;
        });
        if ($scope.whoReplied === myID) {
          //console.log("Yes you replied to this request");
          return true;
        }
      }
      //console.log("Current user didnt reply");
      return false;
    } else {
      //console.log("None replied yet");
      return false;
    }
  };

  $scope.decline = function(request) {

    var fbAuth = ref.getAuth();

    var userDisplayName;
    var refUser = ref.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
    });

    var requestRef = ref.child("requests").child(request.ref).child("declinedBy");
    var declinedByArray = $firebaseArray(requestRef);
    declinedByArray.$add({
      declinedByID: fbAuth.uid,
      declinedByName: userDisplayName
    });

    ReceivedRequests.remove(request);

  };

  $scope.myUserID = ref.getAuth().uid;

  $scope.takePhoto = function (reqPhoto) {

    var fbAuth = ref.getAuth();

    var requestGalleryRef = ref.child("photos").child(reqPhoto.timestamp);
    var requestsGalleryArray = $firebaseArray(requestGalleryRef);

    //console.log(reqPhoto.ref);
    var userDisplayName;
    var refUser = ref.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
    });

    var requestRef = ref.child("requests").child(reqPhoto.ref).child("repliedBy");
    var repliedByArray = $firebaseArray(requestRef);
    repliedByArray.$add({
      repliedByID: fbAuth.uid,
      repliedByName: userDisplayName
    });

    var options = {
      quality: 80,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA,
      allowEdit: false,
      encodingType: Camera.EncodingType.JPEG,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function (imageData) {
      requestsGalleryArray.$add({
        image: imageData,
        author: userDisplayName,
        authorID: fbAuth.uid,
        thumbsUp: 0,
        thumbsDown: 0,
        timestamp: Date.now()
      });
    }, function (err) {
      $ionicPopup.alert({
        title: 'teleport',
        template: 'Something went wrong when taking photo.'
      })
    });
  };

});

teleportApp.controller('CreatedRequestsCtrl', function($scope, $firebaseObject, CreatedRequests, $state, $ionicViewSwitcher) {

  var fbAuth = ref.getAuth();
  var myID = fbAuth.uid;

  $scope.createdRequestsMine = CreatedRequests.all(myID);

  $scope.reloadArray = function() {
    $scope.createdRequestsMine = CreatedRequests.all(myID);
    $scope.$broadcast('scroll.refreshComplete');
  };

  $scope.swipeLeft = function() {
    $ionicViewSwitcher.nextDirection("forward");
    $state.go("map");
  };

  $scope.runTimer = function(request) {
    var reqTimestamp = request.timestamp / 1000;
    var now = Date.now() / 1000;
    //console.log("Current: " + now + " Timestamp: " + reqTimestamp);
    var value = 300 - (now - reqTimestamp);
    if(value > 0){
      return value;
    } else {
      return -1;
    }
  };

});

teleportApp.controller('GalleryCtrl', function($scope, $firebaseArray, $firebaseObject, $stateParams, $cordovaCamera, $ionicPopup, GalleryService) {

  var requestTimestamp = $stateParams.req;
  console.log('gallery', requestTimestamp);

//  $scope.$watch('images', initImages);
  $scope.loading = true;
  $scope.images = GalleryService.all(requestTimestamp, initImages);

  function initImages() {
    $scope.loading = false;
    console.log('images changed');
    $scope.images.forEach(function(img) {
      var now = Date.now();
      startFetchingPhoto(img.authorID, img);
      addTimers(img, now);
    });
  }

  function addTimers(img, now) {
    var photoTimestamp = img.timestamp;
    var value = Math.floor((now/60000) - (photoTimestamp/60000));
    if(value < 1) {
      img.minutesAgo = "less than a minute ago";
    }
    if(value === 1) {
      img.minutesAgo = "1 minute ago";
    }
    if(value > 1) {
      img.minutesAgo = value + " minutes ago";
    }
    console.log("Minutes ago: " + value);
  }

  function startFetchingPhoto(userID, img) {
    var tempRef = ref.child("users").child(userID);
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

  $scope.takeNextPhoto = function () {

    var fbAuth = ref.getAuth();

    var requestGalleryRef = ref.child("photos").child(requestTimestamp);
    var requestsGalleryArray = $firebaseArray(requestGalleryRef);

    var userDisplayName;
    var refUser = ref.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
    });

    var options = {
      quality: 50,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA,
      allowEdit: false,
      encodingType: Camera.EncodingType.JPEG,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function (imageData) {
      requestsGalleryArray.$add({
        image: imageData,
        author: userDisplayName,
        authorID: fbAuth.uid,
        thumbsUp: 0,
        thumbsDown: 0,
        timestamp: Date.now()
      });
    }, function (err) {
      $ionicPopup.alert({
        title: 'teleport',
        template: 'Something went wrong when taking photo.'
      })
    });
  };

});

teleportApp.controller('SettingsCtrl', function($scope, $firebaseObject, $ionicHistory, $ionicPopup, $state, $ionicLoading) {

  //sometimes works , sometimes not
  var fbAuth = ref.getAuth();
  var userRef = ref.child("users").child(fbAuth.uid);
  var sync = $firebaseObject(userRef);
  sync.$loaded(function(data) {
    $scope.userLocation = data.location;
    $scope.userLikes = data.likes;
    $scope.userDislikes = data.dislikes;
    $scope.userPhoto = data.profilePicture;
  });

  $scope.logout = function() {
    ref.unauth();
    ParsePlugin.logout();
    $state.go('login');
    $ionicLoading.show({ template: 'Sucessful log out', noBackdrop: true, duration: 1000 });
  };

  //works in the browser, not on a phone
  $scope.updateLocation = function() {
    var popup = $ionicPopup.prompt({
      title: 'What\'s your usual location?',
      inputType: 'text'
    }).then(function(res) {
      $scope.newLocationName = res;
      userRef.update({location : $scope.newLocationName});
      //$window.location.reload(true);
    });
  };

  $scope.goBackFunc = function() {
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    });
    $ionicHistory.goBack();
  };

});


