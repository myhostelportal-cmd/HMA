import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface HostelData {
  hostel_name: string;
  hostel_address: string;
  city: string;
  state: string;
  pincode?: string;
  phone_number: string;
  whatsapp_number?: string;
  email?: string;
  website?: string;
  gst_number?: string;
  owner_name?: string;
  manager_name?: string;
  warden_name?: string;
  emergency_contact?: string;
  registration_number?: string;
}

interface StudentData {
  student_id: number;
  name: string;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  gender?: string;
  status: string;
  room_number?: string;
  room_type?: string;
  floor?: string;
  joining_date: string;
  student_photo?: string;
  room_capacity?: number;
  details?: {
    college_name?: string;
    course_name?: string;
    year?: string;
    address?: string;
    aadhaar_number?: string;
    parent_name?: string;
    parent_relation?: string;
    parent_phone?: string;
    room_category?: string;
  };
}

interface RoomData {
  room_number: string;
  floor: string;
  room_type: string;
  capacity: number;
  current_occupancy: number;
  bed_number?: string;
  allocation_date?: string;
  block_name?: string;
  room_status?: string;
}

interface FeeData {
  security_deposit: number;
  monthly_fee: number;
  total_due: number;
  total_paid: number;
  outstanding_balance: number;
  payment_completion_percent?: number;
  total_session_fees?: number;
}

interface FeeRecord {
  fee_id: number;
  student_id: number;
  hostel_id: number;
  amount: string;
  paid_amount: string;
  adjustment_amount: string;
  due_date: string;
  status: 'paid' | 'unpaid' | 'pending' | 'partial';
  fee_type: 'monthly' | 'installment' | 'one-time' | 'remaining' | 'advance_payment';
  advance_status?: 'unadjusted' | 'adjusted';
  advance_balance?: string;
  payment_source?: 'DIRECT' | 'ADVANCE_ADJUSTED';
  adjusted_from_advance?: boolean;
  installment_name?: string;
  month?: string;
  period_start: string;
  period_end?: string;
  receipt_id?: string;
  transaction_id?: string;
  payment_date?: string;
  payment_method?: string;
  remarks?: string;
  month_type?: 'Running' | 'Advance' | 'Past';
  associated_payments?: Array<{
    payment_id: number;
    amount: string;
    payment_method: string;
    transaction_id: string;
    receipt_id: string;
    actual_payment_date: string;
    remarks: string;
    status: string;
  }>;
}

