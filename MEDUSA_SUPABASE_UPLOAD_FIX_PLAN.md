## MedusaJS × Supabase File Upload — Fix Plan

### Symptoms observed
- **403 InvalidAccessKeyId** on `POST /admin/uploads` when uploading image.
  - Response headers include `sb-project-ref: wzdkygvkcmppirgctoyl`, confirming requests hit Supabase S3 compatibility endpoint.
- **400 Invalid request: Unrecognized fields: 'expand'** for:
  - `GET /admin/products/:id/variants?expand=brand`
  - Similar errors on product-related admin requests.
- **400 Invalid request: Field 'images, 0, url' is required** immediately after failed upload.

### Likely root causes
1) **Wrong S3 credentials for Supabase Storage**
   - Using Service Role/Anon keys instead of Supabase Storage S3 Access Keys.
   - Missing or incorrect `S3_*` env vars (access key, secret, endpoint, bucket, region, public file URL).
2) **Unsupported 'expand' query param in current Medusa API route**
   - The admin UI or custom code sends `expand=brand` to endpoints that don't accept it.
3) **Follow-on validation error**
   - Upload fails → no URL returned → subsequent product update payload lacks `images[0].url`.

---

### Remediation steps

#### 1) Fix Supabase Storage S3 credentials and config
1. In Supabase Dashboard → Storage → Settings → S3 → **Create Access Key**
   - Save the generated **Access key** and **Secret key**. These are NOT the service role key.
2. Ensure bucket exists: create bucket `medusa-files` (public or private per your policy).
3. Set/update environment variables (development and production):
   ```env
   # S3 compatibility to Supabase Storage
   S3_ACCESS_KEY_ID=YOUR_SUPABASE_S3_ACCESS_KEY
   S3_SECRET_ACCESS_KEY=YOUR_SUPABASE_S3_SECRET_KEY
   S3_ENDPOINT=https://wzdkygvkcmppirgctoyl.supabase.co/storage/v1/s3
   S3_BUCKET=medusa-files
   # Region is required by clients; Supabase accepts any. Use us-east-1.
   S3_REGION=us-east-1

   # Public URL base when bucket is public (used by Medusa to build URLs)
   S3_FILE_URL=https://wzdkygvkcmppirgctoyl.supabase.co/storage/v1/object/public/medusa-files
   ```
4. Confirm `medusa-config.ts` file provider uses these vars and `forcePathStyle: true` (already present):
   - `@medusajs/medusa/file` with `@medusajs/medusa/file-s3`
   - `file_url`, `access_key_id`, `secret_access_key`, `endpoint`, `bucket`, `region`
5. Restart the backend (or `docker-compose` services) so env changes take effect.

#### 2) Decide bucket access model and policies
- If public images:
  - Keep `S3_FILE_URL` pointing to `/object/public/medusa-files` and set Supabase Storage to public.
- If private images:
  - Keep bucket private and implement signed URLs in the file service or Medusa URLs layer.
  - Update admin UI to fetch signed URLs when rendering images.

Optional Supabase SQL policies (public read):
```sql
-- Public read access for the medusa-files bucket
create policy "Public read access" on storage.objects
for select using (bucket_id = 'medusa-files');
```

#### 3) Remove or support 'expand' in admin product requests
Pick one approach:
1. **Frontend fix (recommended first):**
   - Locate admin code issuing `GET /admin/products/:id/variants?expand=brand` and remove `expand`.
   - Use supported query params (`fields`, `order`, `limit`, `offset`) and fetch related data via separate calls if needed.
2. **Backend enhancement (optional):**
   - Extend the route’s query validator to accept `expand` or add a resolver that returns the needed relation without `expand`.

Actionable next steps:
- Search in repo for `expand=brand` and `variants?expand` and update calls.

#### 4) Test the upload flow end-to-end
1. API test:
   ```bash
   curl -sS -X POST http://localhost:9000/admin/uploads \
     -H "Authorization: Bearer <ADMIN_API_TOKEN>" \
     -F "files=@/path/to/sample.jpg" | jq
   ```
   - Expect 200 and JSON with uploaded file URL(s).
2. Admin UI test:
   - Re-upload an image for a product.
   - Confirm image appears and is reachable at the Supabase public URL (or signed URL if private).

#### 5) Rollback and safety
- Rotate any leaked/mistaken S3 keys in Supabase after testing.
- Keep secrets only in environment variables or secrets manager; never commit.

---

### Acceptance checklist
- [ ] Uploads succeed (200) and objects exist in `medusa-files` bucket
- [ ] Product updates include `images[].url` populated from upload response
- [ ] No more `InvalidAccessKeyId` errors in logs
- [ ] No `Unrecognized fields: 'expand'` errors during product/variant requests
- [ ] Public or private access model verified and documented

### Reference
- Medusa File Module (S3): https://docs.medusajs.com/resources/infrastructure-modules/file/s3
- Supabase Storage — S3 compatibility: https://supabase.com/docs/guides/storage/s3/compatibility
- Supabase Storage policies: https://supabase.com/docs/guides/storage/security/access-control


