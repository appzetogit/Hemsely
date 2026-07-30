#!/bin/bash

# Amora Dating App - Backend Quick Setup Script
# This script helps configure your backend environment

echo "========================================="
echo "Amora Dating App - Backend Setup Guide"
echo "========================================="
echo ""

echo "📋 Prerequisites - Make sure you have:"
echo "   1. MongoDB running (local or Atlas)"
echo "   2. Cloudinary account created"
echo "   3. Node.js and npm installed"
echo ""

echo "🔑 Configuration Steps:"
echo ""
echo "1️⃣  Edit the .env file with your credentials:"
echo "   nano .env    (or use your favorite editor)"
echo ""

echo "2️⃣  Required credentials to fill in .env:"
echo ""
echo "   MongoDB URI:"
echo "   - Local: mongodb://localhost:27017/amora-dating-app"
echo "   - Atlas: mongodb+srv://username:password@cluster.mongodb.net/amora-dating-app"
echo ""

echo "   JWT Secrets (generate using):"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""

echo "   Cloudinary Credentials:"
echo "   - Visit: https://cloudinary.com/console"
echo "   - Copy: Cloud Name, API Key, API Secret"
echo ""

echo "3️⃣  Generate Strong Secrets:"
echo ""
echo "   For JWT_SECRET:"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "   For REFRESH_TOKEN_SECRET:"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
echo ""

echo "4️⃣  Start the backend:"
echo "   npm run dev    (development with auto-reload)"
echo "   npm start      (production)"
echo ""

echo "5️⃣  Create Admin User:"
echo "   POST http://localhost:5000/api/admin/register"
echo "   Body: {"
echo "     \"username\": \"admin\","
echo "     \"email\": \"admin@amora.com\","
echo "     \"password\": \"strong_password\","
echo "     \"firstName\": \"Admin\","
echo "     \"lastName\": \"User\""
echo "   }"
echo ""

echo "✅ Setup complete! Backend is ready to run."
echo ""
echo "📚 For detailed documentation, see:"
echo "   - README.md"
echo "   - SETUP_COMPLETE.md"
