package com.odly

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream

class AssetCopyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "AssetCopyModule"
    }
    
    @ReactMethod
    fun copyAssetToInternalStorage(assetPath: String, destinationPath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val inputStream: InputStream = context.assets.open(assetPath)
            val outputFile = File(destinationPath)
            
            // Create parent directory if it doesn't exist
            outputFile.parentFile?.mkdirs()
            
            val outputStream: OutputStream = FileOutputStream(outputFile)
            
            // Copy file in chunks to handle large files efficiently
            val buffer = ByteArray(8192) // 8KB buffer
            var bytesRead: Int
            var totalBytesCopied = 0L
            
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
                totalBytesCopied += bytesRead
                
                // Log progress for large files (every 10MB)
                if (totalBytesCopied % (10 * 1024 * 1024) == 0L) {
                    Log.d("AssetCopyModule", "Copied ${totalBytesCopied / (1024 * 1024)}MB...")
                }
            }
            
            outputStream.flush()
            outputStream.close()
            inputStream.close()
            
            val fileSizeMB = totalBytesCopied / (1024.0 * 1024.0)
            Log.d("AssetCopyModule", "Successfully copied $assetPath to $destinationPath (${String.format("%.1f", fileSizeMB)}MB)")
            
            promise.resolve(destinationPath)
        } catch (e: Exception) {
            Log.e("AssetCopyModule", "Error copying asset: ${e.message}", e)
            promise.reject("COPY_ERROR", "Failed to copy asset: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun assetExists(assetPath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val inputStream: InputStream? = try {
                context.assets.open(assetPath)
            } catch (e: Exception) {
                null
            }
            
            if (inputStream != null) {
                inputStream.close()
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e("AssetCopyModule", "Error checking asset: ${e.message}", e)
            promise.reject("CHECK_ERROR", "Failed to check asset: ${e.message}", e)
        }
    }
}

