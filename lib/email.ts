import nodemailer from "nodemailer"

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

// Function to send verification email
export async function sendVerificationEmail(to: string, name: string, verificationCode: string) {
  try {
    const mailOptions = {
      from: `"Exam Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with the Exam Management System. Please use the verification code below to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p>Best regards,<br>Exam Management System Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Verification email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending verification email:", error)
    return false
  }
}

// Function to send registration approval email
export async function sendApprovalEmail(to: string, name: string) {
  try {
    const mailOptions = {
      from: `"Exam Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Registration Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Registration Approved</h2>
          <p>Hello ${name},</p>
          <p>We're pleased to inform you that your registration for the Exam Management System has been approved.</p>
          <p>You can now log in to your account using your email and password.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
          </div>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Exam Management System Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Approval email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending approval email:", error)
    return false
  }
}

// Function to send registration rejection email
export async function sendRejectionEmail(to: string, name: string, reason = "") {
  try {
    const mailOptions = {
      from: `"Exam Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Registration Not Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Registration Not Approved</h2>
          <p>Hello ${name},</p>
          <p>We regret to inform you that your registration for the Exam Management System has not been approved.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>If you believe this is an error or have any questions, please contact our support team.</p>
          <p>Best regards,<br>Exam Management System Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Rejection email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending rejection email:", error)
    return false
  }
}

// Function to send login verification code
export async function sendLoginVerificationCode(to: string, name: string, verificationCode: string) {
  try {
    const mailOptions = {
      from: `"Exam Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Login Verification</h2>
          <p>Hello ${name},</p>
          <p>You are attempting to log in to your Exam Management System account. Please use the verification code below to complete the login process:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not attempt to log in, please secure your account by changing your password immediately.</p>
          <p>Best regards,<br>Exam Management System Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Login verification email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending login verification email:", error)
    return false
  }
}
