# Supabase File Storage Implementation Plan

## Current Status: ✅ MCP Server Configured

### Completed Steps
- [x] Supabase MCP server configured for both Cursor and Claude Code
- [x] Configuration files created and deployed

### MCP Server Locations
- **Cursor**: `/root/.cursor/mcp.json` (working)
- **Claude Code**: `~/.config/Claude/claude_desktop_config.json` (configured)

## Next Phase: File Storage Implementation

### Phase 1: Test MCP Connection & Database Analysis
After restarting Claude Code, test the MCP server:

1. **Verify MCP Connection**
   ```
   Ask Claude: "What tables exist in my Supabase database?"
   ```

2. **Analyze Current File Storage**
   ```
   Ask Claude: "Show me any existing file or media related tables in my MedusaJS database"
   ```

3. **Review MedusaJS Schema**
   ```
   Ask Claude: "What is the current database schema structure for my MedusaJS modules?"
   ```

### Phase 2: Install File Storage Dependencies

1. **Install Required Packages**
   ```bash
   yarn add @medusajs/medusa/file-s3 @aws-sdk/client-s3
   ```

2. **Verify Current Dependencies**
   - ✅ `@supabase/supabase-js` already installed (v2.53.0)
   - ✅ Supabase database connection already configured

### Phase 3: Configure Supabase Storage

1. **Create Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Create bucket named `medusa-files`
   - Configure public/private access policies

2. **Update Environment Variables**
   Add to `.env`:
   ```env
   # File Storage Configuration
   SUPABASE_STORAGE_URL=https://wzdkygvkcmppirgctoyl.supabase.co/storage/v1/s3
   SUPABASE_BUCKET_NAME=medusa-files
   S3_FILE_URL=https://wzdkygvkcmppirgctoyl.supabase.co/storage/v1/object/public/medusa-files
   ```

### Phase 4: Configure MedusaJS File Module

1. **Update `medusa-config.ts`**
   Add file module configuration:
   ```typescript
   modules: [
     // ... existing modules
     {
       resolve: "@medusajs/medusa/file",
       options: {
         providers: [
           {
             resolve: "@medusajs/medusa/file-s3",
             id: "s3",
             options: {
               file_url: process.env.S3_FILE_URL,
               access_key_id: process.env.SUPABASE_ACCESS_TOKEN?.split('_')[1], // Extract from token
               secret_access_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
               region: "eu-west-3", // Your Supabase region
               bucket: process.env.SUPABASE_BUCKET_NAME,
               endpoint: process.env.SUPABASE_STORAGE_URL,
               additional_client_config: {
                 forcePathStyle: true, // Required for Supabase
               },
             },
           },
         ],
       },
     },
   ]
   ```

### Phase 5: Create Supabase-Specific File Service (Optional)

For more control, create a custom Supabase file service:
```
/src/modules/file-storage/
├── index.ts
├── service.ts
├── types.ts
└── models/
```

### Phase 6: Test File Upload

1. **Test via Admin Panel**
   - Upload files through MedusaJS admin
   - Verify storage in Supabase

2. **Test API Endpoints**
   ```bash
   # Test file upload API
   curl -X POST http://localhost:9000/admin/uploads \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -F "files=@test-file.jpg"
   ```

### Phase 7: Configure Storage Policies

In Supabase Dashboard → Storage → Policies:

1. **Public Read Policy**
   ```sql
   CREATE POLICY "Public read access" ON storage.objects
   FOR SELECT USING (bucket_id = 'medusa-files');
   ```

2. **Authenticated Upload Policy**
   ```sql
   CREATE POLICY "Authenticated upload" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'medusa-files');
   ```

## Key Configuration Points

### Environment Variables Needed
```env
# Already configured
SUPABASE_URL=https://wzdkygvkcmppirgctoyl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Need to add
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_URL=https://wzdkygvkcmppirgctoyl.supabase.co/storage/v1/s3
SUPABASE_BUCKET_NAME=medusa-files
S3_FILE_URL=https://wzdkygvkcmppirgctoyl.supabase.co/storage/v1/object/public/medusa-files
```

### Critical Requirements
- ✅ Project ID: `wzdkygvkcmppirgctoyl`
- ✅ MCP Token configured
- ⏳ Service Role Key needed
- ⏳ Storage bucket creation
- ⏳ RLS policies configuration

## Testing Checklist

After implementation:
- [ ] Files upload successfully via admin
- [ ] Files are stored in Supabase storage
- [ ] File URLs are accessible
- [ ] File deletion works
- [ ] Large file uploads work
- [ ] File permissions are correct

## Troubleshooting

Common issues and solutions:
1. **403 Forbidden**: Check RLS policies and service role key
2. **CORS errors**: Configure CORS in Supabase settings
3. **Path style issues**: Ensure `forcePathStyle: true` is set
4. **Token issues**: Use service role key for server-side operations

## Resources

- [MedusaJS File Module Docs](https://docs.medusajs.com/resources/infrastructure-modules/file/s3)
- [Supabase Storage S3 Compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)

---

**Next Command After Restart:**
```
Ask Claude: "I'm ready to continue with Supabase file storage implementation. Can you help me test the MCP connection first and then proceed with the file storage setup?"
```