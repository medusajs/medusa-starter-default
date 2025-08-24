import { ExecArgs } from "@medusajs/framework/types"
import { TECHNICIANS_MODULE } from "../modules/technicians"

export default async function testTechniciansApi({ container }: ExecArgs) {
  console.log("Testing Technicians API functionality...")
  
  try {
    const techniciansService = container.resolve(TECHNICIANS_MODULE)
    console.log("✅ Technicians service resolved successfully")

    // Test creating a technician
    const testTechnician = {
      first_name: "Test",
      last_name: "Technician",
      email: "test.technician@example.com",
      phone: "+1-555-9999",
      employee_id: "TEST001",
      department: "Testing",
      position: "Test Technician",
      status: "active" as const,
      notes: "This is a test technician for API testing"
    }

    console.log("Creating test technician...")
    const createdTechnician = await techniciansService.createTechnicians(testTechnician)
    console.log("✅ Technician created successfully:", createdTechnician.id)

    // Test retrieving the technician
    console.log("Retrieving technician...")
    const retrievedTechnician = await techniciansService.retrieveTechnician(createdTechnician.id)
    console.log("✅ Technician retrieved successfully:", retrievedTechnician.email)

    // Test updating the technician
    console.log("Updating technician...")
    const updatedTechnician = await techniciansService.updateTechnicians(createdTechnician.id, {
      notes: "Updated test technician notes"
    })
    console.log("✅ Technician updated successfully")

    // Test listing technicians
    console.log("Listing technicians...")
    const [technicians, count] = await techniciansService.listAndCountTechnicians()
    console.log(`✅ Found ${count} technicians in total`)

    // Test filtering technicians
    console.log("Testing filters...")
    const [activeTechnicians] = await techniciansService.listAndCountTechnicians({
      status: "active"
    })
    console.log(`✅ Found ${activeTechnicians.length} active technicians`)

    // Clean up - delete the test technician
    console.log("Cleaning up test technician...")
    await techniciansService.deleteTechnicians(createdTechnician.id)
    console.log("✅ Test technician deleted successfully")

    console.log("🎉 All tests passed! Technicians API is working correctly.")

  } catch (error) {
    console.error("❌ Test failed:", error)
    console.error("Error details:", error.message)
    throw error
  }
} 