function isOnline() {
//  return true;

  var networkState = navigator.connection.type;

  if(networkState == Connection.NONE) {
    return false;
  } else {
    return true;
  }
}

var logging = {
  queue: [],
  init: function() {
    logging.queue = JSON.parse(localStorage.getItem('log-queue') || '[]');

    document.addEventListener('online', logging.online.bind(logging), false);
    document.addEventListener('offline', logging.offline.bind(logging), false);
  },
  add: function(log) {
    this.queue.push(log);

    try {
      localStorage.setItem('log-queue', JSON.stringify(this.queue));
    } catch (e) {
      // no logs were saved as quota exceeded.
      console.log("Quota for local storage exceeded");
    }

    logging.process();  // always upload logs
  },
  process: function() {
    if (logging.isProcessing) return;

    if (isOnline()) { //} && localStorage.getItem('shouldUploadLogs')) {
      var logs = logging.queue.slice(0,100),
        numlogs = logging.queue.length;

      if (numlogs>0) {
        logging.isProcessing = true;

        $.post("https://screenlife.info/log/upload", {"data":JSON.stringify(logs)}, function(d) {
          logging.queue = logging.queue.slice(numlogs);
          // console.log(logging.queue);
          try {
            localStorage.setItem('log-queue', JSON.stringify(logging.queue));
          } catch (e) {
            console.log("Quota exceeded when saving queue");
          }

          logging.isProcessing = false;
          logging.process();
        }).fail(function(xhr,e) {
          console.log("Logging upload failed", e);

          logging.isProcessing = false;
        });
      }
    } else {
      console.log("offline", logging.queue.length);
    }
  },
  isProcessing: false,
  online: function() {
    logging.process();  // start uploading when online
  },
  offline: function() {

  }
};

function $$log$$(type, data, file, linenumber, revision) {
  var log = {
    app: "com.sumgroup.teleport",
    type: type,
    data: data,
    timestamp: new Date().getTime(),
/*    device: {
      model:device.model,
      platform:device.platform,
      uuid:device.uuid,
      version:device.version,
    },*/
    file: file,
    linenumber: linenumber,
    revision: revision
  };

  if (window.device) {
    log.device = window.device;
  } else {
    log.browser = {
      userAgent: navigator.userAgent
    };
  }

  logging.add(log);
}
