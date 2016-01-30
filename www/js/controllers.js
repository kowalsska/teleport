/**
 * Created by magdakowalska on 02/11/2015.
 */

var teleportApp = angular.module('teleport.controllers', []);

var myLat;
var myLng;

var options = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 0
};

function success(pos) {
  myLat = pos.coords.latitude;
  myLng = pos.coords.longitude;
  console.log('lat', myLat);
  console.log('long', myLng);
}

function error(err) {
  console.warn('ERROR LOCATION(' + err.code + '): ' + err.message);
}

navigator.geolocation.getCurrentPosition(success, error, options);

teleportApp.controller('MapCtrl', function(FirebaseRef, $scope, $state, $cordovaGeolocation, $firebaseArray, $ionicPopup, $ionicLoading) {

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

        var fbAuth = FirebaseRef.getAuth();

        if(fbAuth) {
          var requestsRef = FirebaseRef.child("requests");
          var newRequestRef = requestsRef.push();
          var ts = Date.now();

          var userRef = FirebaseRef.child("users").child(fbAuth.uid);

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

  console.log('Login Controller Initialized');

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

  var auth = $firebaseAuth(FirebaseRef);

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
        console.log("Logged in as: " + authData.uid);
        //Parse
        if (!!window.ParsePlugin) {
          ParsePlugin.initialize("QPhqq46IfsZuIT9GLUMydSwHHNRakPas2u2mIjDl", "ixkdoG5b66pJfR6s1PnlyTc1WX83XVKYLY7aMAar", authData.uid, function () {
          });
        }
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

teleportApp.controller('ReceivedRequestsCtrl', function(FirebaseRef, $scope, $timeout, $ionicViewSwitcher, $cordovaCamera, $firebaseArray, $firebaseObject, ReceivedRequests, $ionicPopup, $state) {

  var fbAuth = FirebaseRef.getAuth();
  var myID = fbAuth.uid;

  $scope.loading = true;
  $scope.receivedRequests = ReceivedRequests.all(myLat, myLng, myID, initImages);

  function initImages() {
    $scope.loading = false;
    $scope.receivedRequests.forEach(function(req) {
      getRequestersPhotos(req.requesterID, req);
    });
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
        var replyRef = FirebaseRef.child("requests").child(req.ref).child("repliedBy").child(reply);
        replyRef.on("value", function (snapshot) {
          $scope.whoReplied = snapshot.val().repliedByID;
        });
        if ($scope.whoReplied === myID) {
          return true;
        }
      }
      return false;
    } else {
      return false;
    }
  };

  $scope.decline = function(request) {

    var fbAuth = FirebaseRef.getAuth();

    var userDisplayName;
    var refUser = FirebaseRef.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
    });

    var requestRef = FirebaseRef.child("requests").child(request.ref).child("declinedBy");
    var declinedByArray = $firebaseArray(requestRef);
    declinedByArray.$add({
      declinedByID: fbAuth.uid,
      declinedByName: userDisplayName
    });

    ReceivedRequests.remove(request);

  };

  $scope.myUserID = FirebaseRef.getAuth().uid;

  $scope.takePhoto = function (reqPhoto) {

    $$log$$('someone', 'addedPhoto');

    var myID = FirebaseRef.getAuth().uid;

    var requestGalleryRef = FirebaseRef.child("photos").child(reqPhoto.timestamp);
    var requestsGalleryArray = $firebaseArray(requestGalleryRef);

    var userDisplayName;
    var refUser = FirebaseRef.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
      var requestRef = FirebaseRef.child("requests").child(reqPhoto.ref).child("repliedBy");
      var repliedByArray = $firebaseArray(requestRef);
      repliedByArray.$add({
        repliedByID: fbAuth.uid,
        repliedByName: userDisplayName
      });
    });

    var options = {
      quality: 40,
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
        authorID: myID,
        likes: {thumbsUp: {value: 0, whoClicked: 'none' }, thumbsDown: {value: 0, whoClicked: 'none' } },
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

teleportApp.controller('CreatedRequestsCtrl', function(FirebaseRef, $scope, $firebaseObject, $firebaseArray, CreatedRequests, $state, $ionicViewSwitcher) {

  var fbAuth = FirebaseRef.getAuth();
  var myID = fbAuth.uid;

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
    var value = 300 - (now - reqTimestamp);
    if(value > 0){
      return value;
    } else {
      return -1;
    }
  };

  function loadingInformation(loadingVar) {
    $scope.noRequestsToShow = loadingVar;
    $scope.createdRequestsMine.forEach(function(req) {
      getNumberOfPhotos(req);
    });
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
    //var tempRef = FirebaseRef.child("photos").child(req.timestamp);
    //tempRef.once("value", function (snapshot) {
    //  var a = snapshot.numChildren();
    //  console.log(a);
    //  req.numberOfPhotos = a;
    //});
    req.numberOfPhotos = convertToString(5);
  }

});

