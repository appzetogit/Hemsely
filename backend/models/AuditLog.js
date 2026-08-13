import mongoose from 'mongoose';
import './Admin.js';

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ip: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ admin: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
