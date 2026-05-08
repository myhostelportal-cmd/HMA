import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface StudentProfile {
  student_id: number;
  name: string;
  phone: string;
  whatsapp_number?: string;
  aadhaar_number?: string;
  assigned_slot?: string;
  student_photo?: string;
  email?: string;
  dob?: string;
  gender?: string;
  room_number?: string;
  room_type?: string;
  room_capacity?: number;
  floor?: string;
  hostel_name?: string;
  hostel_address?: string;
  hostel_contact?: string;
  status: string;
  hostel_id: number;
  payment_model: string;
  monthly_fee: number;
  total_session_fees: number;
  security_deposit: number;
  joining_date: string;
  fee_status?: string;
  details?: {
    college_name?: string;
    course_name?: string;
    address?: string;
    city?: string;
    state?: string;
    parent_name?: string;
    parent_phone?: string;
    parent_relation?: string;
    parent_address?: string;
    year?: string;
    emergency_contact?: string;
    floor?: string;
    room_category?: string;
    parent_secondary_phone?: string;
    parent_occupation?: string;
    parent_aadhaar?: string;
    assigned_slot?: string;
    student_photo?: string;
  };
}

export interface FeeRecord {
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
  public_token?: string;
}

export interface FeeStats {
  totalPaid: number;
  totalDue: number;
  overcreditedAmount: number;
}

