import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { Inquiry } from '@/models/Inquiry';

export async function GET() {
  try {
    await connectToDatabase();
    const inquiries = await Inquiry.find({}).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({
      success: true,
      count: inquiries.length,
      data: inquiries,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to connect to MongoDB / retrieve inquiries',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const newInquiry = await Inquiry.create({
      name: body.name,
      phone: body.phone,
      email: body.email || '',
      companyName: body.companyName || '',
      gstin: body.gstin || '',
      solarCapacityKw: Number(body.solarCapacityKw || 0),
      pincode: body.pincode,
      city: body.city || '',
      state: body.state || '',
      message: body.message || '',
      inquiryType: body.inquiryType || 'GENERAL_INQUIRY',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Inquiry submitted successfully via Mongoose',
        data: newInquiry,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to submit inquiry via Mongoose',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}
