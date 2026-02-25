const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo config plugin that adds Health Connect permission rationale activity
 * and the VIEW_PERMISSION_USAGE activity alias required for Android 14+.
 */
const withHealthConnectExtras = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    // Add PermissionsRationaleActivity (required by Health Connect)
    const hasRationale = (application.activity ?? []).some(
      (a) => a.$?.["android:name"] === ".PermissionsRationaleActivity"
    );

    if (!hasRationale) {
      application.activity = application.activity ?? [];
      application.activity.push({
        $: {
          "android:name": ".PermissionsRationaleActivity",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
                },
              },
            ],
          },
        ],
      });
    }

    // Add ViewPermissionUsageActivity alias (required for Android 14+)
    const aliases = application["activity-alias"] ?? [];
    const hasAlias = aliases.some(
      (a) => a.$?.["android:name"] === "ViewPermissionUsageActivity"
    );

    if (!hasAlias) {
      application["activity-alias"] = application["activity-alias"] ?? [];
      application["activity-alias"].push({
        $: {
          "android:name": "ViewPermissionUsageActivity",
          "android:exported": "true",
          "android:targetActivity": ".MainActivity",
          "android:permission":
            "android.permission.START_VIEW_PERMISSION_USAGE",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.intent.action.VIEW_PERMISSION_USAGE",
                },
              },
            ],
            category: [
              {
                $: {
                  "android:name":
                    "android.intent.category.HEALTH_PERMISSIONS",
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withHealthConnectExtras;