const generateDocumentId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${timestamp}-${random}`;
};

const formatCurrency = (val: any) => {
  if (val === null || val === undefined || val === '') return '';
  const amount = parseFloat(val);
  
  // Get decimal count, max 2
  let decimalCount = 0;
  const strVal = String(val);
  if (strVal.includes('.')) {
    decimalCount = Math.min(strVal.split('.')[1].length, 2);
  }
  
  // Use toLocaleString with Indian numbering, preserve decimals up to 2
  let formatted = amount.toLocaleString('en-IN', { 
    minimumFractionDigits: decimalCount, 
    maximumFractionDigits: 2 
  });
  return "Rs. " + formatted;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const generateAdmissionContract = async (
  hostel: HostelData,
  student: StudentData,
  room?: RoomData,
  fees?: FeeData,
  existingFees?: FeeRecord[]
) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const primaryColor: [number, number, number] = [10, 30, 80]; // Very Dark Blue for header
  const cardPrimary: [number, number, number] = [45, 80, 120]; // Darker blue for cards
  const accentColor: [number, number, number] = [40, 140, 100]; // Green accent
  const orangeAccent: [number, number, number] = [220, 120, 50]; // Orange accent
  const documentId = generateDocumentId();
  const generationDate = new Date();

  let currentPage = 1;

  const addPageHeader = () => {
    // Header - left: Hostel name + Form number
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 12, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(hostel.hostel_name || "Hostel Management", 10, 8);
    
    // Form number on right
    const formNumber = `FORM-${student.student_id}`;
    const formNumWidth = doc.getTextWidth(formNumber);
    doc.setFontSize(8);
    doc.text(formNumber, pageWidth - 10 - formNumWidth, 8);
    
    // Footer
    doc.setFillColor(245, 248, 250);
    doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    const footerTextLeft = `Generated by ${hostel.hostel_name || "Hostel ERP"} • ${generationDate.toLocaleString()}`;
    const footerTextRight = "System Verified • Authentic Document";
    doc.text(footerTextLeft, 10, pageHeight - 3);
    doc.text(footerTextRight, pageWidth - 10 - doc.getTextWidth(footerTextRight), pageHeight - 3);

    currentPage++;
  };

  // =====================
  // PAGE 1: COVER + COMPLETE AGREEMENT
  // =====================
  addPageHeader();

  // Very Dark Blue Header Section (Eye-catching)
  let y = 18;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 12, pageWidth, 48, "F");
  y += 5;

  // Hostel Logo Placeholder
  doc.setFillColor(255, 255, 255);
  doc.circle(30, y + 14, 13, "F");
  doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const hostelInitials = (hostel.hostel_name || "HM").substring(0, 2).toUpperCase();
  doc.text(hostelInitials, 26, y + 18, { align: "center" });

  // Hostel Name and Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(hostel.hostel_name || "Hostel Management System", 50, y + 9);
  doc.setFontSize(17);
  doc.text("OFFICIAL ACCOMMODATION AGREEMENT", 50, y + 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hostel Admission Contract & Terms of Service", 50, y + 28);

  // Contract Introduction
  y = 64;
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginLeft, y, pageWidth - marginLeft - marginRight, 17, 4, 4, "FD");
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8.5);
  const introText =
    "This is a legally binding agreement between the hostel management and the resident student for hostel accommodation and related services. All parties must read and understand all terms and conditions before signing.";
  doc.text(introText, marginLeft + 6, y + 4.5, { maxWidth: pageWidth - marginLeft - marginRight - 12, align: "justify" });

  // =====================
  // STUDENT DETAILS - LEFT SIDE
  // =====================
  y += 23;
  const leftColWidth = (pageWidth / 2) - 16;
  
  // Student Photo + Info Card (Fixed height, no overlap)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(marginLeft, y, leftColWidth, 42, 4, 4, "FD");
  
  // Photo
  doc.setFillColor(235, 242, 250);
  doc.roundedRect(marginLeft + 5, y + 5, 32, 32, 3, 3, "F");
  doc.setFontSize(17);
  doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.text(student.name.charAt(0).toUpperCase(), marginLeft + 21, y + 25, { align: "center" });

  // Student Name
  doc.setTextColor(25, 25, 25);
  doc.setFontSize(13);
  doc.text(student.name, marginLeft + 42, y + 14);
  
  // Gender
  doc.setFontSize(8);
  doc.setFillColor(235, 242, 250);
  doc.roundedRect(marginLeft + 42, y + 17, 32, 6, 2, 2, "F");
  doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.text(student.gender ? student.gender.toUpperCase() : "", marginLeft + 58, y + 21, { align: "center" });
  
  // Student ID
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`ID: #${student.student_id}`, marginLeft + 42, y + 33);

  // =====================
  // ROOM ASSIGNED - RIGHT SIDE (Perfect alignment)
  // =====================
  const rightColStart = (pageWidth / 2) + 6;
  doc.setFillColor(235, 250, 242);
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(rightColStart, y, leftColWidth, 42, 4, 4, "FD");
  
  const roomYStart = y + 6;
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ROOM ASSIGNED", rightColStart + 7, roomYStart);
  
  // Room + Seat number (like 101A)
  doc.setFontSize(15);
  const seatNumber = `${student.room_number || "101"}${student.gender?.startsWith('M') ? 'A' : 'B'}`;
  doc.text(seatNumber, rightColStart + 7, roomYStart + 8);
  
  // Room type + Floor
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.setFont("helvetica", "bold");
  doc.text("TYPE:", rightColStart + 7, roomYStart + 15);
  doc.text("FLOOR:", rightColStart + 52, roomYStart + 15);
  doc.setFont("helvetica", "normal");
  doc.text(student.room_type || student.details?.room_category || "", rightColStart + 7, roomYStart + 21);
  doc.text(student.floor || "", rightColStart + 52, roomYStart + 21);
  
  // Joining Date (Highlighted)
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(rightColStart + 7, roomYStart + 24, 80, 7, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("JOINING DATE:", rightColStart + 12, roomYStart + 28.5);
  doc.text(formatDate(student.joining_date), rightColStart + 50, roomYStart + 28.5);

  // =====================
  // THREE INFO CARDS (Perfectly aligned horizontal)
  // =====================
  const cardsYStart = y + 50;
  const cardWidth = (pageWidth - marginLeft - marginRight - 12) / 3;
  const cardHeight = 50;

  // Card 1: Identification
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(marginLeft, cardsYStart, cardWidth, cardHeight, 4, 4, "FD");
  
  // Card header
  doc.setFillColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.rect(marginLeft, cardsYStart, cardWidth, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICATION", marginLeft + cardWidth/2, cardsYStart + 6, { align: "center" });
  
  let cardY = cardsYStart + 15;
  // Contact Number
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT:", marginLeft + 7, cardY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(student.phone, marginLeft + 7, cardY + 5);
  
  cardY += 9;
  // WhatsApp
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(70, 70, 70);
  doc.text("WHATSAPP:", marginLeft + 7, cardY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(9);
  doc.text(student.whatsapp_number || student.phone, marginLeft + 7, cardY + 5);
  
  cardY += 9;
  // Aadhar
  doc.setFillColor(235, 242, 250);
  doc.roundedRect(marginLeft + 7, cardY, cardWidth - 14, 9, 2, 2, "F");
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("AADHAR:", marginLeft + 9, cardY + 4);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(student.details?.aadhaar_number || "", marginLeft + 34, cardY + 4);

  // Card 2: Address & Guardian - SAME Y START
  const card2X = marginLeft + cardWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(card2X, cardsYStart, cardWidth, cardHeight, 4, 4, "FD");
  
  // Card header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(card2X, cardsYStart, cardWidth, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("GUARDIAN DETAILS", card2X + cardWidth/2, cardsYStart + 6, { align: "center" });
  
  let card2Y = cardsYStart + 15;
  // Email
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("EMAIL:", card2X + 7, card2Y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8.5);
  doc.text(student.email || "", card2X + 7, card2Y + 5);
  
  card2Y += 9;
  // Guardian Name
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("GUARDIAN:", card2X + 7, card2Y);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(student.details?.parent_name || "", card2X + 7, card2Y + 5);
  
  card2Y += 5;
  // Relation
  doc.setFillColor(235, 250, 242);
  doc.roundedRect(card2X + 7, card2Y + 5, 48, 6, 2, 2, "F");
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(student.details?.parent_relation?.toUpperCase() || "", card2X + 31, card2Y + 9, { align: "center" });
  
  card2Y += 11;
  // Guardian Contact
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT:", card2X + 7, card2Y);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(student.details?.parent_phone || "", card2X + 7, card2Y + 5);

  // Card 3: Academic Info - SAME Y START
  const card3X = marginLeft + 2 * cardWidth + 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(card3X, cardsYStart, cardWidth, cardHeight, 4, 4, "FD");
  
  // Card header
  doc.setFillColor(orangeAccent[0], orangeAccent[1], orangeAccent[2]);
  doc.rect(card3X, cardsYStart, cardWidth, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("ACADEMIC INFO", card3X + cardWidth/2, cardsYStart + 6, { align: "center" });
  
  let card3Y = cardsYStart + 15;
  // College Name
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("COLLEGE:", card3X + 7, card3Y);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(student.details?.college_name || "", card3X + 7, card3Y + 5);
  
  card3Y += 10;
  // Course Badge (Fixed size)
  doc.setFillColor(255, 245, 235);
  doc.setDrawColor(orangeAccent[0], orangeAccent[1], orangeAccent[2]);
  doc.roundedRect(card3X + 7, card3Y, cardWidth - 14, 16, 3, 3, "FD");
  
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("COURSE & YEAR", card3X + 7 + (cardWidth - 14)/2, card3Y + 5, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(student.details?.course_name || "", card3X + 7 + (cardWidth - 14)/2, card3Y + 11, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${student.details?.year || ""} Year`, card3X + 7 + (cardWidth - 14)/2, card3Y + 15.5, { align: "center" });

  // =====================
  // COMPLETE TERMS & CONDITIONS (FILL PAGE 1)
  // =====================
  y = cardsYStart + cardHeight + 12;
  doc.setFontSize(11.5);
  doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS", pageWidth / 2, y, { align: "center" });
  doc.setDrawColor(200, 215, 230);
  doc.line(marginLeft + 20, y + 1.5, pageWidth - marginRight - 20, y + 1.5);
  y += 6;

  doc.setFontSize(7.4);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");

  const termsAndConditions = [
    {
      title: "1. ACCOMMODATION",
      text: "The student is allotted accommodation solely for personal residential purposes. The room cannot be sublet, transferred, exchanged, or shared with any other person without prior written approval from the hostel management. Hostel management reserves the right to change room allocation if necessary for safety, security, or operational reasons."
    },
    {
      title: "2. DISCIPLINE & BEHAVIOR",
      text: "Students must maintain discipline and respectful behavior towards hostel staff, fellow residents, visitors, and management at all times. Any act involving violence, abuse, harassment, ragging, intimidation, or misconduct will result in strict disciplinary action including immediate expulsion from the hostel."
    },
    {
      title: "3. HOSTEL PROPERTY",
      text: "Students must take reasonable care of all hostel property, furniture, and fixtures. Any damage caused intentionally or due to negligence will be fully compensated by the student. Hostel management reserves the right to assess damages and recover repair/replacement costs from the student or their security deposit."
    },
    {
      title: "4. SECURITY DEPOSIT",
      text: "Student must pay the required security deposit before occupying the room. Security deposit may be adjusted against property damages, outstanding dues, or unpaid hostel fees. Remaining balance, if any, will be refunded after successful room inspection and clearance of all dues within 15 working days from the date of departure."
    },
    {
      title: "5. CLEANLINESS & HYGIENE",
      text: "Students must maintain cleanliness inside their allotted room and all common areas. Waste must be disposed of properly in designated bins. Repeated violations may attract penalties or disciplinary action. Students are responsible for keeping their own beds, study tables, and personal belongings clean."
    },
    {
      title: "6. VISITORS & GUESTS",
      text: "Unauthorized visitors are strictly prohibited in the hostel premises. All guests must register at the reception and follow hostel visitor policies. Visiting hours must be strictly followed. Hostel management reserves the right to refuse entry to any person at their discretion."
    },
    {
      title: "7. TIMINGS & CURFEW",
      text: "Students must follow entry and exit timelines strictly. Late entry may be restricted or require prior permission from the warden. Specific curfew hours are enforced for the safety of all residents. Students must inform the warden in advance if they plan to stay outside overnight."
    },
    {
      title: "8. ELECTRICAL APPLIANCES",
      text: "Only authorized electrical appliances are allowed in the hostel. Use of high-power consumption appliances like heaters, irons, electric kettles, etc., is prohibited without explicit permission. All appliances must be turned off when not in use to save energy and prevent fire hazards."
    },
    {
      title: "9. SAFETY & SECURITY",
      text: "Students must follow all fire safety protocols and evacuation procedures. Do not tamper with safety equipment, fire alarms, or emergency exits. Any safety hazards must be reported immediately to hostel staff. Students are responsible for the safety and security of their personal belongings."
    },
    {
      title: "10. FEE PAYMENT",
      text: "Students agree to pay all hostel fees within specified due dates as per the agreed payment schedule. Monthly fees are due by the 5th of every month. Late payments will attract penalties as per hostel policy. Failure to pay dues may result in access restrictions, suspension of services, or cancellation of room allocation."
    },
    {
      title: "11. CANCELLATION & REFUND",
      text: "Cancellation requests must be submitted in writing with proper notice period as per hostel policy. Cancellation charges will apply as per agreement. Refunds, if applicable, will be processed according to hostel policy after verification of all pending obligations and property inspection."
    },
    {
      title: "12. MANAGEMENT RIGHTS",
      text: "Hostel management reserves all rights to make necessary changes to rules and policies with prior notice. Management can inspect rooms periodically for safety, security, and hygiene. Management decisions are final and binding on all residents. The hostel will not be responsible for loss of personal belongings due to negligence, theft, or natural calamities."
    }
  ];

  termsAndConditions.forEach((term) => {
    // Check if we need a new page, leave footer space
    if (y > pageHeight - 18) {
      doc.addPage();
      addPageHeader();
      y = 18;
    }
    
    // Term title
    doc.setFont("helvetica", "bold");
    doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
    doc.text(term.title, marginLeft, y);
    
    // Term text
    y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const textLines = doc.splitTextToSize(term.text, pageWidth - marginLeft - marginRight);
    doc.text(textLines, marginLeft, y);
    y += (textLines.length * 3.7) + 1.8;
  });

  // Check if we need to add a new page for Declaration & Signatures
  if (y > pageHeight - 120) {
    doc.addPage();
    addPageHeader();
    y = 18;
  }

  // =====================
  // DECLARATION & SIGNATURES (On Page 2, end of terms)
  // =====================
  doc.setFontSize(12);
  doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.text("DECLARATION & SIGNATURES", pageWidth / 2, y, { align: "center" });
  doc.setDrawColor(200, 215, 230);
  doc.line(marginLeft + 20, y + 2, pageWidth - marginRight - 20, y + 2);
  y += 9;

  // Declaration text
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  const declaration = "I hereby declare that I have read, understood, and agree to all the terms and conditions mentioned in this Hostel Accommodation Agreement. I will follow all hostel rules and regulations during my stay and maintain proper discipline at all times.";
  const decLines = doc.splitTextToSize(declaration, pageWidth - marginLeft - marginRight);
  doc.text(decLines, marginLeft, y);
  y += (decLines.length * 4.2) + 7;

  // Signatures Grid (Perfectly aligned)
  const signatures = [
    { label: "Student Signature", name: student.name },
    { label: "Guardian Signature", name: student.details?.parent_name || "Guardian" },
    { label: "Warden Signature", name: hostel.warden_name || "Warden" },
    { label: "Hostel Management", name: hostel.owner_name || "Authorized Signatory" },
  ];

  signatures.forEach((sig, index) => {
    const colX = marginLeft + (index % 2) * ((pageWidth - marginLeft - marginRight) / 2);
    const rowY = y + Math.floor(index / 2) * 37;

    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85);
    doc.setFont("helvetica", "bold");
    doc.text(sig.label, colX, rowY);
    
    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.5);
    doc.line(colX, rowY + 4.5, colX + 82, rowY + 4.5);
    
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(sig.name, colX, rowY + 12);
    doc.text("Date: ____________", colX, rowY + 17.5);
  });

  // Official Stamp area
  y += 75;
  doc.setFillColor(245, 248, 250);
  doc.setDrawColor(200, 210, 220);
  doc.roundedRect(pageWidth - 48, y, 38, 38, 4, 4, "D");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("OFFICIAL STAMP", pageWidth - 29, y + 21, { align: "center" });

  // =====================
  // PAGE 3: COMPLETE PAYMENT HISTORY (Fixed Table!)
  // =====================
  doc.addPage();
  addPageHeader();
  y = 18;

  doc.setFontSize(12);
  doc.setTextColor(cardPrimary[0], cardPrimary[1], cardPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLETE PAYMENT HISTORY", pageWidth / 2, y, { align: "center" });
  doc.setDrawColor(200, 215, 230);
  doc.line(marginLeft + 20, y + 2, pageWidth - marginRight - 20, y + 2);
  y += 10;

  if (existingFees && existingFees.length > 0) {
    const mainFees = existingFees.filter(f => f.fee_type !== 'advance_payment');
    const paymentTableData: any[] = [];
    let globalSNo = 1;

    mainFees.forEach((fee) => {
      const adjustment = parseFloat(fee.adjustment_amount || "0");
      const payments = fee.associated_payments || [];
      
      const hasSubTransactions = (payments.length > 1 || (payments.length === 1 && fee.status === 'partial'));
      const isFullyAdjusted = fee.status === 'paid' && parseFloat(fee.paid_amount || "0") === 0;
      const isUnpaid = fee.status === 'unpaid' || fee.status === 'pending';
      const showPaymentInPlan = !hasSubTransactions && !isFullyAdjusted && !isUnpaid && fee.status === 'paid';
      const singlePayment = showPaymentInPlan ? payments[0] : null;

      // Source / Entry
      const sourceEntry = (fee.installment_name || fee.month || 'Ledger Entry').replace(/ \d{4}/, '');
      // Due Date
      const dueDate = formatDate(fee.due_date);
      // Status
      const status = fee.status.toUpperCase();

      // Clean text function to replace ₹ with Rs. and fix formatting
      const cleanText = (text: string) => {
        if (!text) return '';
        return text.replace(/₹/g, 'Rs. ').replace(/\s+/g, ' ').trim();
      };

      // Build Plan Required column
      let planRequiredLines: string[] = [];
      if (fee.installment_name === 'Overpayment Credit') {
        planRequiredLines.push(formatCurrency(fee.paid_amount));
      } else {
        const planAmount = parseFloat(fee.amount) + adjustment;
        planRequiredLines.push(formatCurrency(planAmount));
        
        // Add adjustment info if needed
        if (adjustment !== 0) {
          planRequiredLines.push("Original: " + formatCurrency(parseFloat(fee.amount)));
          // Add remarks from fee.remarks
          if (fee.remarks) {
            const remarkParts = fee.remarks.split('|').map(r => r.trim());
            remarkParts.forEach(part => {
              const lowerPart = part.toLowerCase();
              if (lowerPart.includes('adjusted') && !lowerPart.includes('future')) {
                planRequiredLines.push(cleanText(part));
              }
            });
          }
        }
      }
      const planRequired = planRequiredLines.join('\n');

      // Build Paid Amount column
      let paidAmountLines: string[] = [];
      let totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
      if (totalReceived === 0 && parseFloat(fee.paid_amount || "0") > 0) {
        totalReceived = parseFloat(fee.paid_amount);
      }
      
      if (totalReceived > 0) {
        paidAmountLines.push(formatCurrency(totalReceived));
        
        const planAmount = fee.installment_name === 'Overpayment Credit' ? 0 : (parseFloat(fee.amount) + adjustment);
        const appliedAmount = Math.min(totalReceived, planAmount);
        
        if (appliedAmount > 0) {
          const appliedLabel = fee.installment_name === 'Overpayment Credit' ? 'Credited' : 'Applied';
          paidAmountLines.push(appliedLabel + ": " + formatCurrency(appliedAmount));
        }
        
        if (totalReceived > planAmount) {
          const overcreditAmount = totalReceived - planAmount;
          const adjustmentLabel = fee.installment_name === 'Overpayment Credit' ? 'Excess Payment' : `Adjustment (incl. ${formatCurrency(overcreditAmount)} Overcredit)`;
          paidAmountLines.push(adjustmentLabel);
        }
      }
      const paidAmount = paidAmountLines.join('\n');

      // Transaction Ref
      let transactionRef = "";
      if (fee.installment_name === 'Overpayment Credit') {
        transactionRef = "";
      } else if (showPaymentInPlan) {
        transactionRef = singlePayment?.transaction_id || fee.transaction_id || singlePayment?.payment_method || fee.payment_method || "";
      } else if (payments.length > 1) {
        transactionRef = "MULTIPLE";
      }
      
      // Receipt
      let receipt = "";
      if (fee.installment_name === 'Overpayment Credit') {
        receipt = "";
      } else if (showPaymentInPlan) {
        receipt = singlePayment?.receipt_id || fee.receipt_id || "";
      } else if (payments.length > 1) {
        receipt = "CONS.";
      }

      // Add main row
      paymentTableData.push([
        globalSNo.toString().padStart(2, '0'),
        sourceEntry,
        dueDate,
        planRequired,
        paidAmount,
        status,
        transactionRef,
        receipt
      ]);

      globalSNo++;

      // Add sub-transactions if needed (like portal does)
      if (hasSubTransactions) {
        payments.forEach((payment) => {
          paymentTableData.push([
            globalSNo.toString().padStart(2, '0'),
            "Payment Entry",
            formatDate(payment.actual_payment_date),
            "",
            formatCurrency(payment.amount),
            "SETTLED",
            payment.transaction_id || payment.payment_method || "",
            payment.receipt_id || ""
          ]);
          globalSNo++;
        });
      }
    });

    autoTable(doc, {
      startY: y,
      head: [["S.No", "Source / Entry", "Due Date", "Plan Required", "Paid Amount", "Status", "Transaction Ref", "Receipt"]],
      body: paymentTableData,
      theme: "grid",
      headStyles: {
        font: "helvetica",
        fillColor: cardPrimary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 9,
        cellPadding: 4,
        minCellHeight: 12,
      },
      bodyStyles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 4,
        valign: "top",
        minCellHeight: 12,
      },
      alternateRowStyles: {
        fillColor: [245, 248, 250]
      },
      columnStyles: {
        0: { halign: "center", cellWidth: "auto" },
        1: { halign: "left", cellWidth: "auto" },
        2: { halign: "center", cellWidth: "auto" },
        3: { 
          halign: "left", 
          cellWidth: "auto" 
        },
        4: { 
          halign: "left", 
          cellWidth: "auto" 
        },
        5: {
          halign: "center",
          cellWidth: "auto",
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8
        },
        6: { halign: "center", cellWidth: "auto" },
        7: { halign: "left", cellWidth: "auto" }
      },
      styles: { 
        font: "helvetica",
        fontSize: 8, 
        cellPadding: 4,
        overflow: "linebreak",
        lineWidth: 0.15,
      },
      margin: { left: marginLeft, right: marginRight, top: 20, bottom: 20 },
      pageBreak: "auto",
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const val = String(data.cell.raw || "").toLowerCase();
          let fillColor: [number, number, number];
          if (val.includes("paid") || val.includes("settled")) {
            fillColor = [220, 252, 231]; // Light Green
          } else if (val.includes("advance")) {
            fillColor = [219, 234, 254]; // Light Blue
          } else if (val.includes("pending")) {
            fillColor = [255, 237, 213]; // Light Orange
          } else if (val.includes("partial")) {
            fillColor = [254, 252, 232]; // Light Yellow
          } else if (val.includes("unpaid") || val.includes("overdue")) {
            fillColor = [254, 226, 226]; // Light Red
          } else if (val.includes("running")) {
            fillColor = [209, 250, 229]; // Light Teal
          } else {
            fillColor = [243, 244, 246]; // Light Gray
          }
          doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
          // Redraw text on top
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          if (typeof data.cell.raw === "string") {
            const textLines = doc.splitTextToSize(data.cell.raw, data.cell.width - 8);
            doc.text(textLines, data.cell.x + 4, data.cell.y + 8);
          }
        }
      }
    });
  } else {
    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    doc.text("No payment history available yet.", pageWidth / 2, y, { align: "center" });
  }

  // Save the PDF
  const fileName = `${student.name.replace(/\s+/g, "_")}_Admission_Contract_${student.student_id}.pdf`;
  doc.save(fileName);
};