// spawn lets Node run another program (like a terminal command)
import { spawn } from "node:child_process";

/**
 * Get video duration (in seconds) using ffprobe.
 * @param {string} filePath - Absolute/relative path to the video file on disk.
 * @returns {Promise<number|null>} duration in seconds, or null if not found
 */
export function getDurationSeconds(filePath) {
  // We return a Promise because ffprobe runs asynchronously (finishes later)
  return new Promise((resolve, reject) => {
    // Start the ffprobe program with arguments:
    // -v error                 => only show errors (no extra noise)
    // -show_entries format=duration => only output the duration field
    // -of json                 => output in JSON so we can parse it easily
    // filePath                 => the video file to analyze
    const p = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      filePath,
    ]);

    // We'll collect output from ffprobe here
    let out = "";
    // We'll collect error messages from ffprobe here
    let err = "";

    // stdout = normal output stream (the JSON result)
    // ffprobe may output in chunks, so we append each chunk to `out`
    p.stdout.on("data", (d) => {
      out += d;
    });

    // stderr = error output stream (warnings/errors)
    // append chunks to `err`
    p.stderr.on("data", (d) => {
      err += d;
    });

    // If ffprobe can't start at all (e.g. not installed), reject immediately
    p.on("error", (e) => {
      reject(e);
    });

    // "close" fires when ffprobe finishes running
    // code = exit code (0 means success, non-zero means failure)
    p.on("close", (code) => {
      // If ffprobe failed, reject with the error output (or a fallback message)
      if (code !== 0) {
        return reject(new Error(err || `ffprobe exited ${code}`));
      }

      // Parse the JSON text we collected from stdout
      const json = JSON.parse(out);

      // Safely read json.format.duration:
      // json?.format?.duration means:
      // - if json or format is missing, don't crash; just return undefined
      // Convert it to a Number
      const dur = Number(json?.format?.duration);

      // If duration is a valid finite number, resolve it; otherwise resolve null
      resolve(Number.isFinite(dur) ? dur : null);
    });
  });
}
