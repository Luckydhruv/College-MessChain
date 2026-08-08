const IPFS_API_URL = process.env.IPFS_API_URL || 'http://localhost:5001';

/**
 * Add text content to IPFS via the Kubo HTTP API.
 * Returns the CID (Content Identifier) string.
 */
async function addText(text) {
  const formData = new FormData();
  formData.append('file', new Blob([text], { type: 'text/plain' }));

  const res = await fetch(`${IPFS_API_URL}/api/v0/add`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`IPFS add failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.Hash; // CID
}

/**
 * Retrieve text content from IPFS by CID via the Kubo HTTP API.
 */
async function getText(cid) {
  const res = await fetch(`${IPFS_API_URL}/api/v0/cat?arg=${cid}`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(`IPFS cat failed: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

module.exports = { addText, getText };
