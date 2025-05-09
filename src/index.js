// require('dotenv').config(({path:'./env'}))
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { connect } from "mongoose";


dotenv.config({
    path:'./env'
})


connectDB()
.then(() => {
  app.on("error",(error) => {
        console.log("ERROR :",error);
         throw error
       })

  app.listen(process.env.PORT||8000,() => {
    console.log(`server is running at port:${process.env.PORT}`);
})
  
}
)
.catch((error) => {
  console.log("MONGO db connection failed !!!",error)
}
)








































/*

-->if we want to write connect DB function in index file itself
import express from "express";

const app = express()


//dbconnect function
//IIFE function
;(async ()=>{

    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
     
     
       app.on("error",(error) => {
        console.log("ERROR :",error);
         throw error
       })
       
       app.listen(process.env.PORT,()=>{
        console.log(`App is listening on pot ${process.env.PORT}`)
       })


    }catch(error){
        console.log("ERROR:",error)

    }
})()
*/