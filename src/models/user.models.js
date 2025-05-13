import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,//FOR OPTIMISED SEARCHING
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,

        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,//cloudinary url
            required: true,
        },
        coverImage: {
            type: String,//cloudinary url
            
        },
        watchHistory:[
         { 
              type:Schema.Types.ObjectId,
              ref:"Video",
         }
        ],
        password: {
            type: String,
            required: [true, "Password is required"],
            // select: false,
        },
        refreshToken: {
            type: String,
            // select: false,//to not show refresh token in the response
        },

}, {timestamps: true});

userSchema.pre("save",async function(next){
if(!this.isModified("password"))return next();
    this.password =  await bcrypt.hash(this.password, 10);
    next();//im done with this middleware, go to the next one
})

userSchema.methods.isPasswordCorrect = async function
(password){
    //logic for checking password
    return await bcrypt.compare(password, this.password);//await as cryptography algo takes time
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            username:this.username, 
            email:this.email,
            fullname:this.fullname,

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}

// export const User = mongoose.model("User", userSchema);
export const User = mongoose.models.User || mongoose.model("User", userSchema);
