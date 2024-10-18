require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mammoth = require("mammoth");

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

if (pool) {
    console.log("Database connected successfully");
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ADMIN_KEY = 'jZGexbjKDY2yXoL24ohWdF0ZUhrzlQ19';
const secretKey = process.env.SECRET_KEY;
const port = process.env.PORT || 3000;

// Email settings
const smtpServer = 'smtp.gmail.com';
const smtpPort = 587;
const fromEmail = 'kireetir2005@gmail.com';
const emailPassword = 'fxrp dxxc rjwm mtop';

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: smtpServer,
    port: smtpPort,
    secure: false, // true for 465, false for other ports
    auth: {
        user: fromEmail,
        pass: emailPassword
    }
});

app.use(express.static(__dirname + '/css_files'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Assuming your JWT payload looks like { userId: user.id, username: user.email }
        req.user = decoded;

        // Debugging log
        console.log('Decoded token:', decoded);

        next();
    });
}

app.get('/', async (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/login.html', async (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/user_dashboard.html', (req, res) => {
    res.sendFile(__dirname + '/user_dashboard.html');
});

app.get('/dashboard.html', async (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

app.get('/signup.html', async (req, res) => {
    res.sendFile(__dirname + '/signup.html');
});

app.get('/Modern_nursing_resume.docx', (req, res) => {
    const fileName = 'Modern_nursing_resume.docx'; // Ensure this matches the actual filename
    const filePath = path.join(__dirname, fileName); // Adjust path as per your file storage

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        // Set the appropriate headers for download
        res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); // Adjust content type as per your file type

        // Stream the file to the client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.post('/signup', async (req, res) => {
    const { firstName, lastName, address, username, password, adminKey  } = req.body;


    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if the email already exists in both admin and user tables
        const adminExists = await client.query('SELECT * FROM ADMIN_AUTHENTICATION WHERE email = $1', [username]);
        const userExists = await client.query('SELECT * FROM USER_AUTHENTICATION WHERE email = $1', [username]);

        if (adminExists.rows.length > 0 || userExists.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already exists as a user or admin' });
        }

        if (adminKey) {
            // Admin registration
            if (ADMIN_KEY !== adminKey) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Invalid Admin Key' });
            }

            // Insert the new admin into the ADMIN_AUTHENTICATION table
            await client.query(
                'INSERT INTO ADMIN_AUTHENTICATION (F_NAME, L_NAME, ADDRESS, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [firstName, lastName, address, username, hashedPassword]
            );
        } else {
            // User registration
            // Insert the new user into the USER_AUTHENTICATION table
            await client.query(
                'INSERT INTO USER_AUTHENTICATION (F_NAME, L_NAME, ADDRESS, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [firstName, lastName, address, username, hashedPassword]
            );

            // Insert the new user's email into the USER_FILES table
            await client.query(
                'INSERT INTO USER_FILES (email) VALUES ($1)',
                [username]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'User created successfully', redirectTo: '/login.html' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});





app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if the user is an admin
        const adminResult = await pool.query('SELECT * FROM ADMIN_AUTHENTICATION WHERE email = $1', [username]);
        if (adminResult.rows.length > 0) {
            const admin = adminResult.rows[0];
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ userId: admin.id, email: admin.email }, secretKey, { expiresIn: '1h' });
            res.cookie('token', token, { httpOnly: true });
            return res.status(200).json({ message: 'Logged in successfully', redirectTo: '/dashboard.html' });
        }

        // Check if the user is a regular user
        const userResult = await pool.query('SELECT * FROM USER_AUTHENTICATION WHERE email = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, secretKey, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.status(200).json({ message: 'Logged in successfully', redirectTo: '/user_dashboard.html' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to upload files
app.post('/user_dashboard', authenticateToken, upload.fields([{ name: 'X_CER' }, { name: 'XII_CER' }, { name: 'UG_CER' }]), async (req, res) => {
    try {
        const X_CER = req.files['X_CER'] ? req.files['X_CER'][0] : null;
        const XII_CER = req.files['XII_CER'] ? req.files['XII_CER'][0] : null;
        const UG_CER = req.files['UG_CER'] ? req.files['UG_CER'][0] : null;
        const userEmail = req.user.email;

        console.log('Uploaded Files:', X_CER, XII_CER, UG_CER);
        console.log('User Email:', userEmail);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Construct the update query dynamically
            const queryFragments = [];
            const values = [];
            let paramIndex = 1;

            if (X_CER) {
                queryFragments.push(`X_CER_NAME = $${paramIndex++}, X_CER = $${paramIndex++}`);
                values.push(X_CER.originalname, X_CER.buffer);
            }

            if (XII_CER) {
                queryFragments.push(`XII_CER_NAME = $${paramIndex++}, XII_CER = $${paramIndex++}`);
                values.push(XII_CER.originalname, XII_CER.buffer);
            }

            if (UG_CER) {
                queryFragments.push(`UG_CER_NAME = $${paramIndex++}, UG_CER = $${paramIndex++}`);
                values.push(UG_CER.originalname, UG_CER.buffer);
            }

            // Add the email parameter
            values.push(userEmail);

            if (queryFragments.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const query = `
                UPDATE USER_FILES
                SET ${queryFragments.join(', ')}
                WHERE email = $${paramIndex}
            `;

            const result = await client.query(query, values);

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found or no changes made' });
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'File(s) uploaded successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error in transaction:', err.message);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error uploading files:', err.message);
        res.status(500).json({ error: 'Error uploading files' });
    }
});




// Endpoint to send reminder emails(ADMIN)
app.post('/send-reminder', (req, res) => {
    pool.query('SELECT USER_FILES.email, USER_FILES.X_CER, USER_FILES.XII_CER, USER_FILES.UG_CER, USER_FILES.X_CER_NAME, USER_FILES.XII_CER_NAME, USER_FILES.UG_CER_NAME, USER_AUTHENTICATION.F_NAME, USER_AUTHENTICATION.L_NAME FROM USER_FILES INNER JOIN USER_AUTHENTICATION ON USER_FILES.EMAIL = USER_AUTHENTICATION.EMAIL')
        .then(async result => {
            const students = result.rows;

            for (const student of students) {
                const email = student.email;
                const xCertMissing = student.x_cer == null;
                const xiiCertMissing = student.xii_cer == null;
                const ugCertMissing = student.ug_cer == null;

                const missingCerts = [];
                const invalidNames = [];
                const invalidFormats = [];
                const mismatchedFields = [];

                if (xCertMissing) missingCerts.push('X Certificate');
                if (xiiCertMissing) missingCerts.push('XII Certificate');
                if (ugCertMissing) missingCerts.push('UG Certificate');

                if (!/^X_CER\.docx$/i.test(student.x_cer_name)) invalidNames.push('X CERTIFICATE');
                if (!/^XII_CER\.docx$/i.test(student.xii_cer_name)) invalidNames.push('XII CERTIFICATE');
                if (!/^UG_CER\.docx$/i.test(student.ug_cer_name)) invalidNames.push('UG CERTIFICATE');

                // Check content of the documents
                const documents = [
                    { name: 'X Certificate', content: student.x_cer },
                    { name: 'XII Certificate', content: student.xii_cer },
                    { name: 'UG Certificate', content: student.ug_cer }
                ];

                for (const doc of documents) {
                    if (doc.content) {
                        const extractedText = await mammoth.extractRawText({ buffer: doc.content }).then(result => result.value);

                        // Check if required fields are present and valid
                        const requiredFields = {
                            'First Name': student.f_name,
                            'Last Name': student.l_name,
                        };

                        for (const [field, value] of Object.entries(requiredFields)) {
                            const regex = new RegExp(`${field}\\s*:\\s*${value}`, 'i'); // Adjusted regex to match with optional spaces
                            if (!regex.test(extractedText)) {
                                mismatchedFields.push(`${field} in ${doc.name}`);
                            }
                        }
                    }
                }

                const mailOptions = {
                    from: fromEmail,
                    to: email,
                    subject: 'Missing/Invalid Certificates',
                    text: ''
                };
                
                if (missingCerts.length > 0){
                    mailOptions.text = `Dear User,\n\nPlease upload the following documents for further verification:\n - Missing certificate(s): ${missingCerts.join(', ')}.\n`;
                }
                else if (invalidNames.length > 0 || mismatchedFields.length > 0) {
                    mailOptions.text = `Dear User,\n\nPlease address the following issues:\n`;
                    if (invalidNames.length > 0) mailOptions.text += `- Invalid document name(s): ${invalidNames.join(', ')}.\n`;
                    if (mismatchedFields.length > 0) mailOptions.text += `- Mismatched field(s): ${mismatchedFields.join(', ')}.\n`;
                    mailOptions.text += `\nBest regards, Kireeti`;
                } else {
                    mailOptions.text = `Dear User,\n\nThank you for uploading your documents.\n\nBest regards, Kireeti`;
                }

                // Send email
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Message sent: %s', info.messageId);
                    }
                });
            }

            res.status(200).send('Emails sent successfully');
        })
        .catch(err => {
            console.error(err.stack);
            res.status(500).send('Error retrieving data');
        });
});
app.get('/api/user-files', async (req, res) => {
    try {
        const result = await pool.query('SELECT USER_AUTHENTICATION.EMAIL, USER_AUTHENTICATION.F_NAME, USER_AUTHENTICATION.L_NAME, USER_AUTHENTICATION.ADDRESS, USER_FILES.x_cer_name, USER_FILES.xii_cer_name, USER_FILES.ug_cer_name FROM USER_FILES INNER JOIN USER_AUTHENTICATION ON USER_FILES.EMAIL = USER_AUTHENTICATION.EMAIL;');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully', redirectTo: '/login.html' });
    });

app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'This is a protected route', userId: req.userId });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});