teleportApp.controller('GalleryCtrl', function(FirebaseRef, $scope, $firebaseArray, $firebaseObject, $stateParams, $cordovaCamera, $ionicPopup, GalleryService) {

  var requestTimestamp = $stateParams.req;
  var requestID = $stateParams.reqid;
  $scope.requestName = $stateParams.reqname;
  var now = Date.now();
  $scope.try1 = 1;


  $scope.loading = true;
  $scope.images = GalleryService.all(requestTimestamp, initImages);

  function initImages() {
    $scope.loading = false;
    $scope.images.forEach(function(img) {
      startFetchingPhoto(img.authorID, img);
      addTimers(img, now);
    });
  }

  function addTimers(img, now) {
    var photoTimestamp = img.timestamp;
    var value = Math.floor((now/60000) - (photoTimestamp/60000));
    if(value === 0) {
      img.minutesAgo = "less than a minute ago";
    }
    else if(value === 1) {
      img.minutesAgo = "1 minute ago";
    }
    else {
      img.minutesAgo = value + " minutes ago";
    }
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
    var saveTime = img.minutesAgo;
    var likeRef = FirebaseRef.child("photos").child(requestTimestamp).child(img.$id).child("likes").child("thumbsUp");
    likeRef.on('value', function(dataSnapshot) {
      $scope.val = dataSnapshot.val().value + 1;
    });
    likeRef.update({value:$scope.val});
    switchLikes(false, 'disable', img);
    //img.canAddLike = false;
    //img.canAddDislike = 'disable';
    console.log("Like added");
    console.log("can I add like now?", img.canAddLike);
    console.log("can I still dislike?", img.canAddDislike);
    //addTimers(img, now);
    addLikeToAuthor(img, 'thumbsUp');
    addLikerToWhoClicked(img, 'thumbsUp');
    img.minutesAgo = saveTime;
  };

  function switchLikes(like, dislike, img) {
    img.canAddDislike = like;
    img.canAddLike = dislike;
  }

  $scope.dislikePhoto = function(img) {
    var saveTime = img.minutesAgo;
    var likeRef = FirebaseRef.child("photos").child(requestTimestamp).child(img.$id).child("likes").child("thumbsDown");
    likeRef.on('value', function(dataSnapshot) {
      $scope.val = dataSnapshot.val().value + 1;
    });
    likeRef.update({value:$scope.val});
    switchLikes('disable', false, img);
    //img.canAddDislike = false;
    //img.canAddLike = 'disable';
    console.log("can I add dislike now?", img.canAddDislike);
    console.log("can I still like?", img.canAddLike);
    //addTimers(img, now);
    addLikeToAuthor(img, 'thumbsDown');
    addLikerToWhoClicked(img, 'thumbsDown');
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

  function addLikerToWhoClicked(img, likeType) {
    var tempRef = FirebaseRef.child("photos").child(requestTimestamp).child(img.$id).child("likes").child(likeType).child("whoClicked").child(FirebaseRef.getAuth().uid);
    tempRef.set(true);
  }

  $scope.takeNextPhoto = function () {

    $$log$$('someone two', 'added more photos');

    var fbAuth = FirebaseRef.getAuth();

    var requestGalleryRef = FirebaseRef.child("photos").child(requestTimestamp);
    var requestsGalleryArray = $firebaseArray(requestGalleryRef);

    var userDisplayName;
    var refUser = FirebaseRef.child("users").child(fbAuth.uid);
    refUser.on("value", function (snapshot) {
      userDisplayName = snapshot.val().displayName;
    });

    var options = {
      quality: 40,
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
        likes: {thumbsUp: {value: 0, whoClicked: 'none' }, thumbsDown: {value: 0, whoClicked: 'none' } },
        timestamp: Date.now()
      });
    }, function (err) {
      $ionicPopup.alert({
        title: 'teleport',
        template: 'Something went wrong when taking photo.'
      })
    });

    reloadArray();

  };

});

teleportApp.controller('SettingsCtrl', function(FirebaseRef, $scope, $firebaseObject, $ionicHistory, $ionicPopup, $state, $ionicLoading) {

  //sometimes works , sometimes not
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
    $ionicLoading.show({ template: 'Sucessful log out', noBackdrop: true, duration: 1000 });
  };

  //works nice in the browser, not on a phone
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


