// File storage: Cloudflare R2 (S3-compatible) with a local-disk fallback for development.
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

const r2Ready = Boolean(config.r2.endpoint && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket);

export const driver =
  config.storageDriver === 'r2' ? 'r2' : config.storageDriver === 'local' ? 'local' : r2Ready ? 'r2' : 'local';

if (driver === 'r2' && !r2Ready) {
  console.error('[storage] STORAGE_DRIVER=r2 but endpoint / access key / secret / bucket are not all set (R2_* or AWS_* vars).');
  process.exit(1);
}

export const s3 =
  driver === 'r2'
    ? new S3Client({
        region: config.r2.region,
        endpoint: config.r2.endpoint,
        forcePathStyle: config.r2.forcePathStyle,
        credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
      })
    : null;

console.log(
  driver === 'r2'
    ? `[storage] Using S3/R2 bucket "${config.r2.bucket}" at ${new URL(config.r2.endpoint).host}`
    : `[storage] Using local disk (${config.localUploadDir}) — set R2_* (or AWS_*) vars in .env to use cloud storage`,
);

const safeKey = (key) => key.replace(/\.\.+/g, '').replace(/^\/+/, '');

/** Build an object key inside the configured prefix, e.g. objectKey('photos', 'a.jpg') → 'uploads/photos/a.jpg'. */
export const objectKey = (...parts) => [driver === 'r2' ? config.storagePrefix : '', ...parts].filter(Boolean).join('/');

export async function putObject(key, body, contentType) {
  key = safeKey(key);
  if (driver === 'r2') {
    await s3.send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
  } else {
    const file = path.join(config.localUploadDir, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }
  return key;
}

export async function getObjectBuffer(key) {
  key = safeKey(key);
  if (driver === 'r2') {
    const out = await s3.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    return Buffer.from(await out.Body.transformToByteArray());
  }
  return fs.readFile(path.join(config.localUploadDir, key));
}

export async function deleteObject(key) {
  if (!key) return;
  key = safeKey(key);
  try {
    if (driver === 'r2') await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    else await fs.unlink(path.join(config.localUploadDir, key));
  } catch (err) {
    console.warn('[storage] delete failed', key, err.message);
  }
}

/** A URL the browser can use to show the file. Private bucket → short-lived presigned URL. */
export async function getViewUrl(key, expiresIn = 3600) {
  if (!key) return null;
  key = safeKey(key);
  if (driver === 'r2') {
    if (config.r2.publicUrl) return `${config.r2.publicUrl}/${key}`;
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }), { expiresIn });
  }
  return `/api/files/${key}`;
}

export async function checkStorage() {
  if (driver !== 'r2') return { driver, ok: true };
  await s3.send(new HeadBucketCommand({ Bucket: config.r2.bucket }));
  return { driver, ok: true, bucket: config.r2.bucket };
}
