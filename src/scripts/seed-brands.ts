import { ExecArgs } from "@medusajs/framework/types"
import { BRANDS_MODULE } from "../modules/brands"

export default async function seedBrands({ container }: ExecArgs) {
  const brandsService = container.resolve(BRANDS_MODULE)
  
  const sampleBrands = [
    // Construction Equipment Brands
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
      name: "Liebherr",
      code: "LIE",
      description: "German-Swiss multinational equipment manufacturer",
      country_of_origin: "Germany",
      website_url: "https://www.liebherr.com",
      contact_email: "parts@liebherr.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 5,
    },
    
    // Agricultural Equipment Brands
    {
      name: "John Deere",
      code: "JD",
      description: "American corporation manufacturing agricultural machinery",
      country_of_origin: "United States",
      website_url: "https://www.deere.com",
      contact_email: "parts@johndeere.com",
      warranty_terms: "24 months standard warranty on agricultural equipment",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 10,
    },
    {
      name: "Case IH",
      code: "CIH",
      description: "Agricultural equipment brand of CNH Industrial",
      country_of_origin: "United States",
      website_url: "https://www.caseih.com",
      contact_email: "parts@caseih.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 11,
    },
    {
      name: "New Holland Agriculture",
      code: "NH",
      description: "Agricultural machinery brand of CNH Industrial",
      country_of_origin: "Italy",
      website_url: "https://www.newholland.com",
      contact_email: "parts@newholland.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 12,
    },
    {
      name: "Massey Ferguson",
      code: "MF",
      description: "Agricultural machinery manufacturer owned by AGCO",
      country_of_origin: "Canada",
      website_url: "https://www.masseyferguson.com",
      contact_email: "parts@masseyferguson.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 13,
    },
    {
      name: "Fendt",
      code: "FEN",
      description: "German agricultural machinery manufacturer owned by AGCO",
      country_of_origin: "Germany",
      website_url: "https://www.fendt.com",
      contact_email: "parts@fendt.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 14,
    },
    {
      name: "Kubota",
      code: "KUB",
      description: "Japanese manufacturer of tractors and agricultural machinery",
      country_of_origin: "Japan",
      website_url: "https://www.kubota.com",
      contact_email: "parts@kubota.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 15,
    },
    {
      name: "Claas",
      code: "CLA",
      description: "German agricultural machinery manufacturer",
      country_of_origin: "Germany",
      website_url: "https://www.claas.com",
      contact_email: "parts@claas.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 16,
    },
    {
      name: "Valtra",
      code: "VAL",
      description: "Finnish tractor manufacturer owned by AGCO",
      country_of_origin: "Finland",
      website_url: "https://www.valtra.com",
      contact_email: "parts@valtra.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 17,
    },
    {
      name: "Deutz-Fahr",
      code: "DF",
      description: "German agricultural machinery manufacturer",
      country_of_origin: "Germany",
      website_url: "https://www.deutz-fahr.com",
      contact_email: "parts@deutz-fahr.com",
      warranty_terms: "24 months standard warranty",
      authorized_dealer: true,
      is_oem: true,
      is_active: true,
      display_order: 18,
    },
    
    // Aftermarket Brands
    {
      name: "Aftermarket Solutions",
      code: "AM",
      description: "High-quality aftermarket parts for construction and agricultural equipment",
      country_of_origin: "United States",
      website_url: "https://www.aftermarket-solutions.com",
      contact_email: "sales@aftermarket-solutions.com",
      warranty_terms: "12 months warranty on aftermarket parts",
      authorized_dealer: false,
      is_oem: false,
      is_active: true,
      display_order: 50,
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
      display_order: 60,
    },
    {
      name: "Quality Replacement Parts",
      code: "QRP",
      description: "Premium aftermarket replacement parts",
      country_of_origin: "United States",
      website_url: "https://www.qualityparts.com",
      contact_email: "support@qualityparts.com",
      warranty_terms: "18 months warranty on premium aftermarket parts",
      authorized_dealer: false,
      is_oem: false,
      is_active: true,
      display_order: 51,
    }
  ]
  
  console.log("Seeding brands...")
  
  for (const brandData of sampleBrands) {
    try {
      // Try to create the brand directly
      const brand = await brandsService.createBrand(brandData)
      console.log(`Created brand: ${brand.name} (${brand.code})`)
    } catch (error) {
      if (error.message && error.message.includes('unique')) {
        console.log(`Brand ${brandData.code} already exists, skipping...`)
      } else {
        console.error(`Error creating brand ${brandData.code}:`, error.message)
      }
    }
  }
  
  console.log("Finished seeding brands.")
} 