export const downloadReceipt = (student: StudentProfile, fee: FeeRecord, feeStats: FeeStats, source: 'warden' | 'student' | 'system' = 'system') => {
  if (!student) return;
  
  const doc = new jsPDF();
  const pageWidth = (doc as any).internal.pageSize.width;
  const primaryColor: [number, number, number] = [26, 35, 126]; // Dark Blue
  const accentColor: [number, number, number] = [63, 81, 181]; // Indigo
  
  // Helper: Currency Formatter
  const formatCurrency = (val: any) => {
    const amount = parseFloat(val || "0");
    return `INR ${amount.toLocaleString('en-IN')}`;
  };

  // 1. HEADER (BRANDING IMPROVEMENT)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo Placeholder (Circle)
  doc.setFillColor(255, 255, 255, 0.2);
  doc.circle(25, 22, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text((student.hostel_name || "BH").substring(0, 2).toUpperCase(), 20, 24);

  // System Name & Title
  doc.setFontSize(16);
  doc.text(student.hostel_name || "BH Hostel Management System", 45, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(student.hostel_address || "Professional Hostel Finance Solutions", 45, 26);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FEE PAYMENT RECEIPT", 45, 36);

  // Header Right Side (Receipt ID & Date)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Receipt ID: ${fee.receipt_id || 'N/A'}`, pageWidth - 20, 20, { align: 'right' });
  doc.setFont("helvetica", "normal");
  const formattedGenDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  doc.text(`Date: ${formattedGenDate}`, pageWidth - 20, 26, { align: 'right' });
  doc.text(`Contact: ${student.hostel_contact || 'N/A'}`, pageWidth - 20, 32, { align: 'right' });

  // 2. STUDENT DETAILS + RECEIPT DETAILS (2-COLUMN LAYOUT)
  let y = 60;
  doc.setTextColor(40, 40, 40);
  
  // Section Headers
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT INFORMATION", 20, y);
  doc.text("RECEIPT INFORMATION", 110, y);
  
  doc.setDrawColor(230, 230, 230);
  doc.line(20, y + 2, 90, y + 2);
  doc.line(110, y + 2, pageWidth - 20, y + 2);
  
  y += 10;
  doc.setFontSize(9);
  
  // Left Column
  const drawLabelValue = (label: string, value: string, x: number, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, x, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, x + 35, currentY);
  };

  drawLabelValue("Student Name", student.name, 20, y);
  drawLabelValue("Receipt ID", fee.receipt_id || '—', 110, y);
  y += 7;
  drawLabelValue("Student ID", `#${student.student_id}`, 20, y);
  const pDate = fee.payment_date ? new Date(fee.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  drawLabelValue("Payment Date", pDate, 110, y);
  y += 7;
  drawLabelValue("Room Number", student.room_number || '—', 20, y);
  drawLabelValue("Payment Method", fee.payment_method || '—', 110, y);
  y += 7;
  drawLabelValue("Contact", student.phone, 20, y);
  drawLabelValue("Transaction ID", fee.installment_name === 'Overpayment Credit' ? '—' : (fee.transaction_id || '—'), 110, y);
  y += 7;
  const jDate = new Date(student.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  drawLabelValue("Joining Date", jDate, 20, y);
  
  // Status Badge Logic
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Payment Status:", 110, y);
  
  const statusText = (fee.status || 'pending').toUpperCase();
  const displayStatus = statusText === 'PAID' ? 'PAID' : statusText === 'PARTIAL' ? 'PARTIAL PAID' : statusText;
  
  let badgeColor = [100, 100, 100]; // Grey
  if (statusText === 'PAID') badgeColor = [46, 125, 50]; // Green
  if (statusText === 'PARTIAL') badgeColor = [245, 127, 23]; // Yellow/Amber
  if (statusText === 'PENDING') badgeColor = [198, 40, 40]; // Red
  
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(140, y - 4, 35, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(displayStatus, 157.5, y, { align: 'center' });

  // 3. PAYMENT SUMMARY SECTION (HIGHLIGHTED BOX)
  y += 15;
  doc.setFillColor(248, 250, 252); // Light Slate
  doc.roundedRect(20, y, pageWidth - 40, 25, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, y, pageWidth - 40, 25, 3, 3, 'D');
  
  const summaryY = y + 10;
  const colWidth = (pageWidth - 40) / 5;
  
  const drawSummaryItem = (label: string, value: string, x: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, x + colWidth/2, summaryY, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(value, x + colWidth/2, summaryY + 7, { align: 'center' });
  };

  drawSummaryItem("Total Package", formatCurrency(student.total_session_fees), 20);
  drawSummaryItem("Security", formatCurrency(student.security_deposit), 20 + colWidth);
  drawSummaryItem("Total Paid", formatCurrency(feeStats.totalPaid), 20 + (colWidth * 2));
  drawSummaryItem("Overcredited", formatCurrency(feeStats.overcreditedAmount), 20 + (colWidth * 3));
  drawSummaryItem("Balance Due", formatCurrency(feeStats.totalDue), 20 + (colWidth * 4));

  // 4. PAYMENT TABLE IMPROVEMENT
  y += 35;
  const securityAdjustment = parseFloat(fee.adjustment_amount || "0");
  const isOverpayment = fee.installment_name === 'Overpayment Credit';
  
  // Fix Due Date to always be 1st of month
  const fixDueDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setDate(1);
    return date.toLocaleDateString('en-GB');
  };

  const fixedDueDate = fixDueDate(fee.due_date);

  autoTable(doc, {
    startY: y,
    head: [['Sr', 'Description', 'Due Date', 'Plan Amount', 'Adjustment', 'Paid', 'Date', 'Method', 'Status']],
    body: [
      [
        '1',
        isOverpayment ? 'OVERPAYMENT CREDIT (Advance)' : (fee.installment_name || fee.month || 'Fee Entry'),
        fixedDueDate,
        isOverpayment ? '—' : formatCurrency(fee.amount),
        securityAdjustment !== 0 ? formatCurrency(securityAdjustment) : '—',
        formatCurrency(fee.paid_amount),
        fee.payment_date ? new Date(fee.payment_date).toLocaleDateString('en-GB') : '—',
        fee.payment_method || '—',
        isOverpayment ? 'CREDITED' : displayStatus
      ]
    ],
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      0: { halign: 'center' },
      8: { halign: 'center' }
    },
    styles: { fontSize: 8, cellPadding: 4 }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 15;

  // 6. TRANSACTION DETAILS SECTION
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TRANSACTION DETAILS", 20, finalY);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, finalY + 2, pageWidth - 20, finalY + 2);
  
  finalY += 10;
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  
  const drawDetailRow = (label: string, value: string, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(value, 60, currentY);
  };

  drawDetailRow("Transaction Reference", fee.transaction_id || 'N/A', finalY);
  finalY += 6;
  drawDetailRow("Payment Recorded By", "System Generated", finalY);
  finalY += 6;
  drawDetailRow("Remarks", fee.remarks || 'No additional remarks', finalY);

  // 7. FOOTER & SIGNATURE
  const footerY = doc.internal.pageSize.height - 35;
  
  // Source label (only allowed difference)
  const sourceLabel = source === 'warden' ? 'System Generated Receipt (Downloaded by Warden)' : 
                     source === 'student' ? 'System Generated Receipt (Accessed via Student Link)' : 
                     'System Generated Receipt';
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(sourceLabel, pageWidth / 2, footerY - 15, { align: 'center' });
  
  // Terms & Conditions
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Terms & Conditions:", 20, footerY - 8);
  doc.text("1. This is a computer-generated receipt and does not require a physical signature.", 20, footerY - 4);
  doc.text("2. Please keep this receipt for future reference regarding your hostel stay.", 20, footerY);

  // Signature Area
  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - 70, footerY + 5, pageWidth - 20, footerY + 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Authorized Signatory", pageWidth - 45, footerY + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(student.hostel_name || "Hostel Management", pageWidth - 45, footerY + 14, { align: 'center' });

  // SAVE
  const fileName = `Receipt_${fee.receipt_id || 'Entry'}_${student.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
