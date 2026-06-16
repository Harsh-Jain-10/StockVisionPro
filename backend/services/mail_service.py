import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

def send_html_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an HTML email via SMTP. Returns True on success, False otherwise."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_sender = os.getenv("SMTP_SENDER")
    if not smtp_sender and smtp_user:
        smtp_sender = f"StockVision Pro <{smtp_user}>"
    elif not smtp_sender:
        smtp_sender = "StockVision Pro <noreply@stockvision.pro>"

    if not smtp_password:
        print(f"[SMTP Warning] SMTP configuration variables are not set in .env. Falling back to local console logging for email: {to_email}")
        print(f"=== EMAIL SANDBOX PREVIEW ===")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{html_content}")
        print(f"=============================")
        return False

    if not smtp_host or not smtp_user:
        print(f"[SMTP Warning] SMTP host/user not configured. Falling back to local console logging for email: {to_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_sender
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        port = int(smtp_port)
        if port == 465:
            with smtplib.SMTP_SSL(smtp_host, port) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_sender, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_sender, to_email, msg.as_string())

        print(f"[SMTP Success] Email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[SMTP Error] Failed to send email to {to_email}: {e}")
        return False


def send_otp_email_service(email: str, code: str, action: str) -> bool:
    print(f"[STUB] send_otp_email_service to {email} with code {code} for action {action}")
    return True


