const CryptoJS = require('crypto-js');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.SECRET_ENC_KEY;

function encrypt(text){
     // Convert key and generate IV
     const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)); // Ensure 32-byte key
     const iv = CryptoJS.lib.WordArray.random(16); // 16-byte IV
     
     const encrypted = CryptoJS.AES.encrypt(text,key,{
        iv:iv,
        mode:CryptoJS.mode.CBC,
        padding:CryptoJS.pad.Pkcs7
     })
     // Return IV + ciphertext in hex format
    return iv.toString() + ':' + encrypted.toString();
}

function decrypt(text){
    // Split IV and ciphertext
    const parts = text.split(':');
    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const encrypted = parts[1];

    // Convert key
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}


module.exports = {
    encrypt,
    decrypt
}