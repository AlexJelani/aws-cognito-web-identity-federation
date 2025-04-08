/**
 * Simple script to update frontend configuration with values from environment variables
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found!');
    console.error('Please copy .env.example to .env and fill in your values.');
    process.exit(1);
  }
  
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
  }
  
  console.log('Environment variables loaded successfully.');
  return process.env;
}

// Main function to update configuration
function updateConfig() {
  // Load environment variables
  const env = loadEnv();
  
  // Create the configuration content
  const configContent = `// Auto-generated configuration file - DO NOT EDIT MANUALLY
// Generated on: ${new Date().toISOString()}
const config = {
    identityPoolId: '${env.IDENTITY_POOL_ID}',
    googleClientId: '${env.GOOGLE_CLIENT_ID}',
    privateBucketName: '${env.PRIVATE_BUCKET_NAME}',
    region: '${env.AWS_REGION}'
};
`;

  // Paths to update
  const srcConfigPath = path.resolve(process.cwd(), 'frontend/src/app.js');
  const distConfigPath = path.resolve(process.cwd(), 'frontend/dist/app.js');

  // Update source file
  if (fs.existsSync(srcConfigPath)) {
    let srcContent = fs.readFileSync(srcConfigPath, 'utf8');
    srcContent = srcContent.replace(/const config = \{[\s\S]*?\};/m, configContent);
    fs.writeFileSync(srcConfigPath, srcContent);
    console.log(`Updated configuration in ${srcConfigPath}`);
  }

  // Update dist file if it exists
  if (fs.existsSync(distConfigPath)) {
    let distContent = fs.readFileSync(distConfigPath, 'utf8');
    distContent = distContent.replace(/const config = \{[\s\S]*?\};/m, configContent);
    fs.writeFileSync(distConfigPath, distContent);
    console.log(`Updated configuration in ${distConfigPath}`);
  }

  console.log('Configuration update complete!');
}

// Run the update
updateConfig();
