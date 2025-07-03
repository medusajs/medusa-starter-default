import { defineNavigationConfig } from "@medusajs/admin-sdk"

export const navigation = defineNavigationConfig({
  main: [
    {
      name: "Machines",
      path: "/machines",
      icon: "Cog",
    },
  ],
})

export default navigation 