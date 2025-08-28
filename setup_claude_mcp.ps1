# PowerShell script to set up Claude Code MCP configuration on Windows

# Create the Claude config directory if it doesn't exist
$claudeConfigDir = "$env:APPDATA\Claude"
if (!(Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force
    Write-Host "Created Claude config directory: $claudeConfigDir"
}

# Define the MCP configuration
$mcpConfig = @{
    mcpServers = @{
        supabase = @{
            command = "npx"
            args = @(
                "-y",
                "@supabase/mcp-server-supabase@latest",
                "--read-only",
                "--project-ref=wzdkygvkcmppirgctoyl"
            )
            env = @{
                SUPABASE_ACCESS_TOKEN = "sbp_7b2e67cd6dc8a94d10026f3cbaf77464503af26e"
            }
        }
    }
} | ConvertTo-Json -Depth 4

# Write the configuration to the file
$configPath = "$claudeConfigDir\claude_desktop_config.json"
$mcpConfig | Out-File -FilePath $configPath -Encoding UTF8

Write-Host "Claude MCP configuration created at: $configPath"
Write-Host ""
Write-Host "IMPORTANT: You need to replace 'YOUR_PERSONAL_ACCESS_TOKEN_HERE' with your actual Supabase Personal Access Token"
Write-Host ""
Write-Host "To edit the file, run: notepad `"$configPath`""