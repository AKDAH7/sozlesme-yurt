# User Guide (Admin & Business)

This guide explains how to use the website as:

- **Admin users** (internal staff)
- **Business users** (company accounts)

> Terminology
>
> - **Template**: HTML layout used to generate PDFs.
> - **Document**: A record created from a template and customer data.
> - **PDF**: The generated output saved for a document.

---

## 1) Access & Roles

### Sign in / Sign out

- Use the **Login** page to sign in.
- Use **Logout** to sign out.

### Permissions (high level)

- Admins can manage templates, users, companies, documents, reports, and accounting depending on assigned permissions.
- Business users typically have access to the documents related to their company, and can view PDFs once generated.

If you see “Access denied” or missing buttons, your account may not have the required permission.

---

## 2) Dashboard Overview

The dashboard provides quick access to:

- **Documents** (create, view, generate PDFs)
- **Templates** (create/edit HTML templates)
- **Companies** (company list and details)
- **Reports** (financial summaries)
- **Accounting** (payments and payment status)
- **Notifications** (alerts like “PDF generated”)

---

## 3) Templates (Admin)

Templates define how PDFs look. They contain:

- **HTML content**
- **Variables (placeholders)** such as `{{owner_full_name}}`

### Create a template

1. Open **Templates** → **Create template**.
2. Fill in:
   - **Name** and optional **Description**
   - **Language** (`multi`, `tr`, `en`, `ar`)
   - **HTML content**
3. Add at least one **Variable**:
   - **Key** must be alphanumeric/underscore (example: `owner_full_name`)
   - **Label** (human-readable)
   - If **Language = multi**, fill the per-language labels (TR/EN/AR) as needed
4. Click **Create**.

### Edit a template

- Open **Templates** → **Edit**.
- Saving a template creates a **new version**.

#### Translated variable labels

- When editing a template, the TR/EN/AR variable label fields should be **pre-filled** (you shouldn’t need to re-enter them).

### Template placeholders

Use placeholders in HTML like:

- `{{owner_full_name}}`, `{{owner_identity_no}}`, `{{issue_date}}`

There are also built-in “system” placeholders (examples):

- `{{stamp_data_url}}`, `{{qr_data_url}}`, `{{barcode_data_url}}`
- `{{verification_url}}`, `{{verification_path}}`

### Upload & embed images into a template

You can upload an image and embed it directly into the template HTML.

1. In the template editor, under **HTML content**, choose an image file.
2. Click **Upload image**.
3. The editor inserts an `<img>` tag into your HTML at the cursor position.

Notes:

- Keep image files reasonably small (there is a size limit on uploads).
- Uploaded images are embedded reliably into PDFs.

---

## 4) Documents & PDF Generation

### Create a document (Admin)

1. Go to **Documents** → **New**.
2. Select a **Template** (or use the default).
3. Fill in customer/document fields.
4. Submit to create the document.

### Generate or re-generate the PDF

- On a document details screen, click **Generate PDF**.
- If a PDF already exists, you can **Regenerate**.

Important behavior:

- When re-generating a PDF, it will use the **latest version** of the selected template format.

### PDF date format

Dates in generated PDFs are formatted as:

- `dd.mm.yyyy`

---

## 5) Verification (Public/External)

The system supports verifying a document using a token/reference.

- Enter the reference and identity number as prompted.
- If available, you can download the public PDF.

---

## 6) Notifications

Notifications appear in the top menu. Common notifications include:

- PDF generation completion (for example, a company being notified when a PDF is ready)

You can open the notifications menu to:

- View recent notifications
- Mark items as read

---

## 7) Accounting & Payments (Admin)

### View accounting documents

Go to **Accounting** to:

- Filter by company
- Filter by payment group (paid/unpaid)
- Filter by date range

### Receive payment

1. Select one or more documents.
2. Enter amount, method, date, receipt number, and note as needed.
3. Submit the payment.

The system updates payment status accordingly.

---

## 8) Troubleshooting

### “PDF generated but images are missing”

- If your template uses uploaded images, ensure they were inserted via the template image upload.
- PDFs should embed those images automatically.

### “I can’t see a menu / button”

- Your role may not have the required permission. Ask an admin to update your access.

### “Template preview looks different from PDF”

- PDF rendering uses a headless browser and print settings; always validate with a generated PDF.

---

## 9) Quick Tips

- Prefer consistent placeholder keys (snake_case).
- Keep template HTML clean and test with Template Preview.
- When updating templates, regenerate a PDF to apply the newest format.
