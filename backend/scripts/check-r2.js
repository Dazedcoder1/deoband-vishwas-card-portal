// Quick connectivity check for Cloudflare R2 / any S3-compatible bucket, using the root .env
//   npm run check:r2
import { config } from '../src/config.js';
import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const { endpoint, accessKeyId, secretAccessKey, bucket, region, forcePathStyle } = config.r2;
const missing = Object.entries({ 'R2_ENDPOINT (or AWS_ENDPOINT_URL)': endpoint, 'R2_ACCESS_KEY_ID (or AWS_ACCESS_KEY_ID)': accessKeyId, 'R2_SECRET_ACCESS_KEY (or AWS_SECRET_ACCESS_KEY)': secretAccessKey, 'R2_BUCKET_NAME (or AWS_S3_BUCKET_NAME)': bucket })
  .filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`✗ Missing in .env: ${missing.join(', ')}`);
  process.exit(1);
}

const s3 = new S3Client({ region, endpoint, forcePathStyle, credentials: { accessKeyId, secretAccessKey } });
const key = [config.storagePrefix, 'healthcheck', `${Date.now()}.txt`].filter(Boolean).join('/');

try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`✓ Bucket "${bucket}" is reachable`);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'ok', ContentType: 'text/plain' }));
  console.log('✓ Upload works');
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  console.log(`✓ Download works (${await out.Body.transformToString()})`);
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log('✓ Delete works\n\nObject storage is configured correctly.');
} catch (err) {
  console.error(`✗ R2 check failed: ${err.name}: ${err.message}`);
  if (err.name === 'NoSuchBucket') console.error('  → Create the bucket in Cloudflare dashboard → R2, or fix R2_BUCKET_NAME.');
  if (['InvalidAccessKeyId', 'SignatureDoesNotMatch', 'Unauthorized', 'AccessDenied'].includes(err.name)) {
    console.error('  → Check R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (create them under R2 → Manage R2 API Tokens).');
  }
  process.exit(1);
}
