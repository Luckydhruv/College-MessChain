const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude MessChain2.0 directory (backend docker data files) from Metro asset & source scanning
config.resolver.blockList = [
  /MessChain2\.0\/.*/,
];

module.exports = config;
