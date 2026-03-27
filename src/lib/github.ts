export interface GitHubConfig {
    owner: string;
    repo: string;
    token: string;
}

export async function getFileSHA(config: GitHubConfig, path: string, branch: string = 'main'): Promise<string | null> {
    const baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker-NanoBase'
    };

    try {
        // 1. Get the latest commit SHA for the branch
        const refResp = await fetch(`${baseUrl}/git/ref/heads/${branch}`, { headers });
        if (!refResp.ok) return null;
        const refData = await refResp.json() as { object: { sha: string } };
        
        // 2. Get the tree (recursive=1 to handle deep paths if necessary)
        const treeUrl = `${baseUrl}/git/trees/${refData.object.sha}?recursive=1`;
        const treeResp = await fetch(treeUrl, { headers });
        if (!treeResp.ok) return null;
        const treeData = await treeResp.json() as { tree: { path: string, sha: string }[] };
        
        // 3. Find the file in the full tree
        const file = treeData.tree.find(item => item.path === path);
        return file ? file.sha : null;
    } catch (e) {
        console.error('Error fetching SHA via Trees API:', e);
        return null;
    }
}

export async function updateFile(config: GitHubConfig, path: string, content: string, message: string, sha?: string, branch?: string): Promise<void> {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

    const body: any = {
        message,
        content: btoa(unescape(encodeURIComponent(content))), // Handle Unicode
        sha
    };

    if (branch) {
        body.branch = branch;
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Cloudflare-Worker-NanoBase',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`GitHub Update Error (${response.status}): ${errorBody}`);
    }
}

export interface FileChange {
    path: string;
    content: string;
}

export async function createBatchCommit(config: GitHubConfig, changes: FileChange[], message: string, branch: string): Promise<void> {
    const baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker-NanoBase',
        'Content-Type': 'application/json'
    };

    // 1. Get current commit SHA
    const refResp = await fetch(`${baseUrl}/git/ref/heads/${branch}`, { headers });
    if (!refResp.ok) throw new Error(`Failed to get ref: ${refResp.statusText}`);
    const refData = await refResp.json() as { object: { sha: string } };
    const latestCommitSha = refData.object.sha;

    // 2. Create Tree
    const tree = changes.map(change => ({
        path: change.path,
        mode: '100644',
        type: 'blob',
        content: change.content
    }));

    const treeResp = await fetch(`${baseUrl}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            base_tree: latestCommitSha,
            tree
        })
    });
    if (!treeResp.ok) throw new Error(`Failed to create tree: ${await treeResp.text()}`);
    const treeData = await treeResp.json() as { sha: string };

    // 3. Create Commit
    const commitResp = await fetch(`${baseUrl}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            message,
            tree: treeData.sha,
            parents: [latestCommitSha]
        })
    });
    if (!commitResp.ok) throw new Error(`Failed to create commit: ${await commitResp.text()}`);
    const commitData = await commitResp.json() as { sha: string };

    // 4. Update Ref
    const finalResp = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            sha: commitData.sha,
            force: false
        })
    });
    if (!finalResp.ok) throw new Error(`Failed to update ref: ${await finalResp.text()}`);
}
