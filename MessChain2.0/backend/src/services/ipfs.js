const ipfs = require('../config/ipfs');

/**
 * Add text content to IPFS and return the CID.
 */
async function addText(text) {
  return await ipfs.addText(text);
}

/**
 * Retrieve text content from IPFS by CID.
 */
async function getText(cid) {
  return await ipfs.getText(cid);
}

module.exports = { addText, getText };
