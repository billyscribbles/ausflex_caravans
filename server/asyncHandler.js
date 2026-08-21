// Express 4 does not forward a rejected async route handler to error
// middleware on its own — a throw or rejection past this point becomes an
// unhandled promise rejection, which crashes the process (Node 20's default
// --unhandled-rejections=throw) rather than producing a response. Wrapping a
// handler in this catches that rejection and hands it to next(), so app.js's
// JSON error middleware can turn it into a 500 instead.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
