# Amora Dating App - Backend

## Project Structure

```
backend/
├── config/              # Configuration files (database, cloudinary)
├── controllers/         # Business logic for routes
├── middleware/          # Express middleware (auth, error handling)
├── models/             # MongoDB schemas
├── routes/             # API routes
├── utils/              # Utility functions (validators, token utils)
├── views/              # EJS templates
├── uploads/            # Local file uploads (for development)
├── .env                # Environment variables
├── server.js           # Entry point
└── package.json        # Dependencies
```

## Features

- **User Authentication**: JWT-based authentication with cookies
- **Admin Separate Login**: Independent admin authentication system
- **Profile Management**: User profiles with gallery images
- **Image Uploads**: Cloudinary integration for image storage
- **Matches & Likes**: Like system with mutual match detection
- **Messaging**: Real-time chat functionality
- **Security**: Password hashing with bcryptjs, input validation
- **Error Handling**: Centralized error handling middleware

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/amora-dating-app

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key
REFRESH_TOKEN_EXPIRY=30d

# Cookie Configuration
COOKIE_EXPIRY=7

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Start MongoDB

Make sure MongoDB is running on your system.

```bash
# For Windows (if installed as service)
net start MongoDB

# For Mac/Linux
mongod
```

### 4. Run the Server

**Development Mode** (with auto-reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user

### Admin (`/api/admin`)
- `POST /register` - Register admin
- `POST /login` - Admin login
- `POST /logout` - Admin logout
- `GET /me` - Get current admin

### Users (`/api/users`)
- `GET /discovery` - Get discovery feed
- `GET /:id` - Get user profile
- `PUT /:id` - Update user profile
- `POST /:id/profile-picture` - Upload profile picture
- `POST /:id/gallery` - Upload gallery images
- `DELETE /:id/gallery/:imageId` - Delete gallery image
- `POST /:id/block/:blockedUserId` - Block user
- `POST /:id/unblock/:blockedUserId` - Unblock user
- `POST /:id/report/:reportedUserId` - Report user

### Matches (`/api/matches`)
- `POST /like/:userId` - Like a user
- `DELETE /unlike/:userId` - Unlike a user
- `GET /` - Get all matches
- `GET /likes/received` - Get likes received
- `GET /likes/sent` - Get likes sent
- `PUT /:matchId/accept` - Accept match
- `PUT /:matchId/reject` - Reject match

### Messages (`/api/messages`)
- `POST /send/:receiverId` - Send message
- `GET /conversations` - Get all conversations
- `GET /conversation/:userId` - Get conversation with specific user
- `PUT /read/:senderId` - Mark messages as read
- `DELETE /:messageId` - Delete message

## Models

### User Model
- Personal information (name, email, phone, password)
- Profile data (bio, age, gender, interests, etc.)
- Location with geospatial indexing
- Gallery images
- Premium status
- Blocked and reported users list

### Admin Model
- Admin credentials with account locking
- Role-based access (admin, superadmin)
- Login tracking and attempt counting

### Like Model
- Tracks user likes with mutual match detection

### Match Model
- Manages matches between users
- Tracks match status (pending, accepted, rejected)

### Message Model
- Stores chat messages
- Read status tracking
- Image support

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Cookie Security**: HttpOnly, Secure (in production), SameSite flags
- **Input Validation**: Email, phone, password validation
- **Account Locking**: Failed login attempt protection for admin
- **CORS**: Configured for frontend communication
- **MongoDB Indexing**: Efficient queries with proper indexing

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **cloudinary**: Image storage
- **multer**: File upload handling
- **multer-storage-cloudinary**: Cloudinary storage for multer
- **cookie-parser**: Cookie parsing
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **ejs**: Template engine
- **nodemon**: Development auto-reload

## Running Tests

```bash
npm test
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGODB_URI in .env

### Cloudinary Errors
- Verify Cloudinary credentials in .env
- Check file size limits (5MB)

### JWT Errors
- Ensure JWT_SECRET is set correctly
- Check token expiry settings

## License

ISC

## Author

Amora Development Team
