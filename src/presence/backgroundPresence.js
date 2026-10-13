// src/presence/backgroundPresence.js
// Background safety net: about every 15 minutes the phone OS lets us run a
// quick check, so attendance (in AND going time) is still marked if the
// geofence / location events were missed.
// (The instant "entered the office" trigger is the geofence in geofenceTask.js.)
//
// MUST be imported once at app start (App.tsx) - TaskManager.defineTask has
// to run at module load, outside any React component.
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { signInIfInOffice } from "./autoAttendance";
// Also registers the geofence + background-location tasks.
import { startBackgroundLocation, startOfficeGeofence, stopOfficeGeofence } from "./geofenceTask";
import { clearOfficeLog } from "./officeSession";

export const PRESENCE_TASK = "hrm-presence-heartbeat";

TaskManager.defineTask(PRESENCE_TASK, async () => {
  try {
    // freshGps:false -> use the last known position, never wait for a new fix
    await signInIfInOffice({ source: "background", freshGps: false });
    // The office circle may have just been learned from the Wi-Fi: make
    // sure the geofence / location watch are running.
    await startOfficeGeofence();
    await startBackgroundLocation();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerPresenceTask() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    if (await TaskManager.isTaskRegisteredAsync(PRESENCE_TASK)) return true;
    await BackgroundTask.registerTaskAsync(PRESENCE_TASK, { minimumInterval: 15 });
    return true;
  } catch {
    return false;
  }
}

// Called on logout (AuthContext): stop everything so a logged-out phone
// never tries to sign anyone in.
export async function unregisterPresenceTask() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(PRESENCE_TASK)) {
      await BackgroundTask.unregisterTaskAsync(PRESENCE_TASK);
    }
  } catch {
    // ignore
  }
  await stopOfficeGeofence();
  await clearOfficeLog();
}
