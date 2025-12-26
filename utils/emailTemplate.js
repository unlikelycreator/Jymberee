export const getEmailTemplate = (userName, otp, emailType) => {
  const subjectMap = {
    register: "Your Jymberee Verification OTP",
    login: "Your Jymberee Login Verification OTP",
    forgotPassword: "Your Jymberee Temporary Password",
    resetPassword: "Jymberee Password Change Confirmation",
    deleteAccount: "Jymberee Account Deletion Confirmation",
  };

  const otpDisplay = otp ? `
    <div style="text-align: center; margin: 24px 0;">
      <p style="font-size: 18px; color: #1F2937; margin-bottom: 12px; font-weight: 500;">Your Verification Code:</p>
      <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
        ${otp.split('').map(digit => `
          <div style="width: 50px; height: 50px; border: 2px solid #4F46E5; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 600; color: #4F46E5; background-color: #F9FAFB; box-shadow: 0 3px 6px rgba(79, 70, 229, 0.15);">
            ${digit}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const contentMap = {
    register: `${otpDisplay}<p style="color: #1F2937; font-size: 16px; line-height: 24px; margin-top: 12px;">Please verify within 10 minutes.</p>`,
    login: `${otpDisplay}<p style="color: #1F2937; font-size: 16px; line-height: 24px; margin-top: 12px;">Please verify within 10 minutes.</p>`,
    forgotPassword: `${otpDisplay}<p style="color: #1F2937; font-size: 16px; line-height: 24px; margin-top: 12px;">Please log in and change it immediately.</p>`,
    resetPassword: `<p style="color: #1F2937; font-size: 16px; line-height: 24px; margin-top: 12px;">Your password has been successfully changed.</p>`,
    deleteAccount: `
      <p style="color: #1F2937; font-size: 16px; line-height: 24px; margin-top: 12px;">We're sorry to see you go, ${userName}. Your account has been deleted.</p>
      <p style="color: #1F2937; font-size: 16px; line-height: 24px; margin-top: 12px;">Your account details will be stored with us for 90 days for service purposes. If you wish to reactivate your account, please contact us at <a href="mailto:jymberee@ezeelink.net" style="color: #4F46E5; text-decoration: underline; font-weight: 500;">jymberee@ezeelink.net</a>.</p>
    `,
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subjectMap[emailType]}</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0; }
        .container { max-width: 640px; margin: 24px auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); padding: 24px; }
        .header { text-align: center; margin-bottom: 24px; }
        .header img { max-width: 120px; height: auto; margin-bottom: 16px; }
        .header h1 { font-size: 28px; font-weight: 700; color: #1F2937; margin: 0; }
        .body { font-size: 16px; line-height: 24px; color: #1F2937; margin-bottom: 24px; }
        .body p { margin: 0 0 12px; }
        .btn { display: inline-block; background-color: #4F46E5; color: #FFFFFF !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); }
        .btn:hover { background-color: #4338CA; }
        .footer { font-size: 14px; color: #6B7280; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 24px; }
        .footer a { color: #4F46E5; text-decoration: underline; font-weight: 500; }
        @media (max-width: 600px) { .container { padding: 16px; margin: 16px; } .header h1 { font-size: 24px; } .body { font-size: 15px; line-height: 22px; } .btn { padding: 10px 24px; font-size: 15px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://ezeelink.net/img/logo.webp" alt="Jymberee Logo">
          <h1>${subjectMap[emailType]}</h1>
        </div>
        <div class="body">
          <p>Hello ${userName},</p>
          <div>${contentMap[emailType]}</div>
          <p>If you did not request this action, please contact our support team immediately at <a href="mailto:jymberee@ezeelink.net" style="color: #4F46E5; text-decoration: underline; font-weight: 500;">jymberee@ezeelink.net</a>.</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://ezeelink.net/contact.html" class="btn">Contact Support</a>
        </div>
        <div class="footer">
          <p>Ezeelink IT Solutions LLP<br>506 Rainbow Chambers, Kandivali West, Mumbai - 400067, India</p>
          <p><a href="https://ezeelink.net/contact.html">Contact Us</a> | <a href="http://www.ezeelink.net/jymbereeprivacypolicy.html">Privacy Policy</a></p>
          <p style="margin-top: 8px;">For support, email us at <a href="mailto:jymberee@ezeelink.net">jymberee@ezeelink.net</a>.</p>
          <p style="margin-top: 8px;">Disclaimer: This email contains confidential information intended solely for the recipient. If you are not the intended recipient, please notify the sender and delete this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};