def send_alert_trigger_email(email_to: str, symbol: str, alert_type: str, threshold: float, current_price: float, message: str) -> bool:
    subject = f"Stock Alert Triggered – {symbol}"
    type_desc = "crossed above" if alert_type == "above" else "crossed below" if alert_type == "below" else alert_type.replace("_", " ")

    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d1a; color: #e0e0ff; padding: 40px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border: 1px solid rgba(220,80,80,0.25); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #ff5e5e; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">Alert Triggered</h2>
                <p style="color: #9090bb; font-size: 14px; margin: 5px 0 0 0;">StockVision Pro Monitor</p>
            </div>
            <div style="border-top: 1px solid rgba(220,80,80,0.15); padding-top: 30px;">
                <p style="font-size: 16px; line-height: 1.6; color: #e0e0ff; margin: 0 0 20px 0;">
                    Your configured alert for <strong>{symbol}</strong> has been triggered.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(20,20,40,0.6); border-radius: 12px; border: 1px solid rgba(220,80,80,0.18); overflow: hidden;">
                    <tr style="border-bottom: 1px solid rgba(220,80,80,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Stock</td>
                        <td style="padding: 12px 15px; color: #e0e0ff; font-size: 14px; text-align: right;">{symbol}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(220,80,80,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Condition</td>
                        <td style="padding: 12px 15px; color: #ff5e5e; font-size: 14px; text-align: right; text-transform: capitalize;">{type_desc} ${threshold:,.2f}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(220,80,80,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Current Price</td>
                        <td style="padding: 12px 15px; color: #5eff5e; font-size: 16px; font-weight: bold; text-align: right;">${current_price:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Timestamp</td>
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; text-align: right;">{datetime.now().strftime("%Y-%m-%d %I:%M %p")}</td>
                    </tr>
                </table>
                <div style="background: rgba(220,80,80,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #ff5e5e; margin-top: 20px;">
                    <p style="font-size: 14px; color: #e0e0ff; margin: 0; line-height: 1.5;">
                        <strong>Message:</strong> {message}
                    </p>
                </div>
            </div>
            <div style="margin-top: 40px; border-top: 1px solid rgba(220,80,80,0.15); padding-top: 20px; text-align: center; font-size: 11px; color: #5a5a8a;">
                &copy; {datetime.now().year} StockVision Pro. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_html_email(email_to, subject, html)

def send_credit_request_admin_email(user_email: str, requested_amount: float, reason: str | None) -> bool:
    admin_email = os.getenv("ADMIN_EMAIL", "admin@stockvision.pro")
    subject = f"New Credit Request – {user_email}"
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d1a; color: #e0e0ff; padding: 40px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border: 1px solid rgba(80,180,180,0.25); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #00cccc; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">Credit Request</h2>
                <p style="color: #9090bb; font-size: 14px; margin: 5px 0 0 0;">Admin Approval Console</p>
            </div>
            <div style="border-top: 1px solid rgba(80,180,180,0.15); padding-top: 30px;">
                <p style="font-size: 16px; line-height: 1.6; color: #e0e0ff; margin: 0 0 20px 0;">
                    A user has requested additional platform simulation credits.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(20,20,40,0.6); border-radius: 12px; border: 1px solid rgba(80,180,180,0.18); overflow: hidden;">
                    <tr style="border-bottom: 1px solid rgba(80,180,180,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">User Email</td>
                        <td style="padding: 12px 15px; color: #e0e0ff; font-size: 14px; text-align: right;">{user_email}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(80,180,180,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Requested Amount</td>
                        <td style="padding: 12px 15px; color: #00cccc; font-size: 16px; font-weight: bold; text-align: right;">{requested_amount:,.2f} Credits</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Reason</td>
                        <td style="padding: 12px 15px; color: #e0e0ff; font-size: 14px; text-align: right;">{reason or 'No reason provided'}</td>
                    </tr>
                </table>
                <p style="font-size: 13px; color: #5a5a8a; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                    Please log into the Admin Approval Desk to approve or reject this request.
                </p>
            </div>
            <div style="margin-top: 40px; border-top: 1px solid rgba(80,180,180,0.15); padding-top: 20px; text-align: center; font-size: 11px; color: #5a5a8a;">
                &copy; {datetime.now().year} StockVision Pro. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_html_email(admin_email, subject, html)

def send_credit_approval_user_email(email_to: str, approved_amount: float, new_balance: float) -> bool:
    subject = "Credits Added Successfully"
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d1a; color: #e0e0ff; padding: 40px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border: 1px solid rgba(80,180,80,0.25); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #4eff4e; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">Credits Approved</h2>
                <p style="color: #9090bb; font-size: 14px; margin: 5px 0 0 0;">StockVision Pro Wallet</p>
            </div>
            <div style="border-top: 1px solid rgba(80,180,80,0.15); padding-top: 30px;">
                <p style="font-size: 16px; line-height: 1.6; color: #e0e0ff; margin: 0 0 20px 0;">
                    Your StockVision Pro account has been credited with additional simulation credits.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(20,20,40,0.6); border-radius: 12px; border: 1px solid rgba(80,180,80,0.18); overflow: hidden;">
                    <tr style="border-bottom: 1px solid rgba(80,180,80,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Approved Credits</td>
                        <td style="padding: 12px 15px; color: #4eff4e; font-size: 16px; font-weight: bold; text-align: right;">+{approved_amount:,.2f} Credits</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">New Balance</td>
                        <td style="padding: 12px 15px; color: #e0e0ff; font-size: 16px; font-weight: bold; text-align: right;">{new_balance:,.2f} Credits</td>
                    </tr>
                </table>
                <p style="font-size: 14px; line-height: 1.6; color: #9090bb; margin: 20px 0 0 0;">
                    These simulated credits are now ready for testing virtual trades.
                </p>
            <div style="margin-top: 40px; border-top: 1px solid rgba(80,180,80,0.15); padding-top: 20px; text-align: center; font-size: 11px; color: #5a5a8a;">
                &copy; {datetime.now().year} StockVision Pro. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_html_email(email_to, subject, html)

def send_credit_rejection_user_email(email_to: str, requested_amount: float, rejection_reason: str) -> bool:
    subject = "Credits Request Update"
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d1a; color: #e0e0ff; padding: 40px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border: 1px solid rgba(220,80,80,0.25); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #ff5e5e; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">Request Rejected</h2>
                <p style="color: #9090bb; font-size: 14px; margin: 5px 0 0 0;">StockVision Pro Wallet</p>
            </div>
            <div style="border-top: 1px solid rgba(220,80,80,0.15); padding-top: 30px;">
                <p style="font-size: 16px; line-height: 1.6; color: #e0e0ff; margin: 0 0 20px 0;">
                    Your request for additional simulation credits has been reviewed and rejected by the administrator.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(20,20,40,0.6); border-radius: 12px; border: 1px solid rgba(220,80,80,0.18); overflow: hidden;">
                    <tr style="border-bottom: 1px solid rgba(220,80,80,0.1);">
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Requested Credits</td>
                        <td style="padding: 12px 15px; color: #ff5e5e; font-size: 16px; font-weight: bold; text-align: right;">{requested_amount:,.2f} Credits</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; color: #9090bb; font-size: 14px; font-weight: 600;">Rejection Reason</td>
                        <td style="padding: 12px 15px; color: #e0e0ff; font-size: 14px; font-weight: 600; text-align: right;">{rejection_reason}</td>
                    </tr>
                </table>
            </div>
            <div style="margin-top: 40px; border-top: 1px solid rgba(220,80,80,0.15); padding-top: 20px; text-align: center; font-size: 11px; color: #5a5a8a;">
                &copy; {datetime.now().year} StockVision Pro. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_html_email(email_to, subject, html)

