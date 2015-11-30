/*
 *  This code is adapted from the work of Michael Nachbaur
 *  by Simon Madine of The Angry Robot Zombie Factory
 *   - Converted to Cordova 1.6.1 by Josemando Sobral.
 *   - Converted to Cordova 2.0.0 by Simon MacDonald
 *  2012-07-03
 *  MIT licensed
 */
var formats = ['png','jpg'];

function Screenshot() {
}

Screenshot.prototype.save = function (callback,format,quality, filename) {
  format = (format || 'png').toLowerCase();
  filename = filename || 'screenshot_'+Math.round((+(new Date()) + Math.random()));
  if(formats.indexOf(format) === -1){
    return callback && callback(new Error('invalid format '+format));
  }
  quality = typeof(quality) !== 'number'?100:quality;
  cordova.exec(function(res){
    callback && callback(null,res);
  }, function(error){
    callback && callback(error);
  }, "Screenshot", "saveScreenshot", [format, quality, filename]);
};

Screenshot.install = function () {
  if (!window.plugins) {
    window.plugins = {};
  }

  window.plugins.screenshot = new Screenshot();
  return window.plugins.screenshot;
};

cordova.addConstructor(Screenshot.install);
