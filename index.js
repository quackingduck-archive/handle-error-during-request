var domain = require('domain')

module.exports = handleError

function handleError(server) {
  return function (next, req, res) {
    var d = domain.create()

    d.on('error', function(err) {
      try {
        reportError(err, req)

        console.error("Attempting to shut down gracefully")
        // stop taking new requests.
        server.close(function(){
          console.error("Shut down gracefully!")
          process.exit(1)
        })

        killProcessAfterTimeout(msToWaitForAllRequestsToFinish)

        // try to send an error to the request that triggered the problem
        sendErrResponse(res)
      } catch (err2) {
        // oh well, not much we can do at this point.
        console.error('Error sending 500:', err2.stack)
        process.exit(2)
      }
    })

    // Because req and res were created before this domain existed,
    // we need to explicitly add them.
    d.add(req)
    d.add(res)

    // Now run the rest of the chain "inside" the domain
    d.run(function(){ next(req, res) })
  }
}

function reportError(err, req) {
  console.error('An error occurred while processing a request: ' + req.method + ' ' + req.url)

  if (err.name && !err.stack) console.error(err.name)
  else if (err.stack) console.error(err.stack)
  else console.error(err) // sometimes it's a string :(
}

function sendErrResponse(res) {
  res.statusCode = 500
  res.setHeader('content-type', 'text/plain')
  res.end('Oh noes!\n')
}

var msToWaitForAllRequestsToFinish = 30000

function killProcessAfterTimeout(msTimeout) {
  // make sure we close down within N seconds
  var t = setTimeout(function() {
    console.error("Graceful timeout exceeded, going down hard")
    process.exit(2)
  }, msTimeout)
  // But don't keep the process open just for that!
  t.unref()
}
