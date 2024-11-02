function setupCanvas(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    return canvas;
}


function isImageFile(dataUrl) {
    return dataUrl.match(/image/i);
}


// Function to convert hex to RGB
function hexToRgb(hex) {
    // Remove the hash (#) if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b values from hex
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return { r, g, b };
}

function rgbToHex(array) {
    let r = array.r;
    let g = array.g;
    let b = array.b;
    return (
        "#" +
        ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()
    );
}

// Function to find the matching color ID
function findColorId(hexColor) {
    const rgbColor = hexToRgb(hexColor);

    for (const [id, color] of Object.entries(colours)) {
        // Check if the RGB values match
        if (color.r === rgbColor.r && color.g === rgbColor.g && color.b === rgbColor.b) {
            return Number(id); // Return the ID as a number
        }
    }
    return null; // Return null if no match is found
}


function coloridToHex(colorId) {
    console.log(colorId,colours[colorId])
    return rgbToHex(colours[colorId]);
}

  
function getCookie(key) {
    // Split cookie string into individual cookies
    const cookies = document.cookie.split(';');
    
    // Iterate through each cookie to find the one with the specified key
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        
        // Check if this cookie starts with the specified key
        if (cookie.startsWith(key + '=')) {
            // Return the value of the cookie after the equal sign
            console.log(`Found cookie for key ${key}: ${cookie.substring(key.length + 1)}`);
            return decodeURIComponent(cookie.substring(key.length + 1));
        }
    }

    console.log(`No cookie found for key: ${key}`);
    
    // If no cookie is found, return null or an empty string
    return null;
}

function setCookie(key, value, options = {}) {
    // Create the basic cookie string with the key and encoded value
    let cookieString = encodeURIComponent(key) + '=' + encodeURIComponent(value);
    
    // Add optional parameters like path, domain, expires, etc.
    if (options.expires instanceof Date) {
        cookieString += '; expires=' + options.expires.toUTCString();
    }
    if (options.path) {
        cookieString += '; path=' + options.path;
    }
    if (options.domain) {
        cookieString += '; domain=' + options.domain;
    }
    if (options.secure) {
        cookieString += '; secure';
    }
    if (options.sameSite) {
        cookieString += '; sameSite=' + options.sameSite;
    }
    
    // Set the cookie in the document.cookie property
    document.cookie = cookieString;
    console.log(`set cookie ${key}=${value}`);
}