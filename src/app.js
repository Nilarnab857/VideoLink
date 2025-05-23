import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app  = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
   credentials: true,
}))





//json ke data ko samjhne ke liye
app.use(express.json({limit:"32kb"}))
//form data ko samjhne ke liye
app.use(express.urlencoded({extended:true, limit:"32kb"}))
//to store public files like images, css, js etc
app.use(express.static("public"))
//to parse cookies from the request
app.use(cookieParser())


//import routes 
import userRouter from "./routes/user.routes.js"

// declare routes
app.use("/api/v1/users", userRouter)

export {app}