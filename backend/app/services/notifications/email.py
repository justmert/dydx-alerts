from typing import Dict, Any
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.services.notifications.base import NotificationHandler
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailHandler(NotificationHandler):
    """Email notification handler using SMTP"""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL

    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """Send email notification"""
        to_email = config.get("to_email") or config.get("email")
        if not to_email:
            logger.error("Email address not provided in config")
            return False

        if not self.smtp_user or not self.smtp_password:
            logger.error("SMTP credentials not configured")
            return False

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg["Subject"] = self._extract_subject(message)

            # Plain text version
            text_part = MIMEText(message, "plain", "utf-8")
            msg.attach(text_part)

            # HTML version
            html_content = self._message_to_html(message)
            html_part = MIMEText(html_content, "html", "utf-8")
            msg.attach(html_part)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """Test email configuration"""
        test_message = (
            "✅ Test Alert from dYdX Alerts\n\n"
            "Your email notification channel is configured correctly and working!"
        )
        return await self.send(test_message, config)

    def _extract_subject(self, message: str) -> str:
        """Extract subject from message"""
        lines = message.split("\n")
        if lines:
            subject = lines[0].strip()
            # Remove emoji
            subject = subject.replace("⚠️", "").replace("🔴", "").strip()
            return subject
        return "dYdX Alerts"

    def _message_to_html(self, message: str) -> str:
        """Convert plain text message to HTML"""
        # Simple conversion - replace newlines with <br>
        html_message = message.replace("\n", "<br>")

        # Wrap in HTML template
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                }}
                .message {{
                    background-color: white;
                    padding: 20px;
                    border-radius: 5px;
                    border-left: 4px solid #3498db;
                }}
                .footer {{
                    margin-top: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="message">
                    {html_message}
                </div>
                <div class="footer">
                    <p>This alert was sent by dYdX Alerts</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html
