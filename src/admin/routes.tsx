import { defineRoutes } from "@medusajs/admin-sdk"
import MachinesPage from "./pages/machines"

export const routes = defineRoutes({
  "/machines": {
    element: <MachinesPage />,
  },
})

export default routes 