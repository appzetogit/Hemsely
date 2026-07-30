import mongoose from 'mongoose';
import dns from 'dns';

// Fix Node.js DNS ETIMEOUT issues with mongodb+srv on Windows/local networks
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
  if (dns.setServers) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  }
} catch {
  // Ignore if custom DNS servers cannot be set in environment
}

const directAtlasUri = 'mongodb://hemselyapp_db_user:cEzwTAX8OnFvBCLf@ac-qhxacfg-shard-00-00.2nsi8wq.mongodb.net:27017,ac-qhxacfg-shard-00-01.2nsi8wq.mongodb.net:27017,ac-qhxacfg-shard-00-02.2nsi8wq.mongodb.net:27017/hemsely?ssl=true&authSource=admin';

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_FALLBACK_URI || process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/hemsely';

  const urisToTry = [primaryUri, directAtlasUri, fallbackUri].filter(Boolean);

  for (const uri of urisToTry) {
    try {
      const conn = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '50', 10),
        minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5', 10),
        socketTimeoutMS: 45000,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Clean up legacy non-sparse email index if present
      try {
        const db = conn.connection.db;
        const indexes = await db.collection('users').indexes();
        const emailIdx = indexes.find((idx) => idx.name === 'email_1' || idx.key?.email);
        if (emailIdx && !emailIdx.sparse) {
          await db.collection('users').dropIndex(emailIdx.name);
          console.log('🧹 Cleaned up legacy non-sparse email index from MongoDB');
        }
      } catch {
        // Ignore index check errors if collection is fresh
      }

      return conn;
    } catch (error) {
      console.warn(`⚠️ Connection attempt failed for ${uri.substring(0, 35)}... : ${error.message}`);
    }
  }

  console.error('\n======================================================');
  console.error('❌ MONGODB CONNECTION ERROR DIAGNOSIS');
  console.error('Could not connect to any servers in your MongoDB cluster.');
  console.error('======================================================\n');
};

export default connectDB;
