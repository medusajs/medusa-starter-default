import { defineRouteConfig } from "@medusajs/admin-sdk"

const TestPage = () => {
  return <div>TEST PAGE WORKS</div>
}

export const config = defineRouteConfig({
  label: "Test",
})

export default TestPage 