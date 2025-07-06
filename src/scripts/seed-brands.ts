import { ExecArgs } from "@medusajs/framework/types"
import { BRANDS_MODULE } from "../modules/brands"

export default async function seedBrands({ container }: ExecArgs) {
  const brandsService = container.resolve(BRANDS_MODULE)
  
  const sampleBrands = [
    {
      name: "Caterpillar Inc.",
      code: "CAT",
      description: "Leading manufacturer of construction and mining equipment",
      country_of_origin: "United States",
      website_url: "https://www.caterpillar.com",
      contact_email: "parts@cat.com",
      warranty_terms: "24 months standard warranty on all OEM parts",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 1,
    },
    {
      name: "Komatsu Ltd.",
      code: "KOM",
      description: "Japanese multinational corporation manufacturing construction equipment",
      country_of_origin: "Japan",
      website_url: "https://www.komatsu.com",
      contact_email: "parts@komatsu.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 2,
    },
    {
      name: "Volvo Construction Equipment",
      code: "VOL",
      description: "Swedish manufacturer of construction equipment",
      country_of_origin: "Sweden",
      website_url: "https://www.volvoce.com",
      contact_email: "parts@volvo.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 3,
    },
    {
      name: "JCB",
      code: "JCB",
      description: "British multinational corporation manufacturing equipment for construction",
      country_of_origin: "United Kingdom",
      website_url: "https://www.jcb.com",
      contact_email: "parts@jcb.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 4,
    },
    {
      name: "Aftermarket Solutions",
      code: "AM",
      description: "High-quality aftermarket parts for construction equipment",
      country_of_origin: "United States",
      website_url: "https://www.aftermarket-solutions.com",
      contact_email: "sales@aftermarket-solutions.com",
      warranty_terms: "12 months warranty on aftermarket parts",
      authorized_dealer: false,
      is_oem: false,
      is_active: true,
      display_order: 10,
    },
    {
      name: "Generic Parts Co.",
      code: "GEN",
      description: "Budget-friendly generic replacement parts",
      country_of_origin: "Various",
      website_url: "https://www.genericparts.com",
      contact_email: "info@genericparts.com",
      warranty_terms: "6 months limited warranty",
      authorized_dealer: false,
      is_oem: false,
      is_active: true,
      display_order: 20,
    }
  ]
  
  console.log("Seeding brands...")
  
  for (const brandData of sampleBrands) {
    try {
      // Check if brand already exists
      const existingBrand = await brandsService.retrieveBrandByCode(brandData.code)
      
      if (existingBrand) {
        console.log(`Brand ${brandData.code} already exists, skipping...`)
        continue
      }
      
      const brand = await brandsService.createBrand(brandData)
      console.log(`Created brand: ${brand.name} (${brand.code})`)
    } catch (error) {
      console.error(`Error creating brand ${brandData.code}:`, error.message)
    }
  }
  
  console.log("Finished seeding brands.")
} 