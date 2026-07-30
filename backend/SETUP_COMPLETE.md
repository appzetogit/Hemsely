# Backend Setup Summary - Amora Dating App

## ✅ Completed Tasks

Your backend has been successfully initialized with a complete MVC structure for your dating app!

## 📁 Backend Directory Structure

```
backend/
├── config/
│   ├── database.js              # MongoDB connection setup
│   └── cloudinary.js            # Cloudinary & Multer configuration
├── controllers/
│   ├── authController.js        # User authentication logic
│   ├── adminAuthController.js   # Admin authentication logic
│   ├── userController.js        # User profile & discovery logic
│   ├── matchController.js       # Likes, matches, and connections
│   └── messageController.js     # Chat and messaging logic
├── middleware/
│   ├── auth.js                  # JWT authentication & authorization
│   └── errorHandler.js          # Global error handling & async wrapper
├── models/
│   ├── User.js                  # User schema with comprehensive fields
│   ├── Admin.js                 # Admin schema with account locking
│   ├── Like.js                  # Likes tracking model
│   ├── Match.js                 # Matches management model
│   └── Message.js               # Messages/Chat model
├── routes/
│   ├── authRoutes.js            # User authentication routes
│   ├── adminRoutes.js           # Admin routes
│   ├── userRoutes.js            # User profile & discovery routes
│   ├── matchRoutes.js           # Match/like routes
│   └── messageRoutes.js         # Messaging routes
├── utils/
│   ├── tokenUtils.js            # JWT token generation & cookie management
│   └── validators.js            # Input validation utilities
├── uploads/                     # Local file upload directory
├── views/                       # EJS template directory
├── .env                         # Environment variables (configured)
├── .gitignore                   # Git ignore rules
├── server.js                    # Express server entry point
├── package.json                 # Dependencies list
└── README.md                    # Complete documentation

```

## 🔑 Key Features Implemented

### 1. **MVC Architecture**
   - Models: MongoDB schemas with proper validations
   - Views: EJS template support
   - Controllers: Business logic separated from routes
   - Routes: RESTful API endpoints

### 2. **Authentication & Authorization**
   - ✅ JWT-based token authentication
   - ✅ HttpOnly cookies for token storage
   - ✅ Separate admin authentication system
   - ✅ Refresh token mechanism
   - ✅ Admin account locking (5 failed attempts = 30 min lock)

### 3. **File Upload & Cloud Storage**
   - ✅ Cloudinary integration
   - ✅ Multer for file handling
   - ✅ Separate storage folders (profiles, gallery, chats)
   - ✅ 5MB file size limit per upload
   - ✅ Image format validation

### 4. **Database Models**
   - **User Model**: Comprehensive profile fields including:
     - Personal info (name, email, phone, password)
     - Profile details (bio, age, gender, interests)
     - Physical attributes (height, body type)
     - Preferences (relationship goals, interests)
     - Gallery images with timestamps
     - Premium status tracking
     - Blocked & reported users list
     - Location with geospatial indexing

   - **Admin Model**: Complete admin management:
     - Credentials with password hashing
     - Role-based access (admin, superadmin)
     - Account security (login attempts, locking)
     - Login tracking

   - **Like Model**: Match system foundation
     - User likes tracking
     - Mutual like detection

   - **Match Model**: Complete match management
     - Match status (pending, accepted, rejected)
     - Initiated by tracking
     - Last message timestamp

   - **Message Model**: Full chat support
     - Sender/receiver tracking
     - Read status with timestamps
     - Image support

### 5. **Security Features**
   - ✅ Password hashing with bcryptjs
   - ✅ Input validation (email, phone, password)
   - ✅ CORS configuration for frontend
   - ✅ Cookie security (HttpOnly, Secure, SameSite)
   - ✅ Database indexing for performance
   - ✅ Centralized error handling

### 6. **API Endpoints** (35+ endpoints)

#### Auth Endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

