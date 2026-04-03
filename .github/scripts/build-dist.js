const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to recursively get all HTML files in a directory
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

const download = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      return download(response.headers.location, dest).then(resolve).catch(reject);
    }
    if (response.statusCode !== 200) {
      return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
    }
    response.pipe(file);
    file.on('finish', () => { file.close(); resolve(); });
  }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
});

async function run() {
  const baseDir = process.cwd();
  // `dist/` is our working target built directory
  const distDir = path.join(baseDir, 'dist');
  const distDocsDir = path.join(distDir, 'documents');
  
  if (!fs.existsSync(distDocsDir)) {
    console.log('No dist/documents directory found. Make sure files are copied to dist/ before running build-dist.js');
    return;
  }
  
  const files = getHtmlFiles(distDocsDir);
  console.log(`Found ${files.length} HTML files to process in dist/documents/`);

  let remixDownloaded = false;

  for (const fullPath of files) {
    let html = fs.readFileSync(fullPath, 'utf-8');
    let dirty = false;
    
    // 1. Process RemixIcon across all files (smart fetch once per pipeline)
    const hasRemix = /href="[^"]*remixicon/i.test(html);
    if (hasRemix) {
      const remixAssetDir = path.join(distDir, 'assets', 'remixicon');
      
      if (!remixDownloaded) {
        if (!fs.existsSync(remixAssetDir)) {
          fs.mkdirSync(remixAssetDir, { recursive: true });
        }
        console.log(`Downloading latest RemixIcon locally...`);
        const cssUrl = `https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.css`;
        const woff2Url = `https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.woff2`;
        
        try {
          let cssText = '';
          await new Promise((resolve, reject) => {
            https.get(cssUrl, (res) => {
              if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => { cssText = data; resolve(); });
            }).on('error', reject);
          });
          
          const simplifiedCss = cssText.replace(/src:\s*url\([^;]+;/, "src: url('remixicon.woff2') format('woff2');");
          fs.writeFileSync(path.join(remixAssetDir, 'remixicon.css'), simplifiedCss);
          await download(woff2Url, path.join(remixAssetDir, 'remixicon.woff2'));
          remixDownloaded = true;
          console.log(`✅ Latest RemixIcon successfully cached in dist/assets/remixicon`);
        } catch (err) {
          console.warn(`❌ Failed to downlaod closest RemixIcon:`, err.message);
        }
      }
      
      // Enforce clean unified path rewriting
      let remixReplaced = false;
      const originalHtml = html;
      html = html.replace(/<link[^>]+href="[^"]*remixicon[^"]*"[^>]*>/gi, () => {
        if (!remixReplaced) {
          remixReplaced = true;
          return `<link href="/assets/remixicon/remixicon.css" rel="stylesheet">`;
        }
        return '';
      });
      if (originalHtml !== html) dirty = true;
    }

    if (dirty) {
      fs.writeFileSync(fullPath, html);
    }
  }
}

run().catch(console.error);
