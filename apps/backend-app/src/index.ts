import express from 'express';
// import dotenv from 'dotenv';
import 'dotenv/config'; 
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoute.js';
import listingRouter from './routes/listingRoute.js';
import zoneRouter from './routes/zoneRoute.js';
import staffRouter from './routes/staffRoute.js';
import userRouter from './routes/userRoute.js';
import testRouter from './routes/testRouter.js';
import leadRouter from './routes/leadRoute.js';
import notificationRouter from './routes/notificationRoute.js';

// dotenv.config();

console.log(process.env.JWT_SECRET);

const PORT = process.env.PORT || 4000;

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3000",
  "http://localhost:3002",
  "http://192.168.2.249:3000",
  "http://192.168.2.249:3001",
  "https://ekpratishat.com",
  "https://www.ekpratishat.com",
  "https://admin.ekpratishat.com",
  "https://partner.ekpratishat.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/auth", authRouter);
app.use("/listing", listingRouter);
app.use("/zone", zoneRouter);
app.use("/staff", staffRouter);
app.use("/users", userRouter);
// app.use("/test", testRouter);
app.use("/lead", leadRouter);
app.use("/notifications", notificationRouter);


app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`)
})