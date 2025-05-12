import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})

import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,                    
        api_secret: process.env.CLOUDINARY_API_SECRET
      
    });
    const uploadOnCloudinary = async (filePath) => {
        try{
            if(!filePath) return null
            //uploading file to cloudinary
            const response = await cloudinary.uploader.upload(filePath, {
             resource_type: "auto"
            })
            //file has been uploaded
            // console.log("file is uploaded to cloudinary", response.url)
            fs.unlinkSync(filePath)//deleting file from local storage
            return response;
           

        }catch (error) {
            console.log("file not uploaded to cloudinary", error)
            fs.unlinkSync(filePath)//deleting file from local storage as upload failed
        }
    }

export { uploadOnCloudinary }