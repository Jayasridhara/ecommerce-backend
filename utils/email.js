const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ email, subject, message }) => {
  try {
    const msg = {
      to: email,
      from: process.env.EMAIL_USER, // must be verified in SendGrid
      subject: subject || "No Subject",
      html: message || "<p>No message provided</p>",
    };

    const info = await sgMail.send(msg);
    console.log("Email sent:", {
      statusCode: info[0].statusCode,
      messageId: info[0].headers["x-message-id"],
    });
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error("SendGrid response:", JSON.stringify(error.response.body, null, 2));
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
