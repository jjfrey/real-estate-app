import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend's test domain until distincthomes.com is verified
// Change to "DistinctiveHomes <noreply@distincthomes.com>" after verification
const FROM_EMAIL = "DistinctiveHomes <onboarding@resend.dev>";

// Logo URL for emails
const getLogoUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/logo.png`;
};

interface SendInvitationEmailParams {
  to: string;
  inviteUrl: string;
  type: "agent" | "office_admin";
  agentName?: string;
  officeName?: string;
}

export async function sendInvitationEmail({
  to,
  inviteUrl,
  type,
  agentName,
  officeName,
}: SendInvitationEmailParams) {
  const roleLabel = type === "agent" ? "Agent" : "Office Admin";
  const subject = `You're invited to join the DistinctiveHomes ${roleLabel} Portal`;
  const logoUrl = getLogoUrl();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <img src="${logoUrl}" alt="DistinctiveHomes" style="max-height: 50px; max-width: 200px;" />
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">You're Invited!</h2>

          <p>You've been invited to join the DistinctiveHomes ${roleLabel} Portal${agentName ? ` as ${agentName}` : ""}${officeName ? ` for ${officeName}` : ""}.</p>

          <p>Click the button below to create your account and get started:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Create Your Account
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${inviteUrl}</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} DistinctiveHomes. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
You're Invited to DistinctiveHomes!

You've been invited to join the DistinctiveHomes ${roleLabel} Portal${agentName ? ` as ${agentName}` : ""}${officeName ? ` for ${officeName}` : ""}.

Click the link below to create your account:
${inviteUrl}

This invitation link will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send invitation:", error);
      return { success: false, error };
    }

    console.log("[Email] Invitation sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Error sending invitation:", error);
    return { success: false, error };
  }
}

interface SendWelcomeEmailParams {
  to: string;
  loginUrl: string;
  userName: string;
  role: string;
  tempPassword?: string;
}

export async function sendWelcomeEmail({
  to,
  loginUrl,
  userName,
  role,
  tempPassword,
}: SendWelcomeEmailParams) {
  const roleLabel = role === "agent" ? "Agent" : role === "office_admin" ? "Office Admin" : "Admin";
  const subject = `Welcome to the DistinctiveHomes ${roleLabel} Portal`;
  const logoUrl = getLogoUrl();

  const passwordSection = tempPassword
    ? `
          <p><strong>Your temporary password is:</strong></p>
          <p style="background: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 16px; text-align: center;">${tempPassword}</p>
          <p style="color: #dc2626; font-weight: 500;">Please change your password after your first login.</p>
    `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <img src="${logoUrl}" alt="DistinctiveHomes" style="max-height: 50px; max-width: 200px;" />
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${userName}!</h2>

          <p>Your account has been created for the DistinctiveHomes ${roleLabel} Portal.</p>

          ${passwordSection}

          <p>Click the button below to log in:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Log In to Portal
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${loginUrl}</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If you have any questions, please contact your administrator.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} DistinctiveHomes. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to DistinctiveHomes!

Hi ${userName},

Your account has been created for the DistinctiveHomes ${roleLabel} Portal.
${tempPassword ? `\nYour temporary password is: ${tempPassword}\nPlease change your password after your first login.\n` : ""}
Log in here: ${loginUrl}

If you have any questions, please contact your administrator.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send welcome email:", error);
      return { success: false, error };
    }

    console.log("[Email] Welcome email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error);
    return { success: false, error };
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  userName?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: SendPasswordResetEmailParams) {
  const subject = "Reset your DistinctiveHomes password";
  const logoUrl = getLogoUrl();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <img src="${logoUrl}" alt="DistinctiveHomes" style="max-height: 50px; max-width: 200px;" />
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

          <p>Hi${userName ? ` ${userName}` : ""},</p>

          <p>We received a request to reset your password. Click the button below to choose a new password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${resetUrl}</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} DistinctiveHomes. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi${userName ? ` ${userName}` : ""},

We received a request to reset your password. Click the link below to choose a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send password reset:", error);
      return { success: false, error };
    }

    console.log("[Email] Password reset sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Error sending password reset:", error);
    return { success: false, error };
  }
}
