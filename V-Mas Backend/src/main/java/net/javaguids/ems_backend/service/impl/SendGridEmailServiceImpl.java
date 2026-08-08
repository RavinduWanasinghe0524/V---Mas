package net.javaguids.ems_backend.service.impl;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Sends transactional email via SendGrid REST API.
 *
 * Required application.properties / application-local.properties entries:
 *   sendgrid.api-key  – your SendGrid API key (starts with "SG.")
 *   mail.from.email   – the verified sender address in your SendGrid account
 *   mail.from.name    – display name shown in the From field (e.g. "V-MAS")
 *
 * How to get a SendGrid API key:
 *   1. Sign up / log in at https://app.sendgrid.com
 *   2. Go to Settings → API Keys → Create API Key
 *   3. Choose "Restricted Access" and enable "Mail Send" → Full Access
 *   4. Copy the key (shown only once) and paste it in application-local.properties
 *   5. Verify your sender address under Settings → Sender Authentication
 */
@Slf4j
@Service
public class SendGridEmailServiceImpl implements EmailService {

    @Value("${sendgrid.api-key}")
    private String sendGridApiKey;

    @Value("${mail.from.email}")
    private String fromEmail;

    @Value("${mail.from.name:V-MAS}")
    private String fromName;

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        Email from = new Email(fromEmail, fromName);
        Email to   = new Email(toEmail);

        Content content = new Content("text/html", buildHtmlBody(resetLink));
        Mail mail = new Mail(from, "Reset your V-MAS password", to, content);

        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);

            int statusCode = response.getStatusCode();
            if (statusCode >= 200 && statusCode < 300) {
                log.info("Password reset email sent via SendGrid to {} (status {})", toEmail, statusCode);
            } else {
                log.error("SendGrid returned status {} for email to {}: {}", statusCode, toEmail, response.getBody());
                throw new RuntimeException(
                        "Email delivery failed (SendGrid status " + statusCode + "). Please try again later.");
            }
        } catch (IOException e) {
            log.error("Failed to send password reset email to {} via SendGrid: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send reset email. Please try again later.", e);
        }
    }

    private String buildHtmlBody(String resetLink) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                  <title>Reset your password</title>
                </head>
                <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Inter',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
                    <tr>
                      <td align="center">
                        <table width="480" cellpadding="0" cellspacing="0"
                               style="background:#ffffff;border-radius:16px;overflow:hidden;
                                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                          <!-- Header -->
                          <tr>
                            <td style="background:linear-gradient(135deg,#1a1210 0%%,#2c1a10 100%%);
                                       padding:32px 40px;text-align:center;">
                              <span style="font-size:1.6rem;font-weight:800;color:#fff;
                                           letter-spacing:0.08em;">V-MAS</span>
                              <p style="color:rgba(255,255,255,0.5);font-size:0.8rem;margin:4px 0 0;">
                                Vehicle Fleet Management
                              </p>
                            </td>
                          </tr>
                          <!-- Body -->
                          <tr>
                            <td style="padding:40px 40px 32px;">
                              <h2 style="margin:0 0 12px;font-size:1.4rem;font-weight:700;
                                          color:#111;letter-spacing:-0.01em;">
                                Reset your password
                              </h2>
                              <p style="color:#555;font-size:0.92rem;line-height:1.6;margin:0 0 24px;">
                                We received a request to reset the password for your V-MAS account.
                                Click the button below to choose a new password.
                                This link is valid for <strong>30 minutes</strong>.
                              </p>
                              <div style="text-align:center;margin:0 0 28px;">
                                <a href="%s"
                                   style="display:inline-block;padding:14px 32px;
                                          background:linear-gradient(135deg,#ff6a35 0%%,#e8391a 100%%);
                                          color:#ffffff;text-decoration:none;border-radius:12px;
                                          font-size:0.95rem;font-weight:700;
                                          box-shadow:0 4px 16px rgba(232,57,26,0.4);">
                                  Reset Password
                                </a>
                              </div>
                              <p style="color:#888;font-size:0.82rem;line-height:1.5;margin:0;">
                                If you didn't request a password reset, you can safely ignore this email.
                                Your password won't change unless you click the link above.
                              </p>
                            </td>
                          </tr>
                          <!-- Footer -->
                          <tr>
                            <td style="padding:20px 40px;border-top:1px solid #f0f0f0;">
                              <p style="color:#bbb;font-size:0.75rem;margin:0;text-align:center;">
                                &copy; 2026 V-MAS &middot; Vehicle Fleet Management System
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(resetLink);
    }
}
