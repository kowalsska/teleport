package se.frostyelk.cordova.parse.plugin;

import android.app.PendingIntent;
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
import android.media.RingtoneManager;
import android.net.Uri;
import android.content.SharedPreferences;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.location.LocationServices;
import com.ionicframework.teleport2514364.MainActivity;

public class MyLocationService extends Service implements GoogleApiClient.ConnectionCallbacks, GoogleApiClient.OnConnectionFailedListener {

	private static final String LOGTAG = "ParsePluginReciever";

	public static final String EXTRA_REQUESTER_ID = "requesterID";

  	private LocationManager locationManager;
  	private Location location;
	private GoogleApiClient mGoogleApiClient;
	private Location mLocation;
	private Double requestLatitude;
	private Double requestLongitude;
	private String message;


	@Override
	public IBinder onBind(Intent arg0) {
		return null;
	}

	@Override
	public void onCreate() {
		mGoogleApiClient = new GoogleApiClient.Builder(this)
				.addConnectionCallbacks(this)
				.addOnConnectionFailedListener(this)
				.addApi(LocationServices.API)
				.build();
	}

	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {

		Log.i(LOGTAG, "MyLocationService has started");

		if(intent!=null) {

            String requesterID = intent.getStringExtra(EXTRA_REQUESTER_ID);

            if(forMe(requesterID)) {

				requestLatitude = Double.parseDouble(intent.getStringExtra("latitude"));
				requestLongitude = Double.parseDouble(intent.getStringExtra("longitude"));
				message = intent.getStringExtra("message");

				if(mGoogleApiClient.isConnected()) {
					generateNotification();
				} else {
					mGoogleApiClient.connect();
				}

            } else {
                Log.i(LOGTAG, "I created the request. No notification");
                stopSelf();
            }

        } else {
			Log.i(LOGTAG, "Intent is null?");
			stopSelf();
        }

		return START_NOT_STICKY;
	}

	private boolean nearMe(double distance) {
		return distance <= 200;
	}

	private boolean forMe(String requesterID) {
		String myUserID = getMyUserID();
		return !myUserID.equals(requesterID);
	}

	private boolean isLoggedIn() {
		String myUserID = getMyUserID();
		return !myUserID.equals("");
	}

	private String getMyUserID() {
		SharedPreferences sharedPref = getSharedPreferences(ParsePlugin.SHARED_PREFERENCES, Context.MODE_PRIVATE);
        String myUserID = sharedPref.getString(ParsePlugin.PREFERENCE_FIREBASE_USER_ID, "");
        return myUserID;
	}

	@Override
	public void onDestroy() {
		super.onDestroy();
	}

	private double getDistanceBetweenTwoLocations(Location phoneLocation, double requestLatitude, double requestLongitude) {
		float[] results = new float[1];
		Log.i(LOGTAG, "Request Lat: " + requestLatitude);
		Log.i(LOGTAG, "Request Lng: " + requestLongitude);

		Location.distanceBetween(phoneLocation.getLatitude(), phoneLocation.getLongitude(), requestLatitude, requestLongitude, results);
		Log.i(LOGTAG, "Distance: " + results[0]);
		return results[0];
	}

	private void generateNotification() {

		mLocation = LocationServices.FusedLocationApi.getLastLocation(mGoogleApiClient);

		if (mLocation != null) {
			Log.i(LOGTAG, "Accuracy: " + mLocation.getAccuracy());
			Log.i(LOGTAG, "Lat: " + mLocation.getLatitude());
			Log.i(LOGTAG, "Lng: " + mLocation.getLongitude());

			double distance = getDistanceBetweenTwoLocations(mLocation, requestLatitude, requestLongitude);

			if (nearMe(distance) && isLoggedIn()) {
				//Show the notification
				int drawableResourceId = this.getResources().getIdentifier("icon", "drawable", this.getPackageName());
				Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

				Intent notificationIntent = new Intent(this, MainActivity.class);
				PendingIntent ionicIntent = PendingIntent.getActivity(this, 0, notificationIntent, 0);

				NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(this)
						.setSmallIcon(drawableResourceId)
						.setContentTitle("Teleport")
						.setContentText(message)
						.setVibrate(new long[]{0, 500, -1})
						.setContentIntent(ionicIntent)
						.setAutoCancel(true)
						.setSound(alarmSound);

				// Gets an instance of the NotificationManager service
				NotificationManager mNotifyMgr = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
				int notifID = (int)(Math.random() * 1000);
				Log.i(LOGTAG, "Displaying notification");
				mNotifyMgr.notify(notifID, mBuilder.build());
				stopSelf();
			}
		}
	}

	@Override
	public void onConnected(Bundle bundle) {
		generateNotification();
	}

	@Override
	public void onConnectionSuspended(int i) {
		Log.i(LOGTAG, "Connection Suspended");
		mGoogleApiClient.connect();
	}

	@Override
	public void onConnectionFailed(ConnectionResult connectionResult) {
		Log.i(LOGTAG, "Connection failed. Error: " + connectionResult.getErrorCode());
	}
}
