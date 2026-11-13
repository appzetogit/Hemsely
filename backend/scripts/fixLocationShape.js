// One-off: repair users whose location.coordinates was saved as a bare [lng, lat] array
// (breaks every user.save() with "Cannot create field 'coordinates'"). Run: node scripts/fixLocationShape.js
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';

await connectDB();
const res = await mongoose.connection.collection('users').updateMany(
  { 'location.coordinates.0': { $type: 'number' } },
  // Replace whole `location` — a dotted $set on an array field maps over its elements.
  [{ $set: { location: { $mergeObjects: ['$location', { coordinates: { type: 'Point', coordinates: '$location.coordinates' } }] } } }]
);
console.log(`Fixed ${res.modifiedCount} user(s)`);
await mongoose.connection.close();
