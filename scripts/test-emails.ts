import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "DistinctHomes <onboarding@resend.dev>";
const TO_EMAIL = "jjfrey@gmail.com";

async function sendTestEmails() {
  console.log("Sending test invitation emails to:", TO_EMAIL);
  console.log("");

  // Agent invitation email
  const agentHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">DistinctHomes</h1>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">You're Invited!</h2>

          <p>You've been invited to join the DistinctHomes Agent Portal as <strong>John Smith</strong> for <strong>Coastal Realty Group</strong>.</p>

          <p>Click the button below to create your account and get started:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/portal/register?token=test123" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Create Your Account
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">http://localhost:3000/portal/register?token=test123</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} DistinctHomes. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  // Office Admin invitation email
  const officeAdminHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">DistinctHomes</h1>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">You're Invited!</h2>

          <p>You've been invited to join the DistinctHomes Office Admin Portal for <strong>Sunset Properties</strong>.</p>

          <p>Click the button below to create your account and get started:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/portal/register?token=test456" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Create Your Account
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">http://localhost:3000/portal/register?token=test456</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} DistinctHomes. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  try {
    // Send agent invitation
    console.log("1. Sending Agent invitation email...");
    const agentResult = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: "You're invited to join the DistinctHomes Agent Portal",
      html: agentHtml,
    });
    console.log("   ✓ Agent email sent:", agentResult.data?.id || agentResult.error);

    // Send office admin invitation
    console.log("2. Sending Office Admin invitation email...");
    const officeAdminResult = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: "You're invited to join the DistinctHomes Office Admin Portal",
      html: officeAdminHtml,
    });
    console.log("   ✓ Office Admin email sent:", officeAdminResult.data?.id || officeAdminResult.error);

    console.log("");
    console.log("Done! Check your inbox at", TO_EMAIL);
  } catch (error) {
    console.error("Error sending emails:", error);
  }
}

sendTestEmails();
