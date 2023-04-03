const express = require("express")
const { GracefulShutdownServer, getConfigFile } = require("medusa-core-utils")

const loaders = require("@medusajs/medusa/dist/loaders").default

;(async function () {
  async function start() {
    const directory = process.cwd()

    const { configModule: { projectConfig } } = getConfigFile(
      directory,
      "medusa-config"
    )

    const port = projectConfig.port || 9000

    const app = express()

    try {
      await loaders({ directory, expressApp: app })

      const server = GracefulShutdownServer.create(
        app.listen(port, (err) => {
          if (err) {
            return
          }
          console.log(`Server is ready on port: ${port}`)
        })
      )

      // Handle graceful shutdown
      const gracefulShutDown = () => {
        server
          .shutdown()
          .then(() => {
            console.info("Gracefully stopping the server.")
            process.exit(0)
          })
          .catch((e) => {
            console.error("Error received when shutting down the server.", e)
            process.exit(1)
          })
      }

      process.on("SIGTERM", gracefulShutDown)
      process.on("SIGINT", gracefulShutDown)
    } catch (err) {
      console.error("Error starting server", err)
      process.exit(1)
    }
  }

  await start()
})()
