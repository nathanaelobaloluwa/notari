const fs = require('fs');
const path = require('path');
const http = require('http');

const testIdPath = path.join(__dirname, 'test', 'test-signup-id.png');
fs.writeFileSync(testIdPath, Buffer.from('fake-png'));

const boundary = '----FormBoundary' + Date.now();
const chunks = [
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="username"\r\n\r\nwww\r\n'),
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="email"\r\n\r\nexploretech322@gmail.com\r\n'),
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="clubName"\r\n\r\ntest\r\n'),
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="password"\r\n\r\npassword123\r\n'),
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="identification"; filename="test-id.png"\r\nContent-Type: image/png\r\n\r\n'),
  Buffer.from('fake-png'),
  Buffer.from('\r\n--' + boundary + '--\r\n')
];
const body = Buffer.concat(chunks);

const req = http.request({hostname:'localhost',port:3000,path:'/api/auth/signup',method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=' + boundary,'Content-Length':body.length}}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log('Status:',res.statusCode,d)); });
req.write(body);
req.end();
