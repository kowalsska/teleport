/**
 * Created by magdakowalska on 02/11/2015.
 */

var teleportApp = angular.module('teleport.controllers', []);

var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

var myLat;
var myLng;

navigator.geolocation.getCurrentPosition(function(position) {
  myLat = position.coords.latitude;
  myLng = position.coords.longitude;
  console.log("My location: " + myLat + ", " + myLng);
});

teleportApp.controller('MapCtrl', function($scope, $state, $cordovaGeolocation, $firebaseArray, $ionicPopup) {


  $scope.sendRequest = function() {
    var fbAuth = ref.getAuth();
    if(fbAuth) {
      var requestsRef = ref.child("requests");

      var newRequestRef = requestsRef.push();
      var ts = Date.now();

      var userRef = new Firebase("https://fiery-heat-6378.firebaseio.com/users/" + fbAuth.uid);

      userRef.once("value", function(data) {
        var user = data.val();
        var userName = user.displayName;
        var userLocation = user.location;

        newRequestRef.set({
          ref: newRequestRef.key(),
          latitude: $scope.centerMap.lat(),
          longitude: $scope.centerMap.lng(),
          timestamp: ts,
          requesterName: userName,
          requesterID: fbAuth.uid,
          requesterLocation: userLocation,
          isReplied: false,
          repliedBy: "none"
        });

      });


      //window.plugins.screenshot.save(function(error,res){
      //  if(error){
      //    alert(error);
      //  }else{
      //    alert('ok','/img'); //should be path/to/myScreenshot.jpg
      //  }
      //},'jpg',50,ts);

      $ionicPopup.alert({
        title: 'teleport',
        template: 'Your request has been sent!'
      })
    } else {
      $ionicPopup.alert({
        title: 'teleport',
        template: 'You need to log in first!'
      })
    }


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
      strokeColor: '#FF0000',
      strokeOpacity: 0.35,
      strokeWeight: 1,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: map,
      center: $scope.centerMap,
      radius: 200,
      draggable: true,
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

  //$scope.profilePictureURI = null;

  $scope.pickPhoto = function() {
    //  var options = {
    //    maximumImagesCount: 1,
    //    width: 800,
    //    height: 800,
    //    quality: 80
    //  };
    //
    //  $cordovaImagePicker.getPictures(options).then(function (results) {
    //    document.getElementById('isPictureAdded').innerHTML = 'Photo added!';
    //    $scope.profilePictureURI = $base64.encode(results);
    //  }, function(error) {
    //    // error getting photos
    //  });
    //  //alert('Image URI: ' + $scope.profilePictureURI);
    //};
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
          profilePicture: $scope.profilePictureURI
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

teleportApp.controller('ReceivedRequestsCtrl', function($scope, $cordovaCamera, $firebaseArray, ReceivedRequests, $ionicPopup) {

  var fbAuth = ref.getAuth();
  var myID = fbAuth.uid;

  $scope.receivedRequests = ReceivedRequests.all(myLat, myLng, myID);

  $scope.decline = function(request) {
    ReceivedRequests.remove(request);
  };

  //$scope.myUserID = ref.getAuth().uid;

  $scope.takePhoto = function (reqPhoto) {

    var fbAuth = ref.getAuth();

    var requestGalleryRef = new Firebase("https://fiery-heat-6378.firebaseio.com/photos/" + reqPhoto.timestamp);
    var requestsGalleryArray = $firebaseArray(requestGalleryRef);

    //console.log(reqPhoto.ref);
    var requestRef = new Firebase("https://fiery-heat-6378.firebaseio.com/requests/" + reqPhoto.ref);
    requestRef.update({isReplied: true, repliedBy: fbAuth.uid});
    var userDisplayName;
    var refUser = new Firebase("https://fiery-heat-6378.firebaseio.com/users/" + fbAuth.uid);
    refUser.on("value", function(snapshot) {
      userDisplayName = snapshot.val().displayName;
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
        thumbsDown: 0});
      }, function (err) {
        $ionicPopup.alert({
          title: 'teleport',
          template: 'Something went wrong when taking photo.'
        })
    });

  }
});

teleportApp.controller('CreatedRequestsCtrl', function($scope, CreatedRequests) {

  var fbAuth = ref.getAuth();
  var myID = fbAuth.uid;

  $scope.createdRequestsMine = CreatedRequests.all(myID);

  $scope.runTimer = function(request) {
    var reqTimestamp = request.timestamp;
    var now = Date.now();
    return now - reqTimestamp;
  };


});

teleportApp.controller('GalleryCtrl', function($scope, $firebaseArray, $stateParams) {

  $scope.galleryRequestTimestamp = $stateParams.req;

  var myReqGalleryRef = new Firebase("https://fiery-heat-6378.firebaseio.com/photos/" + $scope.galleryRequestTimestamp);
  var myReqGalleryArray = $firebaseArray(myReqGalleryRef);

  myReqGalleryArray.$loaded().then(function() {
    $scope.images = myReqGalleryArray;
  });

  $scope.getPhoto = function (userID) {
    var tempRef = new Firebase("https://fiery-heat-6378.firebaseio.com/users/" + userID);
    var photo;
    tempRef.on("value", function (snapshot) {
      photo = snapshot.val().profilePicture;
    });
    return photo;
  }

});

teleportApp.controller('SettingsCtrl', function($scope) {

  var fbAuth = ref.getAuth();
  var userRef = new Firebase("https://fiery-heat-6378.firebaseio.com/users/" + fbAuth.uid);
  userRef.on("value", function(snapshot) {
    $scope.userPhoto = snapshot.val().profilePicture;
  });

});


