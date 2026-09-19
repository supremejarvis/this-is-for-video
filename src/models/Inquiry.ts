import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInquiry extends Document {
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  gstin?: string;
  solarCapacityKw?: number;
  pincode: string;
  city?: string;
  state?: string;
  message?: string;
  inquiryType: 'SOLAR_CONTRACTOR' | 'BULK_PURCHASE' | 'GENERAL_INQUIRY' | 'SIZE_VERIFICATION';
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    solarCapacityKw: {
      type: Number,
      min: 0,
      default: 0,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit postal pincode'],
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    inquiryType: {
      type: String,
      enum: ['SOLAR_CONTRACTOR', 'BULK_PURCHASE', 'GENERAL_INQUIRY', 'SIZE_VERIFICATION'],
      default: 'GENERAL_INQUIRY',
    },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'QUOTED', 'CLOSED'],
      default: 'NEW',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent recompilation in Next.js HMR
export const Inquiry: Model<IInquiry> =
  mongoose.models.Inquiry || mongoose.model<IInquiry>('Inquiry', InquirySchema);

export default Inquiry;
