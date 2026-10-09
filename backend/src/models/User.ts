/**
 * User Model - Phase 1 Feature #12: Basic Security & Privacy
 *
 * Represents a user account with authentication and privacy settings
 */

// TODO: Install required dependencies
// TODO: npm install bcrypt @types/bcrypt
// TODO: npm install jsonwebtoken @types/jsonwebtoken

// TODO: Import required dependencies
// import mongoose, { Schema, Document } from 'mongoose';
// import bcrypt from 'bcrypt';

/**
 * User document interface
 */

// TODO: Define IUser interface
// export interface IUser extends Document {
//   id: string;
//   email: string;
//   passwordHash: string;
//   username: string;
//
//   // Profile
//   firstName?: string;
//   lastName?: string;
//   avatarUrl?: string;
//
//   // Account status
//   isEmailVerified: boolean;
//   isActive: boolean;
//
//   // Metadata
//   createdAt: Date;
//   updatedAt: Date;
//   lastLoginAt?: Date;
//
//   // Methods
//   comparePassword(candidatePassword: string): Promise<boolean>;
// }

/**
 * User Schema Definition
 */

// TODO: Create UserSchema
// const UserSchema: Schema = new Schema({
//   id: { type: String, required: true, unique: true },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true
//   },
//   passwordHash: { type: String, required: true },
//   username: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true
//   },
//
//   // Profile
//   firstName: String,
//   lastName: String,
//   avatarUrl: String,
//
//   // Account status
//   isEmailVerified: { type: Boolean, default: false },
//   isActive: { type: Boolean, default: true },
//
//   // Metadata
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
//   lastLoginAt: Date
// });

// TODO: Add pre-save middleware to hash password
// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('passwordHash')) {
//     return next();
//   }
//
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
//     next();
//   } catch (error) {
//     next(error as any);
//   }
// });

// TODO: Add method to compare passwords
// UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.passwordHash);
// };

// TODO: Add method to generate auth token
// UserSchema.methods.generateAuthToken = function(): string {
//   // TODO: Implement JWT token generation
//   // const jwt = require('jsonwebtoken');
//   // return jwt.sign({ userId: this.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
// };

// TODO: Export the User model
// export default mongoose.model<IUser>('User', UserSchema);
