
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "out");
const port = Number(process.env.PORT || 3000);
const basePath = "/shiraz-metro-live";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(root)) {
  console.error("The out/ directory does not exist. Run `npm run build` first.");
  process.exit(1);
}

http.createServer((request, response) => {
  let urlPath = decodeURIComponent(
    new URL(request.url, `http://${request.headers.host}`).pathname
  );

  // Remove GitHub Pages basePath for local filesystem lookup.
  if (urlPath === basePath) {
    urlPath = "/";
  } else if (urlPath.startsWith(basePath + "/")) {
    urlPath = urlPath.slice(basePath.length);
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");

  let filePath = path.join(root, safePath);

  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, "index.html");
  }

  if (!path.extname(filePath)) {
    const htmlPath = `${filePath}.html`;
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  if (
    !filePath.startsWith(root + path.sep) ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    filePath = path.join(root, "404.html");
    response.statusCode = 404;

    if (!fs.existsSync(filePath)) {
      filePath = path.join(root, "index.html");
    }
  }

  response.setHeader(
    "Content-Type",
    mime[path.extname(filePath)] || "application/octet-stream"
  );

  fs.createReadStream(filePath).pipe(response);

}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}/shiraz-metro-live/`);
});
