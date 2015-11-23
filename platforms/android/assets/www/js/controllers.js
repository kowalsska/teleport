/**
 * Created by magdakowalska on 02/11/2015.
 */

var teleportApp = angular.module('teleport.controllers', []);

var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

teleportApp.controller('MapCtrl', function($scope, $state, $cordovaGeolocation, $firebaseArray, $ionicPopup) {

  var options = {timeout: 10000, enableHighAccuracy: true};

  $scope.sendRequest = function() {
    var fbAuth = ref.getAuth();
    $scope.requests = [];
    var requestsRef = ref.child("requests");
    var requestsArray = $firebaseArray(requestsRef);
    $scope.requests = requestsArray;
    requestsArray.$add({latitude: $scope.centerMap.lat(),
                        longitude: $scope.centerMap.lng(),
                        timestamp: Date.now(),
                        requester: fbAuth.uid});
    $ionicPopup.alert({
      title: 'teleport',
      template: 'Your request has been sent!'
    })
  };

  $cordovaGeolocation.getCurrentPosition(options).then(function(position){

    var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    var mapOptions = {
      center: latLng,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    };

    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

    $scope.centerMap = $scope.map.getCenter();

    // Construct a draggable red triangle with geodesic set to true.
    var circle = new google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.35,
      strokeWeight: 1,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: $scope.map,
      center: $scope.centerMap,
      radius: 200,
      draggable: true,
      geodesic: true
    });

    $scope.map.addListener('idle',function(){
      if($scope.centerMap !== this.getCenter()) {
        $scope.centerMap = this.getCenter();
        circle.setCenter($scope.centerMap);
      }
    });

    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    $scope.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    $scope.map.addListener('bounds_changed', function() {
      searchBox.setBounds($scope.map.getBounds());
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
      $scope.map.fitBounds(bounds);
    });

  }, function(error){
    console.log("Could not get location");
  });

});

teleportApp.controller('LoginCtrl', function ($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope) {
  console.log('Login Controller Initialized');

  var auth = $firebaseAuth(ref);

  $ionicModal.fromTemplateUrl('templates/signup.html', {
    scope: $scope
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.createUser = function (user) {
    console.log("Create User Function called");
    if (user && user.email && user.password && user.displayname) {
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
          displayName: user.displayname
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
        console.log("Logged in as:" + authData.uid);
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

teleportApp.controller('RequestsCtrl', function($scope, $cordovaCamera, $firebaseArray) {

    $scope.requests = [
      {avatarurl:"img/magda.jpg", header: "magda123 from Wroclaw, Poland"},
      {avatarurl:"img/magda.jpg", header: "magda123 from Wroclaw, Poland"}
    ];

    $scope.decline = function() {
      console.log($scope.images);
    };

    var fbAuth = ref.getAuth();
    $scope.images = [];
    var photosRef = ref.child("photos/" + fbAuth.uid);
    var syncArray = $firebaseArray(photosRef.child("gallery"));
    $scope.images = syncArray;

    $scope.takePhoto = function () {

      var options = {
        quality: 100,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA,
        allowEdit: false,
        encodingType: Camera.EncodingType.JPEG,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: false
      };

      $cordovaCamera.getPicture(options).then(function (imageData) {
        $scope.imgURI = "data:image/jpeg;base64," + imageData;
        syncArray.$add({image: imageData});
        }, function (err) {
          //err
      });
    }


});


