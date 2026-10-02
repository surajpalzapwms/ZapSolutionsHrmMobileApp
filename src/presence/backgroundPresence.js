// src/presence/backgroundPresence.js
// Keeps sending presence heartbeats while the app is in the background, so
// joining / leaving the office Wi-Fi is noticed even when the app isn't open.
//
// MUST be imported once at app start (App.tsx) — TaskManager.defineTask has
// to run at module load, outside any React component.
//
// Limits (set by the phone's OS, not by us): Android runs this roughly every
// 15 minutes; iOS runs it when it decides to (often less). If the phone stops
// checking in, the backend marks a disconnect after its timeout and clears
// it again on the next check-in — so a late check-in never loses attendance.
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { sendPresenceHeartbeat } from "../services/presenceService";

export const PRESENCE_TASK = "hrm-presence-heartbeat";

TaskManager.defineTask(PRESENCE_TASK, async () => {
  try {
    await sendPresenceHeartbeat("heartbeat");
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

export async function unregisterPresenceTask() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(PRESENCE_TASK)) {
      await BackgroundTask.unregisterTaskAsync(PRESENCE_TASK);
    }
  } catch {
    // ignore
  }
}
