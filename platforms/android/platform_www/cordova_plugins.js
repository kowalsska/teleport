cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.darktalker.cordova.screenshot/www/Screenshot.js",
        "id": "com.darktalker.cordova.screenshot.screenshot",
        "pluginId": "com.darktalker.cordova.screenshot",
        "merges": [
            "navigator.screenshot"
        ]
    },
    {
        "file": "plugins/cordova-plugin-camera/www/CameraConstants.js",
        "id": "cordova-plugin-camera.Camera",
        "pluginId": "cordova-plugin-camera",
        "clobbers": [
            "Camera"
        ]
    },
    {
        "file": "plugins/cordova-plugin-camera/www/CameraPopoverOptions.js",
        "id": "cordova-plugin-camera.CameraPopoverOptions",
        "pluginId": "cordova-plugin-camera",
        "clobbers": [
            "CameraPopoverOptions"
        ]
    },
    {
        "file": "plugins/cordova-plugin-camera/www/Camera.js",
        "id": "cordova-plugin-camera.camera",
        "pluginId": "cordova-plugin-camera",
        "clobbers": [
            "navigator.camera"
        ]
    },
    {
        "file": "plugins/cordova-plugin-camera/www/CameraPopoverHandle.js",
        "id": "cordova-plugin-camera.CameraPopoverHandle",
        "pluginId": "cordova-plugin-camera",
        "clobbers": [
            "CameraPopoverHandle"
        ]
    },
    {
        "file": "plugins/cordova-plugin-console/www/logger.js",
        "id": "cordova-plugin-console.logger",
        "pluginId": "cordova-plugin-console",
        "clobbers": [
            "cordova.logger"
        ]
    },
    {
        "file": "plugins/cordova-plugin-console/www/console-via-logger.js",
        "id": "cordova-plugin-console.console",
        "pluginId": "cordova-plugin-console",
        "clobbers": [
            "console"
        ]
    },
    {
        "file": "plugins/cordova-plugin-device/www/device.js",
        "id": "cordova-plugin-device.device",
        "pluginId": "cordova-plugin-device",
        "clobbers": [
            "device"
        ]
    },
    {
        "file": "plugins/cordova-plugin-splashscreen/www/splashscreen.js",
        "id": "cordova-plugin-splashscreen.SplashScreen",
        "pluginId": "cordova-plugin-splashscreen",
        "clobbers": [
            "navigator.splashscreen"
        ]
    },
    {
        "file": "plugins/cordova-plugin-statusbar/www/statusbar.js",
        "id": "cordova-plugin-statusbar.statusbar",
        "pluginId": "cordova-plugin-statusbar",
        "clobbers": [
            "window.StatusBar"
        ]
    },
    {
        "file": "plugins/cordova-plugin-whitelist/whitelist.js",
        "id": "cordova-plugin-whitelist.whitelist",
        "pluginId": "cordova-plugin-whitelist",
        "runs": true
    },
    {
        "file": "plugins/ionic-plugin-keyboard/www/android/keyboard.js",
        "id": "ionic-plugin-keyboard.keyboard",
        "pluginId": "ionic-plugin-keyboard",
        "clobbers": [
            "cordova.plugins.Keyboard"
        ],
        "runs": true
    },
    {
        "file": "plugins/se.frostyelk.cordova.parse.plugin/www/ParsePlugin.js",
        "id": "se.frostyelk.cordova.parse.plugin.ParsePlugin",
        "pluginId": "se.frostyelk.cordova.parse.plugin",
        "clobbers": [
            "ParsePlugin"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.darktalker.cordova.screenshot": "0.1.3",
    "cordova-plugin-camera": "1.2.0",
    "cordova-plugin-console": "1.0.1",
    "cordova-plugin-crosswalk-webview": "1.4.0",
    "cordova-plugin-device": "1.0.1",
    "cordova-plugin-geolocation": "1.0.1",
    "cordova-plugin-googleplayservices": "19.0.3",
    "cordova-plugin-splashscreen": "2.1.0",
    "cordova-plugin-statusbar": "1.0.1",
    "cordova-plugin-whitelist": "1.0.0",
    "ionic-plugin-keyboard": "1.0.7",
    "se.frostyelk.cordova.parse.plugin": "0.2.0"
}
// BOTTOM OF METADATA
});