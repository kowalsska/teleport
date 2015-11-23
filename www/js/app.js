// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var teleportApp = angular.module('teleport', ['ionic', 'ngCordova', 'firebase', 'teleport.controllers', 'teleport.services']);

//var ref = new Firebase("https://fiery-heat-6378.firebaseio.com/");

teleportApp.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
});

teleportApp.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('login', {
      url: '/',
      templateUrl: 'templates/login.html',
      controller: 'LoginCtrl'
    })
    .state('map', {
      url: '/map',
      templateUrl: 'templates/map.html',
      controller: 'MapCtrl',
      cache: true
    })
    .state('left', {
      url: '/galleries',
      templateUrl: 'templates/tab-galleries.html',
      controller: 'RequestsCtrl'
    })
    .state('right', {
      url: '/requests',
      templateUrl: 'templates/tab-requests.html',
      controller: 'RequestsCtrl'
    })
    .state('gallery', {
      url: '/galleries/photos',
      templateUrl: 'templates/gallery.html',
      controller: 'RequestsCtrl',
      cache: true
    })
    .state('settings', {
      url: '/settings',
      templateUrl: 'templates/settings.html'
    });

  $urlRouterProvider.otherwise("/");

});



