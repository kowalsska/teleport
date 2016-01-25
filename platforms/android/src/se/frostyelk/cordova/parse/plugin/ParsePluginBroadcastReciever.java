/**
 * Copyright (C) 2015 Frosty Elk AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package se.frostyelk.cordova.parse.plugin;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.parse.ParseAnalytics;
import com.parse.ParsePushBroadcastReceiver;

public class ParsePluginBroadcastReciever extends ParsePushBroadcastReceiver {

    private static final String LOGTAG = "ParsePluginReciever";

    @Override
    protected void onPushReceive(Context context, Intent intent) {

        Log.i(LOGTAG, "onPushReceive Intent: " + intent.getAction());

        Bundle pushData = intent.getExtras();
        String jsonData = pushData.getString("com.parse.Data");
        JSONObject jsonObject;

        try {
            jsonObject = new JSONObject(jsonData);
            String requesterID = jsonObject.getString("requesterID");
            String reqLatitude = jsonObject.getString("reqLatitude");
            String reqLongitude = jsonObject.getString("reqLongitude");
            String message = jsonObject.getString("alert");

            Log.i(LOGTAG, "starting Location Service");
            Intent serviceIntent = new Intent(context,MyLocationService.class);
            serviceIntent.putExtra("message", message);
            serviceIntent.putExtra("requesterID", requesterID);
            serviceIntent.putExtra("latitude", reqLatitude);
            serviceIntent.putExtra("longitude", reqLongitude);
            context.startService(serviceIntent);
        } catch (JSONException e) {
            e.printStackTrace();
        }

        // if (ParsePlugin.isAppForeground()) {
        //     Log.i(LOGTAG, "App is in foreground");
        //     pushData.putBoolean("foreground", true);
        //     ParsePlugin.receivePushData(pushData);
        // } else {
        //     // Let Parse show the notification
        //     Log.i(LOGTAG, "App is NOT in foreground");
        //     super.onPushReceive(context, intent);
        // }
    }

    @Override
    protected void onPushOpen(Context context, Intent intent) {
        Log.i(LOGTAG, "onPushOpen Intent: " + intent.getAction());

        Bundle pushData = intent.getExtras();

        if (ParsePlugin.isActive()) {
            Log.i(LOGTAG, "App is Active");
            Log.i(LOGTAG, "Resuming current activity");

            // Resume current Activity
            pushData.putBoolean("coldstart", false);
            PackageManager pm = context.getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(context.getPackageName());
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
        } else {
            Log.i(LOGTAG, "App is not Active");
            Log.i(LOGTAG, "Starting Main activity");

            // Start main application
            pushData.putBoolean("coldstart", true);
            PackageManager pm = context.getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(context.getPackageName());
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
        }

        if (ParsePlugin.isAppForeground()) {
            pushData.putBoolean("foreground", true);
        } else {
            pushData.putBoolean("foreground", false);
        }

        ParsePlugin.receivePushData(pushData);

        ParseAnalytics.trackAppOpenedInBackground(intent);

    }
}
