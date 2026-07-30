# Amora Dating App - API Testing Examples

## Base URL
```
http://localhost:5000
```

## Authentication Endpoints

### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "password": "password123",
  "gender": "male",
  "age": 25
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": "60d5ec49c1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "gender": "male"
  }
}
```

### 2. Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### 3. Get Current User
```http
GET /api/auth/me
Authorization: Bearer eyJhbGc...
```

### 4. Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGc...
```

### 5. Refresh Token
```http
POST /api/auth/refresh
```

---

## Admin Endpoints

### 1. Admin Register
```http
POST /api/admin/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@amora.com",
  "password": "admin123",
  "firstName": "Admin",
  "lastName": "User"
}
```

### 2. Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@amora.com",
  "password": "admin123"
}
```

### 3. Get Current Admin
```http
GET /api/admin/me
Authorization: Bearer eyJhbGc...
```

---

## User Profile Endpoints

### 1. Get User Profile
```http
GET /api/users/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
```

### 2. Update User Profile
```http
PUT /api/users/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "bio": "Love traveling and cooking",
  "age": 26,
  "interests": ["travel", "cooking", "music"],
  "relationshipGoal": "serious",
  "height": {
    "value": 180,
    "unit": "cm"
  },
  "bodyType": "athletic",
  "religion": "Christian",
  "education": "Bachelor's Degree",
  "profession": "Software Engineer",
  "smokingStatus": "no",
  "drinkingStatus": "occasionally"
}
```

### 3. Upload Profile Picture
```http
POST /api/users/60d5ec49c1234567890/profile-picture
Authorization: Bearer eyJhbGc...
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="profilePicture"; filename="photo.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary--
```

### 4. Upload Gallery Images
```http
POST /api/users/60d5ec49c1234567890/gallery
Authorization: Bearer eyJhbGc...
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="galleryImages"; filename="photo1.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary
Content-Disposition: form-data; name="galleryImages"; filename="photo2.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary--
```

### 5. Delete Gallery Image
```http
DELETE /api/users/60d5ec49c1234567890/gallery/image_id
Authorization: Bearer eyJhbGc...
```

---

## Discovery Endpoints

### 1. Get Discovery Feed
```http
GET /api/users/discovery
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "users": [
    {
      "_id": "60d5ec49c1234567890",
      "firstName": "Jane",
      "lastName": "Smith",
      "age": 24,
      "gender": "female",
      "bio": "Love hiking and photography",
      "profilePicture": "https://res.cloudinary.com/...",
      "location": {
        "city": "New York",
        "coordinates": {
          "type": "Point",
          "coordinates": [-74.006, 40.7128]
        }
      }
    }
  ]
}
```

---

## Matches & Likes Endpoints

### 1. Like a User
```http
POST /api/matches/like/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
```

**Response (if mutual like):**
```json
{
  "success": true,
  "message": "It's a match!",
  "isMatched": true,
  "match": {
    "_id": "match_id",
    "user1": "your_id",
    "user2": "user_id",
    "status": "accepted",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Unlike a User
```http
DELETE /api/matches/unlike/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
```

### 3. Get All Matches
```http
GET /api/matches
Authorization: Bearer eyJhbGc...
```

### 4. Get Likes Received
```http
GET /api/matches/likes/received
Authorization: Bearer eyJhbGc...
```

### 5. Get Likes Sent
```http
GET /api/matches/likes/sent
Authorization: Bearer eyJhbGc...
```

### 6. Accept Match
```http
PUT /api/matches/match_id/accept
Authorization: Bearer eyJhbGc...
```

### 7. Reject Match
```http
PUT /api/matches/match_id/reject
Authorization: Bearer eyJhbGc...
```

---

## Messaging Endpoints

### 1. Send Message
```http
POST /api/messages/send/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
Content-Type: multipart/form-data

message=Hello! How are you?
[optional: image file]
```

### 2. Get Conversation
```http
GET /api/messages/conversation/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "messages": [
    {
      "_id": "message_id",
      "sender": {
        "_id": "sender_id",
        "firstName": "John",
        "lastName": "Doe",
        "profilePicture": "url"
      },
      "receiver": {
        "_id": "receiver_id",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "message": "Hi there!",
      "image": null,
      "isRead": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 3. Get All Conversations
```http
GET /api/messages/conversations
Authorization: Bearer eyJhbGc...
```

### 4. Mark Messages as Read
```http
PUT /api/messages/read/60d5ec49c1234567890
Authorization: Bearer eyJhbGc...
```

### 5. Delete Message
```http
DELETE /api/messages/message_id
Authorization: Bearer eyJhbGc...
```

---

## Block/Report Endpoints

### 1. Block User
```http
POST /api/users/60d5ec49c1234567890/block/user_to_block_id
Authorization: Bearer eyJhbGc...
```

### 2. Unblock User
```http
POST /api/users/60d5ec49c1234567890/unblock/user_to_unblock_id
Authorization: Bearer eyJhbGc...
```

### 3. Report User
```http
POST /api/users/60d5ec49c1234567890/report/user_to_report_id
Authorization: Bearer eyJhbGc...
```

---

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "password": "password123",
    "gender": "male",
    "age": 25
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -b cookies.txt
```

### Like User
```bash
curl -X POST http://localhost:5000/api/matches/like/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -b cookies.txt
```

### Send Message
```bash
curl -X POST http://localhost:5000/api/messages/send/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "message=Hello there!" \
  -b cookies.txt
```

---

## Testing with Postman

1. Import these endpoints into Postman
2. Set variable `base_url` to `http://localhost:5000`
3. Use `Bearer TOKEN` in Authorization tab
4. Add cookies if needed for session testing

---

## Common Response Codes

- **200**: Success
- **201**: Created/Added
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Server Error

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error description here"
}
```

---

**Happy Testing! 🎉**