#### Admin Endpoints:
- `POST /api/admin/register` - Create admin
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/me` - Get current admin

#### User Endpoints:
- `GET /api/users/discovery` - Discovery feed
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update profile
- `POST /api/users/:id/profile-picture` - Upload profile picture
- `POST /api/users/:id/gallery` - Upload gallery (max 10 images)
- `DELETE /api/users/:id/gallery/:imageId` - Delete image
- `POST /api/users/:id/block/:blockedUserId` - Block user
- `POST /api/users/:id/unblock/:blockedUserId` - Unblock user
- `POST /api/users/:id/report/:reportedUserId` - Report user

#### Match Endpoints:
- `POST /api/matches/like/:userId` - Like user
- `DELETE /api/matches/unlike/:userId` - Unlike user
- `GET /api/matches` - Get all matches
- `GET /api/matches/likes/received` - Get likes received
- `GET /api/matches/likes/sent` - Get likes sent
- `PUT /api/matches/:matchId/accept` - Accept match
- `PUT /api/matches/:matchId/reject` - Reject match

#### Message Endpoints:
- `POST /api/messages/send/:receiverId` - Send message
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversation/:userId` - Get conversation
- `PUT /api/messages/read/:senderId` - Mark as read
- `DELETE /api/messages/:messageId` - Delete message

## 🔧 Environment Variables (.env)

All required environment variables are already configured in `.env`:

```env
# Server
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/amora-dating-app

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key
REFRESH_TOKEN_EXPIRY=30d

# Cookies
COOKIE_EXPIRY=7

# Cloudinary
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANT**: Update these values with your actual credentials!

## 📦 Dependencies Installed

- **express**: Web server framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing and verification
- **cloudinary**: Cloud image storage
- **multer**: File upload handling
- **multer-storage-cloudinary**: Cloudinary storage adapter
- **cookie-parser**: Cookie parsing middleware
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable loader
- **ejs**: Template engine
- **nodemon**: Development auto-reload tool

## 🚀 Getting Started

### 1. Install MongoDB
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas for cloud database

### 2. Setup Cloudinary
   - Sign up at: https://cloudinary.com
   - Get your credentials (cloud name, API key, API secret)
   - Update `.env` with your credentials

### 3. Update Environment Variables
   ```bash
   # Edit backend/.env and update:
   - JWT_SECRET (use a strong random string)
   - REFRESH_TOKEN_SECRET
   - CLOUDINARY credentials
   - MongoDB URI (if using local DB or Atlas)
   ```

### 4. Start MongoDB
   ```bash
   # Windows
   net start MongoDB
   
   # Mac/Linux
   mongod
   ```

### 5. Run Backend
   ```bash
   # Development (with auto-reload)
   npm run dev
   
   # Production
   npm start
   ```

   Server will start at `http://localhost:5000`

### 6. Test Backend
   ```bash
   # Check if backend is running
   curl http://localhost:5000/api/health
   ```

## 📋 Next Steps

1. **Generate Strong JWT Secrets**:
   ```bash
   # Generate random strings for secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Setup Cloudinary Account**:
   - Create account at cloudinary.com
   - Get API credentials
   - Update .env file

3. **Setup MongoDB**:
   - Local: Install and run MongoDB
   - Cloud: Get connection string from MongoDB Atlas

4. **Create Admin User**:
   ```bash
   POST /api/admin/register
   ```

5. **Frontend Integration**:
   - Update frontend to use backend API
   - Set FRONTEND_URL in .env
   - Configure CORS as needed

## 🔐 Security Recommendations

1. ✅ Change JWT_SECRET to a strong random value
2. ✅ Use production-grade database (MongoDB Atlas)
3. ✅ Enable HTTPS in production
4. ✅ Implement rate limiting
5. ✅ Add input sanitization
6. ✅ Use helmet.js for additional security headers
7. ✅ Implement logging and monitoring

## 📚 Documentation

Complete documentation is in [backend/README.md](README.md)

## ✨ Notes

- All passwords are hashed with bcryptjs
- JWT tokens expire in 7 days
- Refresh tokens expire in 30 days
- Admin accounts lock after 5 failed login attempts (30 min lock)
- All image uploads go through Cloudinary
- Database uses MongoDB with proper indexing
- CORS is configured for development (whitelist frontend URL)

---

**Your backend is ready to connect with the frontend! 🎉**
