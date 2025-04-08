// Debug script to help troubleshoot Google Sign-In issues
console.log('Debug script loaded');

// Add event listeners to track Google Auth flow
window.addEventListener('load', function() {
    console.log('Page loaded, waiting for Google Auth to initialize');
    
    // Monitor Google Auth initialization
    const checkGapiInterval = setInterval(function() {
        if (window.gapi && window.gapi.auth2) {
            console.log('Google API (gapi) is available');
            clearInterval(checkGapiInterval);
        }
    }, 1000);
});

// Override the handleSignInClick function to add debugging
const originalHandleSignInClick = window.handleSignInClick;
window.handleSignInClick = function() {
    console.log('Sign-in button clicked');
    
    // Check if Google Auth is initialized
    if (!window.gapi || !window.gapi.auth2) {
        console.error('Google Auth is not initialized yet');
        return;
    }
    
    try {
        const auth2 = gapi.auth2.getAuthInstance();
        console.log('Auth instance obtained:', auth2 ? 'Yes' : 'No');
        
        // Check if already signed in
        const isSignedIn = auth2.isSignedIn.get();
        console.log('User is already signed in:', isSignedIn);
        
        // Call original function with debugging
        auth2.signIn().then(
            function(googleUser) {
                console.log('Google Sign-In successful');
                console.log('ID Token length:', googleUser.getAuthResponse().id_token.length);
                
                // Call the original success handler
                onSignInSuccess(googleUser);
            },
            function(error) {
                console.error('Google Sign-In error:', error);
            }
        );
    } catch (error) {
        console.error('Error during sign-in process:', error);
    }
};

// Override the onSignInSuccess function to add debugging
const originalOnSignInSuccess = window.onSignInSuccess;
window.onSignInSuccess = function(googleUser) {
    console.log('onSignInSuccess called');
    
    try {
        const profile = googleUser.getBasicProfile();
        console.log('User profile obtained:', profile ? 'Yes' : 'No');
        
        // Update UI
        document.querySelector('#userInfo p').textContent = 'Signed in as: ' + profile.getName();
        console.log('UI updated with user name');
        
        // Get the Google ID token
        const id_token = googleUser.getAuthResponse().id_token;
        console.log('ID token obtained, configuring AWS credentials');
        
        // Configure AWS credentials
        AWS.config.region = config.region;
        console.log('AWS region set to:', config.region);
        
        console.log('Identity Pool ID:', config.identityPoolId);
        
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: config.identityPoolId,
            Logins: {
                'accounts.google.com': id_token
            }
        });
        
        console.log('AWS credentials created, refreshing...');
        
        // Refresh credentials with detailed error handling
        AWS.config.credentials.refresh((error) => {
            if (error) {
                console.error('Error refreshing AWS credentials:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                alert('Failed to authenticate with AWS. Check console for details.');
            } else {
                console.log('Successfully authenticated with AWS');
                console.log('Identity ID:', AWS.config.credentials.identityId);
                
                // Show pets area
                document.getElementById('petsArea').style.display = 'block';
                console.log('Pets area displayed, loading pet images');
                
                // Load pet images
                loadPetImages();
            }
        });
    } catch (error) {
        console.error('Error in onSignInSuccess:', error);
    }
};

// Override loadPetImages function to add debugging
const originalLoadPetImages = window.loadPetImages;
window.loadPetImages = function() {
    console.log('loadPetImages called');
    
    try {
        const s3 = new AWS.S3();
        console.log('S3 client created');
        
        const params = {
            Bucket: config.privateBucketName
        };
        console.log('Listing objects from bucket:', config.privateBucketName);
        
        s3.listObjects(params, function(err, data) {
            if (err) {
                console.error('Error listing objects in S3:', err);
                console.error('Error details:', JSON.stringify(err, null, 2));
                return;
            }
            
            console.log('S3 listObjects successful, found', data.Contents ? data.Contents.length : 0, 'objects');
            
            const petsContainer = document.getElementById('petsContainer');
            petsContainer.innerHTML = ''; // Clear existing content
            
            if (!data.Contents || data.Contents.length === 0) {
                console.log('No objects found in bucket');
                petsContainer.innerHTML = '<p>No pet images found.</p>';
                return;
            }
            
            // Process each object (image) in the bucket
            let imageCount = 0;
            data.Contents.forEach(function(object) {
                console.log('Processing object:', object.Key);
                
                if (object.Key.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    imageCount++;
                    console.log('Creating signed URL for image:', object.Key);
                    
                    try {
                        const imageUrl = s3.getSignedUrl('getObject', {
                            Bucket: config.privateBucketName,
                            Key: object.Key,
                            Expires: 60 // URL expires in 60 seconds
                        });
                        
                        console.log('Signed URL created successfully');
                        
                        const imgElement = document.createElement('img');
                        imgElement.src = imageUrl;
                        imgElement.alt = 'Pet Image';
                        imgElement.className = 'pet-image';
                        
                        petsContainer.appendChild(imgElement);
                        console.log('Image element added to container');
                    } catch (urlError) {
                        console.error('Error creating signed URL:', urlError);
                    }
                }
            });
            
            console.log('Total images added to page:', imageCount);
        });
    } catch (error) {
        console.error('Error in loadPetImages:', error);
    }
};

console.log('Debug script fully loaded');
