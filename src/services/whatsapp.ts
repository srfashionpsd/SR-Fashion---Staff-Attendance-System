export interface StaffMonthlySummaryItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  mobile?: string;
  barcode: string;
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  avgLateMinutes: number;
  leaveDays: number;
  holidayDays: number;
  absentDays: number;
  missingPunches: number;
  totalWorkingHours: string;
}

export function generateIndividualWhatsAppSummary(
  item: StaffMonthlySummaryItem,
  monthName: string,
  year: number
): string {
  return `*SR FASHION — ATTENDANCE SUMMARY*
*Sabki Pasand SR Fashion*
Degloor Naka, Nanded (📞 7588756669)

*Employee:* ${item.employeeName} (${item.employeeCode})
*Month:* ${monthName} ${year}

✅ *Present:* ${item.presentDays} Days
❌ *Absent:* ${item.absentDays} Days
🏖️ *Leave:* ${item.leaveDays} Days
🎉 *Holiday:* ${item.holidayDays} Days
🟡 *Late Days:* ${item.lateDays}
⏱️ *Total Late:* ${item.totalLateMinutes} Minutes${item.lateDays > 0 ? ` (Avg ${item.avgLateMinutes}m)` : ''}
⚠️ *Missing Punch:* ${item.missingPunches}
🕒 *Total Working:* ${item.totalWorkingHours} Hours

_Status verified on SR Fashion Attendance System_`;
}

export function generateFullStaffWhatsAppSummary(
  items: StaffMonthlySummaryItem[],
  monthName: string,
  year: number
): string {
  const staffLines = items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.employeeName}* — Present ${item.presentDays} | Late ${item.lateDays} | Leave ${item.leaveDays} | Absent ${item.absentDays}`
    )
    .join('\n');

  return `*SR FASHION*
*MONTHLY ATTENDANCE SUMMARY*

*${monthName} ${year}*

${staffLines}

📊 *Total Staff:* ${items.length}

*SR Fashion — Sabki Pasand SR Fashion*
Eidgah Kaman Road, Degloor Naka, Nanded
📞 7588756669 | Instagram: @srfashion_nanded`;
}

export function openWhatsAppShare(text: string, mobileNumber?: string) {
  const cleanMobile = mobileNumber ? mobileNumber.replace(/\D/g, '') : '';
  const encoded = encodeURIComponent(text);
  let url = `https://api.whatsapp.com/send?text=${encoded}`;
  if (cleanMobile && cleanMobile.length >= 10) {
    const formatted = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encoded}`;
  }
  window.open(url, '_blank');
}
