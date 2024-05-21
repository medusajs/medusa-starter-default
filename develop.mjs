import { execa } from "execa";
import chokidar from "chokidar";
import { resolve } from "path";

const cliPath = resolve("node_modules", ".bin", "medusa");

const devServer = {
  childProcess: null,
  watcher: null,
  start() {
    this.childProcess = execa({
      cwd: process.cwd(),
      env: { ...process.env },
      stdout: "inherit",
      stderr: "inherit",
    })`node -r ts-node/register ${cliPath} start`;
  },
  restart() {
    if (this.childProcess) {
      this.childProcess.removeAllListeners();
      this.childProcess.kill();
    }
    this.start();
  },
  watch() {
    this.watcher = chokidar.watch(['.'], {
      ignoreInitial: true,
      cwd: process.cwd(),
      ignored: [/(^|[\/\\])\../, "node_modules", "dist", "src/admin/**/*"],
    });
    this.watcher.on("change", (file) => {
      console.log("file changed", file);
      this.restart();
    });
    this.watcher.on("ready", function () {
      console.log("ready to watch files");
    });
  },
};

devServer.start();
devServer.watch();
