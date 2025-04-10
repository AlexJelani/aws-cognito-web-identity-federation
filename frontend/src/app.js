// Configuration - These values will be replaced after deployment
// Auto-generated configuration file - DO NOT EDIT MANUALLY
// Generated on: 2025-04-08T10:02:55.609Z
// Auto-generated configuration file - DO NOT EDIT MANUALLY
// Generated on: 2025-04-08T10:09:00.377Z
const config = {
    identityPoolId: 'us-east-1:af391233-f192-4753-a5c0-a4dadcdb6c9e',
    googleClientId: '421640755879-euktob5emj3quro6qit3ohpr54nl58ud.apps.googleusercontent.com',
    privateBucketName: 'awscognitowebidentityfede-privatedatabucket5d681de-hkhmtpc2gd85',
    region: 'us-east-1'
};





// Store the current Google credential
let currentCredential = null;

// Handle the credential response from Google Identity Services
function handleCredentialResponse(response) {
    console.log("Google credential response received");
    
    // Store the credential for later use (like sign out)
    currentCredential = response;
    
    // Get the JWT ID token from the response
    const id_token = response.credential;
    
    // Get user information from the decoded JWT
    const payload = parseJwt(id_token);
    console.log("User name: " + payload.name);
    
    // Update UI to show signed-in state
    document.querySelector('#userInfo p').textContent = 'Signed in as: ' + payload.name;
    
    // Show sign out button
    document.getElementById('signOutContainer').style.display = 'block';
    
    // Configure AWS credentials
    AWS.config.region = config.region;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: config.identityPoolId,
        Logins: {
            'accounts.google.com': id_token
        }
    });

    // Refresh credentials
    AWS.config.credentials.refresh((error) => {
        if (error) {
            console.error('Error refreshing credentials:', error);
            alert('Failed to authenticate with AWS: ' + error.message);
        } else {
            console.log('Successfully authenticated with AWS');
            console.log('Identity ID:', AWS.config.credentials.identityId);
            document.getElementById('petsArea').style.display = 'block';
            loadPetImages();
        }
    });
}

// Sign out function
function signOut() {
    console.log("Signing out");
    
    // Reset the UI
    document.querySelector('#userInfo p').textContent = 'You are not signed in.';
    document.getElementById('signOutContainer').style.display = 'none';
    document.getElementById('petsArea').style.display = 'none';
    
    // Clear AWS credentials
    AWS.config.credentials.clearCachedId();
    
    // Revoke Google token
    if (google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }
    
    // Reload the Google Sign-In button
    google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.querySelector('.g_id_signin'),
        { theme: 'outline', size: 'large' }
    );
    
    console.log("Sign out complete");
}

// Helper function to parse JWT tokens
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Load pet images from the private S3 bucket
function loadPetImages() {
    console.log('Loading pet images from bucket:', config.privateBucketName);
    
    const s3 = new AWS.S3();
    const petsContainer = document.getElementById('petsContainer');
    petsContainer.innerHTML = '<p>Loading pet images...</p>';
    
    // Try the private-data/pets/ directory where the images are stored
    s3.listObjects({ 
        Bucket: config.privateBucketName,
        Prefix: 'private-data/pets/'
    }, function(err, data) {
        if (err) {
            console.error('Error listing objects in pets directory:', err);
            petsContainer.innerHTML = '<p>Error loading images: ' + err.message + '</p>';
            return;
        }
        
        console.log('Pet images found:', data.Contents ? data.Contents.length : 0);
        
        petsContainer.innerHTML = ''; // Clear existing content
        
        if (!data.Contents || data.Contents.length === 0) {
            petsContainer.innerHTML = '<p>No pet images found.</p>';
            return;
        }
        
        // Process each object (image) in the bucket
        let imageCount = 0;
        data.Contents.forEach(function(object) {
            console.log('Processing object:', object.Key);
            
            if (object.Key.match(/\.(jpg|jpeg|png|gif)$/i)) {
                imageCount++;
                
                try {
                    const imageUrl = s3.getSignedUrl('getObject', {
                        Bucket: config.privateBucketName,
                        Key: object.Key,
                        Expires: 60 // URL expires in 60 seconds
                    });
                    
                    console.log('Created signed URL for:', object.Key);
                    
                    const imgElement = document.createElement('img');
                    imgElement.src = imageUrl;
                    imgElement.alt = 'Pet Image';
                    imgElement.className = 'pet-image';
                    
                    petsContainer.appendChild(imgElement);
                } catch (urlError) {
                    console.error('Error creating signed URL:', urlError);
                }
            }
        });
        
        console.log('Total images added to page:', imageCount);
        
        if (imageCount === 0) {
            petsContainer.innerHTML = '<p>No pet images found. Check file extensions.</p>';
        }
    });
}

// Make the signOut function globally available
window.signOut = signOut;
// Initialize Google Sign-In when the page loads
window.onload = function() {
    // Initialize Google Sign-In
    if (google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(
            document.querySelector('.g_id_signin'),
            { theme: 'outline', size: 'large' }
        );
    } else {
        console.error('Google Identity Services not loaded properly');
    }
};
