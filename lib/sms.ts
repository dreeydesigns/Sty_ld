// =========================================================================
// FIREBASE MIGRATION NOTE:
// This file previously used Africa's Talking to send SMS messages.
// Because you are moving to Firebase Phone Authentication, Firebase will 
// handle sending the SMS automatically on the client-side.
// 
// This is a safe "stub" function. It exists so that if any older parts of 
// your code still try to call `sendSMS`, the app will not crash.
// =========================================================================

export const sendSMS = async (to: string, message: string) => {
  // We log this to the server console just so you know it was called,
  // but it no longer requires or uses Africa's Talking.
  console.log(`[Firebase Migration] SMS to ${to} bypassed. Message: ${message}`);
  
  return { 
    success: true, 
    status: 'bypassed',
    note: 'SMS sending is now handled natively by Firebase on the frontend.' 
  };
};