import nodemailer from 'nodemailer';

export const sendEmail = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.SMTP_EMAIL_SERVICE,
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            },
            secure: false
        });

        console.log("transporter", transporter)

        const info =  await transporter.sendMail({
            from: {
                name: 'Youtube Clone',
                address: process.env.EMAIL
            },
            to: email,
            subject: subject,
            html: text
        });

        console.log("Message sent: ", info);
        return info;
    } catch (error) {
        throw new Error(error.message);
    }
}

export default sendEmail;