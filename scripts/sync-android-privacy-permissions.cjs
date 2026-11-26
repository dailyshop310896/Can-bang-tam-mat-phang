/* Remove unused ACTIVITY_RECOGNITION from an already-generated native project.
   Expo android.blockedPermissions works at prebuild time; this synchronizes an
   existing Termux android/ tree when a developer builds with Gradle directly. */
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "android", "app", "src", "main", "AndroidManifest.xml");
if (!fs.existsSync(file)) {
  console.error("Missing AndroidManifest.xml. Run Expo prebuild first.");
  process.exit(1);
}

const original = fs.readFileSync(file, "utf8");
const openingManifest = /<manifest\b[^>]*>/;
if (!openingManifest.test(original)) {
  console.error("Invalid AndroidManifest.xml: missing <manifest> root.");
  process.exit(1);
}

let updated = original.replace(openingManifest, (tag) =>
  /\bxmlns:tools\s*=/.test(tag)
    ? tag
    : tag.slice(0, -1) + ' xmlns:tools="http://schemas.android.com/tools">'
);

// Ensure the highest-priority app manifest removes permissions merged in by SDKs.
const permissionTag = /<uses-permission(?:-sdk-23)?\b[^>]*\bandroid:name\s*=\s*["']android\.permission\.ACTIVITY_RECOGNITION["'][^>]*\/>/g;
const removal = '    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" tools:node="remove" />';
if (updated.includes(removal)) {
  if (updated !== original) fs.writeFileSync(file, updated, "utf8");
  console.log("Android manifest: ACTIVITY_RECOGNITION already blocked.");
  process.exit(0);
}
updated = updated.replace(permissionTag, "");
updated = updated.replace(openingManifest, (tag) => tag + "\n" + removal);

if (updated !== original) {
  fs.writeFileSync(file, updated, "utf8");
}
console.log("Android manifest: ACTIVITY_RECOGNITION blocked (Accelerometer kept).");
