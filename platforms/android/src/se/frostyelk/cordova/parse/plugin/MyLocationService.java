package se.frostyelk.cordova.parse.plugin;

import android.content.Context;
import android.content.Intent;
import android.app.Service;
import android.os.IBinder;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.location.LocationManager;
import android.location.LocationListener;
import android.location.Location;
import android.location.Criteria;
import android.app.NotificationManager;
import android.app.Notification;
import android.util.Log;
import android.support.v4.app.NotificationCompat;
import android.support.v4.app.NotificationCompat.Builder;

public class MyLocationService extends Service {

	private static final String LOGTAG = "ParsePluginReciever";
  	private LocationManager locationManager;
  	private NotificationManager notificationManager;
  	private Notification notification;

	@Override
	public IBinder onBind(Intent arg0) {
		return null;
	}

	@Override
	public void onStart(Intent intent, int startId) {
		Log.i(LOGTAG, "MyLocationService has started");
		super.onStart(intent, startId);
		// Get the location manager
		Log.i(LOGTAG, "Getting location");
	    locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
	    // Define the criteria how to select the location provider
	    Criteria criteria = new Criteria();
	    String provider = locationManager.getBestProvider(criteria, false);
	    Location location = locationManager.getLastKnownLocation(provider);
	    double requestLatitude = Double.parseDouble(intent.getStringExtra("latitude"));
	    double requestLongitude = Double.parseDouble(intent.getStringExtra("longitude"));
	    String message = intent.getStringExtra("message");
	    double distance = getDistanceBetweenTwoLocations(location, requestLatitude, requestLongitude);

		NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(this)
		    .setContentTitle("Teleport")
		    .setContentText(message);

		// Sets an ID for the notification
		int mNotificationId = 001;

		// Gets an instance of the NotificationManager service
		NotificationManager mNotifyMgr = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
		
		// Builds the notification and issues it.
		Log.i(LOGTAG, "Displaying notification");
		mNotifyMgr.notify(mNotificationId, mBuilder.build());

        if (distance < 200) { //&&!ParsePlugin.isAppForeground() ??
        	//Show the notification
        } else {
            //Stop service
			//stopService();
        }

	}

	@Override
	public void onDestroy() {
		super.onDestroy();
	}

	public double getRad(double x) {
		return x * Math.PI / 180;
		}

	private double getDistanceBetweenTwoLocations(Location phoneLocation, double requestLatitude, double requestLongitude) {
		double phoneLat = phoneLocation.getLatitude();
		double phoneLong = phoneLocation.getLongitude();
		double rVal = 6378137; // Earth’s mean radius in meter
		double dLat = getRad(phoneLat - requestLatitude);
		double dLong = getRad(phoneLong - requestLongitude);
		double aVal = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(getRad(phoneLat)) * Math.cos(getRad(requestLatitude)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
		double cVal = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
		double dVal = rVal * cVal;
		Log.i(LOGTAG, "Distance: " + dVal);
		return dVal; //Returns distance in meter
	}

}
