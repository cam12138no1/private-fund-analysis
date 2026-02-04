const https = require('https');

// 从环境变量或直接使用
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.log('需要 BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}

const options = {
  hostname: 'blob.vercel-storage.com',
  path: '/?prefix=analyses/',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('=== Blob 路径列表 ===');
      console.log('总数:', result.blobs?.length || 0);
      
      // 按路径分组显示
      const paths = {};
      for (const blob of (result.blobs || [])) {
        const path = blob.pathname;
        if (!paths[path]) paths[path] = [];
        paths[path].push(blob.uploadedAt);
      }
      
      console.log('\n唯一路径:');
      Object.keys(paths).sort().forEach(p => {
        console.log(p);
      });
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', console.error);
req.end();
