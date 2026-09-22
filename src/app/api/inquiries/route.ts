import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface InquiryRecord {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

const INQUIRIES_FILE = path.join(process.cwd(), '.planning', 'inquiries.json');

function loadInquiries(): InquiryRecord[] {
  try {
    if (fs.existsSync(INQUIRIES_FILE)) {
      const data = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Fallback to empty list on read error
  }
  return [];
}

function saveInquiries(inquiries: InquiryRecord[]): void {
  try {
    const dir = path.dirname(INQUIRIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries.slice(0, 500), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist inquiry:', err);
  }
}

export async function GET() {
  const inquiries = loadInquiries();
  return NextResponse.json({
    success: true,
    count: inquiries.length,
    data: inquiries,
    timestamp: new Date().toISOString(),
  });
}

export function validateInquiryInput(body: any): { valid: boolean; error?: string } {
  const name = String(body?.name || '').trim();
  const phone = String(body?.phone || '').replace(/\D/g, '');
  const pincode = String(body?.pincode || '').trim();

  if (!name || name.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters.' };
  }

  if (phone.length < 10) {
    return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }

  if (pincode && !/^\d{6}$/.test(pincode)) {
    return { valid: false, error: 'Please enter a valid 6-digit postal pincode.' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateInquiryInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '');
    const pincode = String(body.pincode || '').trim();

    const newInquiry: InquiryRecord = {
      id: `INQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name,
      phone,
      email: body.email ? String(body.email).trim() : '',
      companyName: body.companyName ? String(body.companyName).trim() : '',
      gstin: body.gstin ? String(body.gstin).trim().toUpperCase() : '',
      solarCapacityKw: Number(body.solarCapacityKw || 0),
      pincode: pincode || '382430',
      city: body.city ? String(body.city).trim() : '',
      state: body.state ? String(body.state).trim() : '',
      message: body.message ? String(body.message).trim() : '',
      inquiryType: body.inquiryType || 'GENERAL_INQUIRY',
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const inquiries = loadInquiries();
    inquiries.unshift(newInquiry);
    saveInquiries(inquiries);

    return NextResponse.json(
      {
        success: true,
        message: 'Inquiry registered successfully in Apollo Engineering Call Desk queue.',
        data: newInquiry,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to submit inquiry',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}
