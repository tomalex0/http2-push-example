'use strict'

const fs = require('fs')
const path = require('path')
// eslint-disable-next-line
const http2 = require('http2')
const helper = require('./helper')

const { HTTP2_HEADER_PATH } = http2.constants
const PORT = process.env.PORT || 3000
const PUBLIC_PATH = path.join(__dirname, '../public')

const publicFiles = helper.getFiles(PUBLIC_PATH)
const server = http2.createSecureServer({
  cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem')),
  key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem'))
},onRequest);



// Push file
function push (stream, path) {
  const file = publicFiles.get(path)

  if (!file) {
    return
  }

  stream.pushStream({ [HTTP2_HEADER_PATH]: path }, (pushStream) => {
    pushStream.respondWithFD(file.fileDescriptor, file.headers)
  })
}

// Request handler
function onRequest (req, res) {
  const reqPath = req.headers[':path'] === '/' ? '/index.html' : req.headers[':path'];
  const file = publicFiles.get(reqPath);

  // File not found
  if (!file) {
    res.stream.respond({
        'content-type': 'text/html',
        ':status': 404
    });
    res.end('<h1>Page Not Found</h1>');
    return
  }

  // Push with index.html
  if (reqPath === '/index.html') {
    push(req.stream, '/bundle1.js')
    push(req.stream, '/bundle2.js')
  }

  // Serve file
  req.stream.respondWithFD(file.fileDescriptor, file.headers)
}

server.listen(PORT, (err) => {
  if (err) {
    console.error(err)
    return
  }

  console.log(`Server listening on ${PORT}`)
})
