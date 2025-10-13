import type { ExecArgs } from "@medusajs/types"
import { createApiKeysWorkflow } from "@medusajs/core-flows"
import { ApiKeyType } from "@medusajs/utils"

type ScriptArgs = ExecArgs & {
  args?: string[]
}

type ParsedOptions = {
  title: string
  environment: string
  scopes: string[]
  createdBy?: string
}

const DEFAULT_TITLE = "Storefront"
const DEFAULT_ENVIRONMENT = "production"
const DEFAULT_SCOPES = ["order", "approval", "company", "quote"]

const parseCliArgs = (raw: string[] = []): ParsedOptions => {
  const parsed: Record<string, string> = {}

  for (let index = 0; index < raw.length; index++) {
    const entry = raw[index]

    if (!entry?.startsWith("--")) {
      continue
    }

    const withValue = entry.split("=")

    if (withValue.length > 1) {
      const [key, ...valueParts] = withValue
      parsed[key.slice(2)] = valueParts.join("=")
      continue
    }

    const key = entry.slice(2)
    const next = raw[index + 1]

    if (next && !next.startsWith("--")) {
      parsed[key] = next
      index += 1
      continue
    }

    parsed[key] = "true"
  }

  const scopesValue =
    parsed.scopes?.split(",").map((scope) => scope.trim()).filter(Boolean) ??
    DEFAULT_SCOPES

  return {
    title: parsed.title ?? DEFAULT_TITLE,
    environment: parsed.environment ?? DEFAULT_ENVIRONMENT,
    scopes: scopesValue.length ? scopesValue : DEFAULT_SCOPES,
    createdBy: parsed["created-by"] ?? parsed.createdBy,
  }
}

export default async function createPublishableKey({
  container,
  args = [],
}: ScriptArgs) {
  const options = parseCliArgs(args)
  const createdBy =
    options.createdBy ?? `cli:${options.environment}:${options.scopes.join("+")}`

  const { result } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: options.title,
          type: ApiKeyType.PUBLISHABLE,
          created_by: createdBy,
        },
      ],
    },
  })

  const [apiKey] = result

  if (!apiKey) {
    console.log("No API key was created.")
    return
  }

  console.log("Publishable API key created:")
  console.log(`  id: ${apiKey.id}`)
  console.log(`  title: ${options.title}`)
  console.log(`  created_by: ${createdBy}`)
  console.log(`  suggested scopes: ${options.scopes.join(", ")}`)
  console.log("")
  console.log(
    `Use this token for NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${apiKey.token}`
  )
}
