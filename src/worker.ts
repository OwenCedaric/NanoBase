import { GitHubConfig, getFileSHA, createBatchCommit, FileChange } from './lib/github';
import { IndexData, Document } from './types';

interface Env {
    ASSETS: Fetcher;
    ADMIN_TOKEN: string;
    GH_PAT: string;
    GH_OWNER: string;
    GH_REPO: string;
    DATA_SERVICE?: Fetcher; // Service Binding to nanobase-data
}

const DATA_BRANCH = 'data';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // SEO Support: Prevent duplicate content indexing for /read/* paths
        if (url.pathname === '/robots.txt') {
            const robotsTxt = [
                'User-agent: *',
                'Allow: /',
                'Disallow: /read/',
                'Disallow: /api/data/',
                `Sitemap: ${url.origin}/sitemap.xml`
            ].join('\n');
            return new Response(robotsTxt, {
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        if (url.pathname === '/sitemap.xml' || url.pathname.startsWith('/sitemap-docs')) {
            const path = url.pathname.replace('/', '');
            return handleDataRequest(path, env);
        }

        // Proxy data requests to the high-performance static deployment via Service Binding
        if (url.pathname.startsWith('/api/data/')) {
            const path = url.pathname.replace('/api/data/', '');
            return handleDataRequest(path, env);
        }

        // Handle API Upload
        if (url.pathname === '/api/upload' && request.method === 'POST') {
            return handleUpload(request, env);
        }

        // Handle Direct Document Reading (Browser Native Rendering)
        if (url.pathname.startsWith('/read/')) {
            const slug = url.pathname.replace('/read/', '');
            if (slug) {
                // First get index to find the filename for this slug
                const indexResp = await handleDataRequest('index.json', env);
                if (indexResp.ok) {
                    const indexData = await indexResp.json() as IndexData;
                    const doc = indexData.documents.find(d => d.slug === slug);
                    if (doc) {
                        const fileName = doc.path.split('/').pop();
                        if (fileName) {
                            const response = await handleDataRequest(`documents/${fileName}`, env);
                            // Prevent indexing of raw HTML files to avoid duplicate content penalties
                            const newHeaders = new Headers(response.headers);
                            newHeaders.set('X-Robots-Tag', 'noindex');
                            return new Response(response.body, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: newHeaders
                            });
                        }
                    }
                }
            }
            return new Response('Document not found', { status: 404 });
        }

        // Default to serving static assets (frontend) or SPA fallback with meta injection
        return handleFrontendRequest(request, env);
    },
};

/**
 * Handles frontend requests with SPA fallback and dynamic meta injection.
 */
async function handleFrontendRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. If it's a direct file request (has extension), let ASSETS handle it
    if (pathname.includes('.') && !pathname.endsWith('.html')) {
        return env.ASSETS.fetch(request);
    }

    // 2. Fetch the base index.html
    const response = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
    if (!response.ok) return response;

    let html = await response.text();

    // 3. Dynamic Meta Injection for specific note pages
    const pathParts = pathname.split('/').filter(Boolean);
    const slug = pathParts[0] === 'read' ? pathParts[1] : pathParts[0];

    if (slug && slug !== 'upload' && slug !== 'index') {
        try {
            const indexResp = await handleDataRequest('index.json', env);
            if (indexResp.ok) {
                const indexData = await indexResp.json() as IndexData;
                const doc = indexData.documents.find(d => d.slug === slug);

                if (doc) {
                    const title = `${doc.title} | NanoBase`;
                    const description = `Read "${doc.title}" on NanoBase personal knowledge archive.`;
                    const currentUrl = `${url.origin}/${doc.slug}`;

                    // Inject SEO & Social Meta Tags
                    html = html
                        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
                        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`)
                        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`)
                        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)
                        .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${currentUrl}" />`)
                        .replace(/<meta property="twitter:title" content=".*?" \/>/, `<meta property="twitter:title" content="${title}" />`)
                        .replace(/<meta property="twitter:description" content=".*?" \/>/, `<meta property="twitter:description" content="${description}" />`)
                        .replace(/<meta property="twitter:url" content=".*?" \/>/, `<meta property="twitter:url" content="${currentUrl}" />`);
                }
            }
        } catch (e) {
            console.error('Meta injection error:', e);
        }
    }

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'public, max-age=60'
        }
    });
}

