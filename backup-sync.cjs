const { exec } = require("child_process");
const path = require("path");

// Paths
const dumpPath = "C:\\backup";
const toolsPath = "C:\\Program Files\\MongoDB\\Tools\\100\\bin";

// Commands
const mongodumpCmd = `"${toolsPath}\\mongodump.exe" --uri "mongodb://localhost:27017/jimburry" --out "${dumpPath}" --forceTableScan`;
const mongorestoreCmd = `"${toolsPath}\\mongorestore.exe" --uri "mongodb+srv://jymberee:SRConsultants%40123@jymberee.wil9hva.mongodb.net/jimburry" --drop "${dumpPath}\\jimburry"`;

// Helper to run shell commands
function run(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) {
        console.error("ERROR:", err.message);
        return reject(err);
      }
      console.log("OUTPUT:", stdout || stderr);
      resolve();
    });
  });
}

(async () => {
  console.log("=== Starting MongoDB Backup Sync ===");

  try {
    console.log("Dumping local MongoDB...");
    await run(mongodumpCmd);

    console.log("Restoring to Atlas...");
    await run(mongorestoreCmd);

    console.log("=== Backup sync completed successfully ===");
  } catch (err) {
    console.error("Backup sync failed:", err);
  }
})();
