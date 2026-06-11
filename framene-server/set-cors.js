const OSS = require('ali-oss');
require('dotenv').config({ path: '/Users/erzhuonie/Desktop/framene/framene-server/.env' });

async function main() {
  const client = new OSS({
    region: process.env.OSS_REGION || 'oss-cn-beijing',
    bucket: process.env.OSS_BUCKET || 'framene-photos',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    secure: true,
  });

  try {
    // The ali-oss SDK expects an array of rule objects
    await client.putBucketCORS([
      {
        allowedOrigin: ['*'],
        allowedMethod: ['GET', 'HEAD'],
        allowedHeader: ['*'],
        exposeHeader: ['ETag', 'x-oss-request-id'],
        maxAgeSeconds: 3600,
      },
    ]);
    console.log('✅ CORS set!');
  } catch (e) {
    console.error('❌', e.message);
    
    // Try raw HTTP
    const crypto = require('crypto');
    const date = new Date().toUTCString();
    const contentType = 'application/xml';
    const md5 = crypto.createHash('md5');
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-oss-request-id</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;
    
    const body = Buffer.from(xml, 'utf-8');
    md5.update(body);
    const contentMd5 = md5.digest('base64');
    
    const stringToSign = `PUT\n${contentMd5}\n${contentType}\n${date}\n/${process.env.OSS_BUCKET}/?cors`;
    const signature = crypto.createHmac('sha1', process.env.OSS_ACCESS_KEY_SECRET).update(stringToSign).digest('base64');
    const auth = `OSS ${process.env.OSS_ACCESS_KEY_ID}:${signature}`;
    
    const endpoint = `${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`;
    
    const https = require('https');
    const options = {
      hostname: endpoint,
      path: '/?cors',
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length,
        'Content-MD5': contentMd5,
        'Date': date,
        'Authorization': auth,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ CORS configured via REST!');
        } else {
          console.log(`HTTP ${res.statusCode}:`, data.substring(0, 300));
        }
      });
    });
    req.on('error', e => console.error('REST error:', e.message));
    req.write(body);
    req.end();
  }
}

main();