/**
 * Proxies requests to files in the 'data' branch via Service Binding or GitHub fallback.
 */
async function handleDataRequest(path: string, env: Env): Promise<Response> {
    // If DATA_SERVICE is bound, use ultra-fast internal Service Binding
    if (env.DATA_SERVICE) {
        try {
            // Internal request to the bound service
            const response = await env.DATA_SERVICE.fetch(`http://internal/` + path);
            if (response.ok) {
                // Forward content with correct headers
                const newResponse = new Response(response.body, response);
                newResponse.headers.set('Access-Control-Allow-Origin', '*');
                newResponse.headers.set('Cache-Control', 'public, max-age=60');
                return newResponse;
            }
        } catch (e) {
            console.error('Service Binding fetch failed, falling back to GitHub:', e);
        }
    }

    // Fallback: Fetch directly from GitHub API (useful for instant updates before static deploy finishes)
    const githubUrl = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${path}?ref=${DATA_BRANCH}`;

    try {
        const response = await fetch(githubUrl, {
            headers: {
                'Authorization': `token ${env.GH_PAT}`,
                'Accept': 'application/vnd.github.v3.raw',
                'User-Agent': 'Cloudflare-Worker-NanoBase'
            }
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ message: 'Data not found', path }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(response.body, {
            headers: {
                'Content-Type': path.endsWith('.json') ? 'application/json' : 'text/html',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ message: 'Proxy error', error: err.message }), { status: 500 });
    }
}


async function handleUpload(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const originalUrl = formData.get('original_url') as string | null;
        const seriesTitle = formData.get('series_title') as string | null;
        const seriesId = formData.get('series_id') as string | null;
        const partsManifestStr = formData.get('parts_manifest') as string | null;

        const partsManifest = partsManifestStr ? JSON.parse(partsManifestStr) as any[] : null;

        if (files.length === 0) {
            return new Response(JSON.stringify({ message: 'No files uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const githubConfig: GitHubConfig = {
            owner: env.GH_OWNER,
            repo: env.GH_REPO,
            token: env.GH_PAT
        };

        // 1. Load current index.json from DATA_BRANCH
        const indexSha = await getFileSHA(githubConfig, 'index.json', DATA_BRANCH);
        let indexData: IndexData = { total: 0, last_updated: '', documents: [] };

        if (indexSha) {
            const indexResp = await handleDataRequest('index.json', env);
            if (indexResp.ok) {
                indexData = await indexResp.json();
            }
        }

        const changes: FileChange[] = [];
        const finalSeriesId = seriesId || (seriesTitle || (partsManifest ? partsManifest.length > 1 : files.length > 1) ? crypto.randomUUID() : undefined);
        const totalParts = partsManifest ? partsManifest.length : (files.length > 1 ? files.length : undefined);

        const newDocuments: Document[] = [];
        const existingDocsInSeries: string[] = [];

        if (partsManifest) {
            // Manifest-based sync (Edit or Complex Upload)
            for (let i = 0; i < partsManifest.length; i++) {
                const part = partsManifest[i];
                const partNumber = i + 1;

                if (part.type === 'existing' && part.docId) {
                    const doc = indexData.documents.find(d => d.id === part.docId);
                    if (doc) {
                        doc.series_id = finalSeriesId;
                        doc.series_title = seriesTitle || undefined;
                        doc.part_number = partNumber;
                        doc.total_parts = totalParts;
                        if (originalUrl) doc.original_url = originalUrl;
                        existingDocsInSeries.push(doc.id);
                    }
                } else if (part.type === 'file' && part.fileName) {
                    const file = files.find(f => f.name === part.fileName);
                    if (file) {
                        const content = await file.text();
                        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
                        const title = titleMatch ? titleMatch[1].trim() : file.name.replace('.html', '');
                        const slug = file.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

                        // Duplicate check (skip if the slug belongs to an existing doc we are keeping, though unlikely for new files)
                        const duplicate = indexData.documents.find(d => d.slug === slug || d.title === title);
                        if (duplicate) {
                           // If it's a conflict, we could error OR append a suffix. Let's error for safety.
                           return new Response(JSON.stringify({ message: `Conflict: "${title}" already exists.` }), { status: 409 });
                        }

                        const id = crypto.randomUUID();
                        const uploadDate = new Date().toISOString().split('T')[0];
                        const path = `/api/data/documents/${file.name}`;

                        newDocuments.push({
                            id, title, slug, upload_date: uploadDate, path,
                            original_url: originalUrl || undefined,
                            series_id: finalSeriesId,
                            series_title: seriesTitle || undefined,
                            part_number: partNumber,
                            total_parts: totalParts
                        });

                        changes.push({ path: `documents/${file.name}`, content });
                    }
                }
            }

            // Remove existing docs that were in this series but are NO LONGER in the manifest
            // actually, the user said "supplement and reorder", usually removing is implied by the queue UI.
            // Let's filter out docs that were in the ORIGINAL series but not in existingDocsInSeries
            if (seriesId) {
                indexData.documents = indexData.documents.filter(d => 
                    d.series_id !== seriesId || existingDocsInSeries.includes(d.id)
                );
            }
            
            // Add the new documents to the top of the overall index (or we could keep original dates)
            indexData.documents = [...newDocuments, ...indexData.documents];

        } else {
            // Legacy/Simple Upload logic
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const content = await file.text();
                const titleMatch = content.match(/<title>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1].trim() : file.name.replace('.html', '');
                const slug = file.name.toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                const partNumber = finalSeriesId ? i + 1 : undefined;

                const duplicate = indexData.documents.find(d => d.slug === slug || d.title === title);
                if (duplicate) {
                    return new Response(JSON.stringify({ message: `Conflict: "${title}" exists.` }), { status: 409 });
                }

                const id = crypto.randomUUID();
                const uploadDate = new Date().toISOString().split('T')[0];
                const path = `/api/data/documents/${file.name}`;

                newDocuments.push({
                    id, title, slug, upload_date: uploadDate, path,
                    original_url: originalUrl || undefined,
                    series_id: finalSeriesId,
                    series_title: seriesTitle || undefined,
                    part_number: partNumber,
                    total_parts: totalParts
                });

                changes.push({ path: `documents/${file.name}`, content });
            }
            indexData.documents = [...newDocuments, ...indexData.documents];
        }
        indexData.total = indexData.documents.length;
        indexData.last_updated = new Date().toISOString();

        // 4. Generate Static Sitemaps
        const origin = new URL(request.url).origin;
        const lastMod = new Date().toISOString().split('T')[0];

        // 4. Generate Multipart Static Sitemaps (500 records per file)
        const SITEMAP_CHUNK_SIZE = 500;
        const totalSitemapChunks = Math.ceil(indexData.documents.length / SITEMAP_CHUNK_SIZE);

        const sitemapIndexEntries: string[] = [];

        for (let i = 0; i < totalSitemapChunks; i++) {
            const chunkNumber = i + 1;
            const chunkDocs = indexData.documents.slice(i * SITEMAP_CHUNK_SIZE, (i + 1) * SITEMAP_CHUNK_SIZE);
            const sitemapFileName = `sitemap-docs-${chunkNumber}.xml`;

            const chunkUrls = chunkDocs.map(doc => `  <url>
    <loc>${origin}/${doc.slug}</loc>
    <lastmod>${doc.upload_date}</lastmod>
    <changefreq>monthly</changefreq>
  </url>`).join('\n');

            const chunkXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${i === 0 ? `
  <url>
    <loc>${origin}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>` : ''}
${chunkUrls}
</urlset>`;

            changes.push({
                path: sitemapFileName,
                content: chunkXml
            });

            sitemapIndexEntries.push(`  <sitemap>
    <loc>${origin}/${sitemapFileName}</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>`);
        }

        // Build sitemap.xml Interface (Index)
        const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapIndexEntries.join('\n')}
</sitemapindex>`;

        // Add sitemap index to changes
        changes.push({
            path: 'sitemap.xml',
            content: sitemapIndexXml
        });

        // Add index.json change
        changes.push({
            path: 'index.json',
            content: JSON.stringify(indexData, null, 2)
        });

        // 4. Perform Atomic Batch Commit
        await createBatchCommit(
            githubConfig,
            changes,
            finalSeriesId ? `Update series ${seriesTitle || finalSeriesId}` : `Upload ${newDocuments.length} documents and update index`,
            DATA_BRANCH
        );

        return new Response(JSON.stringify({
            success: true,
            message: finalSeriesId ? 'Series updated successfully.' : `${newDocuments.length} files uploaded successfully.`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Upload error:', err);
        return new Response(JSON.stringify({
            message: 'Upload failed',
            error: err.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
