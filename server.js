const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require("path");
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const archiver = require("archiver");
const { exec } = require("child_process");
const ExcelJS = require("exceljs");
const pptxgen = require("pptxgenjs");
const puppeteer = require("puppeteer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({
  dest: uploadDir
});


const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;
const { Document, Packer, Paragraph, TextRun } = require("docx");

const app = express();
const upload = multer({ dest: 'uploads/' });

const mammoth = require("mammoth");
const PDFKit = require("pdfkit");

app.use(express.static('public'));
app.use(express.json());

app.use(session({
  secret: "hellopdf-secret",
  resave: false,
  saveUninitialized: false
}));

app.get('/', (req, res) => {
  res.send("Server Running...");
});


app.post('/merge', upload.array('pdfs'), async (req, res) => {
  try {

    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Please upload at least 2 PDF files");
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {

      const fileBytes = fs.readFileSync(file.path);

      const pdf = await PDFDocument.load(fileBytes);

      const copiedPages = await mergedPdf.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });

      fs.unlinkSync(file.path);
    }

    const pdfBytes = await mergedPdf.save();

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=merged.pdf"
    );

    return res.end(Buffer.from(pdfBytes));

  } catch (err) {

    console.error("MERGE ERROR:", err);

    return res.status(500).send("Merge failed");
  }
});


// ✅ SPLIT PDF
app.post('/split', upload.single('pdf'), async (req, res) => {
  try {
    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const outputDir = `outputs/split_${Date.now()}`;
    fs.mkdirSync(outputDir);

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);

      const pdfBytes = await newPdf.save();
      fs.writeFileSync(`${outputDir}/page_${i + 1}.pdf`, pdfBytes);
    }

    const zipPath = `${outputDir}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(outputDir, false);
    await archive.finalize();

    output.on("close", () => {
      res.download(zipPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Split failed");
  }
});

app.post('/pdf-to-image', upload.single('pdf'), async (req, res) => {
  try {

    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const outputDir = `outputs/images_${Date.now()}`;
    fs.mkdirSync(outputDir);

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {

      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);

      const pdfBytes = await newPdf.save();

      fs.writeFileSync(`${outputDir}/page_${i + 1}.pdf`, pdfBytes);
    }

    const zipPath = `${outputDir}.zip`;

    const output = fs.createWriteStream(zipPath);
    const archive = require("archiver")("zip");

    archive.pipe(output);
    archive.directory(outputDir, false);
    await archive.finalize();

    output.on("close", () => {
      res.download(zipPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Conversion failed");
  }
});

// ✅ REMOVE PAGES
app.post('/remove-pages', upload.single('pdf'), async (req, res) => {
  try {
    const pagesToRemove = req.body.pages.split(',').map(p => parseInt(p.trim()) - 1);

    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const newPdf = await PDFDocument.create();

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      if (!pagesToRemove.includes(i)) {
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);
      }
    }

    const pdfBytes = await newPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=updated.pdf');
    res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error(err);
    res.status(500).send("Remove failed");
  }
});


// ✅ ROTATE PDF
app.post('/rotate', upload.single('pdf'), async (req, res) => {
  try {

    const angle = parseInt(req.body.angle);

    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      page.setRotation(degrees(angle));
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=rotated.pdf"
    );

    res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("ROTATE ERROR:", err);
    res.status(500).send("Rotate failed");
  }
});


app.post('/watermark', upload.single('pdf'), async (req, res) => {
  try {

    const { text, size, opacity } = req.body;

    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    pdfDoc.getPages().forEach(page => {

      const { width, height } = page.getSize();

      page.drawText(text, {
        x: width / 3,
        y: height / 2,
        size: parseInt(size),
        color: rgb(0.7, 0.7, 0.7),
        rotate: degrees(45),
        opacity: parseFloat(opacity)
      });

    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=watermarked.pdf');

    res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error(err);
    res.status(500).send("Watermark failed");
  }
});


// ✅ COMPRESS (Ghostscript required)
const gsPath = `"C:\\Program Files\\gs\\gs10.07.0\\bin\\gswin64c.exe"`; // apka path

app.post('/compress', upload.single('pdf'), (req, res) => {

  const input = req.file.path;
  const output = `outputs/compressed_${Date.now()}.pdf`;

  const cmd = `${gsPath} -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${output}" "${input}"`;

  exec(cmd, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Compress failed");
    }

    res.download(output);
  });
});

app.post('/pdf-to-word', upload.single('pdf'), async (req, res) => {
  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(pdfBuffer);

    const text = data.text || "No readable text found in this PDF.";

    const paragraphs = text
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(line =>
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              size: 24
            })
          ]
        })
      );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=converted.docx"
    );

    return res.end(buffer);

  } catch (err) {
    console.error("PDF TO WORD ERROR MESSAGE:", err.message);
    console.error("PDF TO WORD FULL ERROR:", err);
    return res.status(500).send(err.message);
  }
});

app.post("/word-to-pdf", upload.single("wordFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const inputPath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext !== ".docx") {
      fs.unlinkSync(inputPath);
      return res.status(400).send("Only DOCX file allowed");
    }

    const result = await mammoth.extractRawText({ path: inputPath });
    const text = result.value || "";

    if (!text.trim()) {
      fs.unlinkSync(inputPath);
      return res.status(400).send("Word file text is empty");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=converted.pdf");

    const doc = new PDFKit({
      size: "A4",
      margin: 50
    });

    doc.pipe(res);

    doc.fontSize(18).text("Converted Word Document", {
      align: "center"
    });

    doc.moveDown();

    doc.fontSize(12).text(text, {
      align: "left",
      lineGap: 4
    });

    doc.end();

    // ✅ IMPORTANT: file delete AFTER response finish
    res.on("finish", () => {
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    });

  } catch (err) {
    console.error("WORD TO PDF FULL ERROR:", err);
    return res.status(500).send("Word to PDF failed");
  }
});

app.post("/extract-pages", upload.single("pdfFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    const inputPath = req.file.path;
    const pagesInput = req.body.pages;

    if (!pagesInput || !pagesInput.trim()) {
      fs.unlinkSync(inputPath);
      return res.status(400).send("Please enter page numbers");
    }

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const selectedPages = [];

    pagesInput.split(",").forEach(part => {
      part = part.trim();

      if (part.includes("-")) {
        const [start, end] = part.split("-").map(num => parseInt(num.trim()));

        if (!start || !end || start > end) {
          throw new Error("Invalid page range");
        }

        for (let i = start; i <= end; i++) {
          selectedPages.push(i);
        }
      } else {
        const pageNum = parseInt(part);

        if (!pageNum) {
          throw new Error("Invalid page number");
        }

        selectedPages.push(pageNum);
      }
    });

    const uniquePages = [...new Set(selectedPages)];

    for (const page of uniquePages) {
      if (page < 1 || page > totalPages) {
        fs.unlinkSync(inputPath);
        return res.status(400).send(`Page ${page} does not exist. This PDF has ${totalPages} pages.`);
      }
    }

    const newPdf = await PDFDocument.create();

    for (const pageNum of uniquePages) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
      newPdf.addPage(copiedPage);
    }

    const finalPdfBytes = await newPdf.save();

    fs.unlinkSync(inputPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=extracted-pages.pdf");

    return res.end(Buffer.from(finalPdfBytes));

  } catch (err) {
    console.error("EXTRACT PAGES ERROR:", err);
    return res.status(500).send("Extract pages failed");
  }
});

app.post("/reorder-pages", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;
    const orderInput = req.body.order;

    if (!orderInput || !orderInput.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("Please enter page order");
    }

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const orderArray = orderInput
      .split(",")
      .map(num => parseInt(num.trim(), 10));

    for (const page of orderArray) {
      if (isNaN(page) || page < 1 || page > totalPages) {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        return res.status(400).send(`Invalid page number: ${page}`);
      }
    }

    const newPdf = await PDFDocument.create();

    for (const pageNum of orderArray) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
      newPdf.addPage(copiedPage);
    }

    const finalPdf = await newPdf.save();

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=reordered.pdf");

    return res.end(Buffer.from(finalPdf));

  } catch (err) {
    console.error("REORDER ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("Reorder pages failed");
  }
});

app.post("/add-page-numbers", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    pages.forEach((page, index) => {
      const { width } = page.getSize();

      page.drawText(`${index + 1}`, {
        x: width / 2 - 6,
        y: 25,
        size: 12,
        color: rgb(0, 0, 0),
      });
    });

    const finalPdf = await pdfDoc.save();

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=page-numbers.pdf");

    return res.end(Buffer.from(finalPdf));

  } catch (err) {
    console.error("PAGE NUMBERS ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("Add page numbers failed");
  }
});

app.post("/protect-pdf", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const password = req.body.password;

    if (!password || !password.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("Please enter a password");
    }

    if (!fs.existsSync("outputs")) {
      fs.mkdirSync("outputs");
    }

    outputPath = path.join(__dirname, "outputs", `protected-${Date.now()}.pdf`);

    const safePassword = password.replace(/"/g, "");

    const gsCommands = [
      `gswin64c -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dNOPAUSE -dQUIET -dBATCH -sOwnerPassword="${safePassword}" -sUserPassword="${safePassword}" -dEncryptionR=3 -dKeyLength=128 -sOutputFile="${outputPath}" "${inputPath}"`,
      `gswin32c -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dNOPAUSE -dQUIET -dBATCH -sOwnerPassword="${safePassword}" -sUserPassword="${safePassword}" -dEncryptionR=3 -dKeyLength=128 -sOutputFile="${outputPath}" "${inputPath}"`,
      `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dNOPAUSE -dQUIET -dBATCH -sOwnerPassword="${safePassword}" -sUserPassword="${safePassword}" -dEncryptionR=3 -dKeyLength=128 -sOutputFile="${outputPath}" "${inputPath}"`
    ];

    const runGhostscript = (commands, index = 0) => {
      if (index >= commands.length) {
        throw new Error("Ghostscript not found");
      }

      return new Promise((resolve, reject) => {
        exec(commands[index], (error) => {
          if (error) {
            if (index < commands.length - 1) {
              runGhostscript(commands, index + 1).then(resolve).catch(reject);
            } else {
              reject(error);
            }
          } else {
            resolve();
          }
        });
      });
    };

    await runGhostscript(gsCommands);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Protected PDF was not created");
    }

    res.download(outputPath, "protected.pdf", (err) => {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      if (err) {
        console.error("PROTECT PDF DOWNLOAD ERROR:", err);
      }
    });

  } catch (err) {
    console.error("PROTECT PDF ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    return res.status(500).send("Protect PDF failed. Make sure Ghostscript is installed.");
  }
});

app.post("/unlock-pdf", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const password = req.body.password;

    if (!password || !password.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("Please enter PDF password");
    }

    if (!fs.existsSync("outputs")) {
      fs.mkdirSync("outputs");
    }

    outputPath = path.join(__dirname, "outputs", `unlocked-${Date.now()}.pdf`);

    const safePassword = password.replace(/"/g, "");

    const gsCommands = [
      `gswin64c -sDEVICE=pdfwrite -dNOPAUSE -dQUIET -dBATCH -sPDFPassword="${safePassword}" -sOutputFile="${outputPath}" "${inputPath}"`,
      `gswin32c -sDEVICE=pdfwrite -dNOPAUSE -dQUIET -dBATCH -sPDFPassword="${safePassword}" -sOutputFile="${outputPath}" "${inputPath}"`,
      `gs -sDEVICE=pdfwrite -dNOPAUSE -dQUIET -dBATCH -sPDFPassword="${safePassword}" -sOutputFile="${outputPath}" "${inputPath}"`
    ];

    const runGhostscript = (commands, index = 0) => {
      return new Promise((resolve, reject) => {
        if (index >= commands.length) {
          return reject(new Error("Ghostscript not found or wrong password"));
        }

        exec(commands[index], (error) => {
          if (error) {
            runGhostscript(commands, index + 1).then(resolve).catch(reject);
          } else {
            resolve();
          }
        });
      });
    };

    await runGhostscript(gsCommands);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Unlocked PDF was not created");
    }

    res.download(outputPath, "unlocked.pdf", (err) => {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      if (err) {
        console.error("UNLOCK PDF DOWNLOAD ERROR:", err);
      }
    });

  } catch (err) {
    console.error("UNLOCK PDF ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    return res.status(500).send("Unlock PDF failed. Please check password or Ghostscript.");
  }
});

app.post("/pdf-to-excel", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    if (!fs.existsSync("outputs")) {
      fs.mkdirSync("outputs");
    }

    outputPath = path.join(__dirname, "outputs", `pdf-to-excel-${Date.now()}.xlsx`);

    const pdfBuffer = fs.readFileSync(inputPath);
    const data = await pdfParse(pdfBuffer);

    const text = data.text || "";

    if (!text.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("No readable text found in this PDF");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PDF Data");

    worksheet.columns = [
      { header: "Line No.", key: "lineNo", width: 12 },
      { header: "Text", key: "text", width: 100 }
    ];

    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    lines.forEach((line, index) => {
      worksheet.addRow({
        lineNo: index + 1,
        text: line
      });
    });

    worksheet.getRow(1).font = { bold: true };

    await workbook.xlsx.writeFile(outputPath);

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    res.download(outputPath, "converted.xlsx", (err) => {
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      if (err) {
        console.error("PDF TO EXCEL DOWNLOAD ERROR:", err);
      }
    });

  } catch (err) {
    console.error("PDF TO EXCEL ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    return res.status(500).send("PDF to Excel failed");
  }
});

app.post("/excel-to-pdf", upload.single("excelFile"), async (req, res) => {
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No Excel file uploaded");
    }

    inputPath = req.file.path;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputPath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      fs.unlinkSync(inputPath);
      return res.status(400).send("No worksheet found in Excel file");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=converted.pdf");

    const doc = new PDFKit({
      margin: 40,
      size: "A4"
    });

    doc.pipe(res);

    let y = 50;

    worksheet.eachRow((row, rowNumber) => {
      const rowText = row.values
        .slice(1)
        .map(cell => (cell ? cell.toString() : ""))
        .join("   |   ");

      doc.fontSize(10).text(rowText, 40, y);

      y += 20;

      if (y > 750) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();

    res.on("finish", () => {
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    });

  } catch (err) {
    console.error("EXCEL TO PDF ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("Excel to PDF failed");
  }
});

app.post("/ocr-pdf", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    inputPath = req.file.path;

    const { createWorker } = require("tesseract.js");

    const worker = await createWorker("eng");

    const { data: { text } } = await worker.recognize(inputPath);

    await worker.terminate();

    if (!text || !text.trim()) {
      fs.unlinkSync(inputPath);
      return res.status(400).send("No readable text found");
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=ocr.txt");

    res.send(text);

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

  } catch (err) {
    console.error("OCR ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("OCR failed");
  }
});

app.post("/pdf-to-powerpoint", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    if (!fs.existsSync("outputs")) {
      fs.mkdirSync("outputs");
    }

    outputPath = path.join(__dirname, "outputs", `pdf-to-powerpoint-${Date.now()}.pptx`);

    const pdfBuffer = fs.readFileSync(inputPath);
    const data = await pdfParse(pdfBuffer);
    const text = data.text || "";

    if (!text.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("No readable text found in this PDF");
    }

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "HelloPDF";

    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const maxLinesPerSlide = 10;

    for (let i = 0; i < lines.length; i += maxLinesPerSlide) {
      const slideLines = lines.slice(i, i + maxLinesPerSlide);
      const slide = pptx.addSlide();

      slide.background = { color: "FFFFFF" };

      slide.addText(`PDF to PowerPoint`, {
        x: 0.5,
        y: 0.3,
        w: 12,
        h: 0.5,
        fontSize: 24,
        bold: true,
        color: "111827"
      });

      slide.addText(slideLines.join("\n"), {
        x: 0.7,
        y: 1.1,
        w: 12,
        h: 5.5,
        fontSize: 16,
        color: "333333",
        breakLine: false,
        fit: "shrink"
      });
    }

    await pptx.writeFile({ fileName: outputPath });

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    res.download(outputPath, "converted.pptx", (err) => {
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      if (err) {
        console.error("PDF TO POWERPOINT DOWNLOAD ERROR:", err);
      }
    });

  } catch (err) {
    console.error("PDF TO POWERPOINT ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    return res.status(500).send("PDF to PowerPoint failed");
  }
});

app.post("/powerpoint-to-pdf", upload.single("pptFile"), async (req, res) => {
  let inputPath = null;
  let fixedInputPath = null;
  let finalPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PowerPoint file uploaded");
    }

    inputPath = req.file.path;

    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext !== ".ppt" && ext !== ".pptx") {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("Only PPT or PPTX files are allowed");
    }

    if (!fs.existsSync("outputs")) {
      fs.mkdirSync("outputs");
    }

    fixedInputPath = path.join(__dirname, "uploads", `powerpoint-${Date.now()}${ext}`);
    fs.renameSync(inputPath, fixedInputPath);

    const outputDir = path.join(__dirname, "outputs");

    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;

    const command = `${sofficePath} --headless --convert-to pdf --outdir "${outputDir}" "${fixedInputPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("PPT TO PDF ERROR:", error);
        console.error("STDERR:", stderr);

        if (fixedInputPath && fs.existsSync(fixedInputPath)) fs.unlinkSync(fixedInputPath);

        return res.status(500).send("Conversion failed. LibreOffice path issue.");
      }

      const outputFileName = path.basename(fixedInputPath, ext) + ".pdf";
      finalPath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(finalPath)) {
        console.error("PDF NOT FOUND:", finalPath);
        console.error("STDOUT:", stdout);
        console.error("STDERR:", stderr);

        if (fixedInputPath && fs.existsSync(fixedInputPath)) fs.unlinkSync(fixedInputPath);

        return res.status(500).send("PDF not created");
      }

      res.download(finalPath, "converted.pdf", (err) => {
        if (fixedInputPath && fs.existsSync(fixedInputPath)) fs.unlinkSync(fixedInputPath);
        if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);

        if (err) {
          console.error("PPT DOWNLOAD ERROR:", err);
        }
      });
    });

  } catch (err) {
    console.error("PPT TO PDF FULL ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fixedInputPath && fs.existsSync(fixedInputPath)) fs.unlinkSync(fixedInputPath);
    if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);

    return res.status(500).send("PowerPoint to PDF failed");
  }
});

app.post("/pdf-to-jpg", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputDir = null;
  let zipPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");

    outputDir = path.join(__dirname, "outputs", `jpg-${Date.now()}`);
    fs.mkdirSync(outputDir);

    const outputPattern = path.join(outputDir, "page-%03d.jpg");
    zipPath = path.join(__dirname, "outputs", `jpg-images-${Date.now()}.zip`);

    const commands = [
      `gswin64c -dNOPAUSE -dBATCH -sDEVICE=jpeg -r200 -sOutputFile="${outputPattern}" "${inputPath}"`,
      `gswin32c -dNOPAUSE -dBATCH -sDEVICE=jpeg -r200 -sOutputFile="${outputPattern}" "${inputPath}"`,
      `gs -dNOPAUSE -dBATCH -sDEVICE=jpeg -r200 -sOutputFile="${outputPattern}" "${inputPath}"`
    ];

    const runGS = (index = 0) => {
      return new Promise((resolve, reject) => {
        if (index >= commands.length) return reject(new Error("Ghostscript not found"));

        exec(commands[index], (error) => {
          if (error) {
            runGS(index + 1).then(resolve).catch(reject);
          } else {
            resolve();
          }
        });
      });
    };

    await runGS();

    const files = fs.readdirSync(outputDir).filter(file => file.endsWith(".jpg"));

    if (files.length === 0) {
      throw new Error("No JPG images created");
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    files.forEach(file => {
      archive.file(path.join(outputDir, file), { name: file });
    });

    await archive.finalize();

    output.on("close", () => {
      res.download(zipPath, "pdf-to-jpg.zip", (err) => {
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

        if (outputDir && fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }

        if (err) console.error("PDF TO JPG DOWNLOAD ERROR:", err);
      });
    });

  } catch (err) {
    console.error("PDF TO JPG ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return res.status(500).send("PDF to JPG failed. Make sure Ghostscript is installed.");
  }
});

app.post("/jpg-to-pdf", upload.array("jpgFiles"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No JPG files uploaded");
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext !== ".jpg" && ext !== ".jpeg") {
        req.files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
        return res.status(400).send("Only JPG or JPEG files are allowed");
      }

      const imageBytes = fs.readFileSync(file.path);
      const jpgImage = await pdfDoc.embedJpg(imageBytes);

      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgImage.width,
        height: jpgImage.height
      });
    }

    const pdfBytes = await pdfDoc.save();

    req.files.forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=jpg-to-pdf.pdf");

    return res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("JPG TO PDF ERROR:", err);

    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    return res.status(500).send("JPG to PDF failed");
  }
});

app.post("/pdf-to-png", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputDir = null;
  let zipPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");

    outputDir = path.join(__dirname, "outputs", `png-${Date.now()}`);
    fs.mkdirSync(outputDir);

    const outputPattern = path.join(outputDir, "page-%03d.png");
    zipPath = path.join(__dirname, "outputs", `png-images-${Date.now()}.zip`);

    const commands = [
      `gswin64c -dNOPAUSE -dBATCH -sDEVICE=pngalpha -r200 -sOutputFile="${outputPattern}" "${inputPath}"`,
      `gswin32c -dNOPAUSE -dBATCH -sDEVICE=pngalpha -r200 -sOutputFile="${outputPattern}" "${inputPath}"`,
      `gs -dNOPAUSE -dBATCH -sDEVICE=pngalpha -r200 -sOutputFile="${outputPattern}" "${inputPath}"`
    ];

    const runGS = (index = 0) => {
      return new Promise((resolve, reject) => {
        if (index >= commands.length) {
          return reject(new Error("Ghostscript not found"));
        }

        exec(commands[index], (error) => {
          if (error) {
            runGS(index + 1).then(resolve).catch(reject);
          } else {
            resolve();
          }
        });
      });
    };

    await runGS();

    const files = fs.readdirSync(outputDir).filter(file => file.endsWith(".png"));

    if (files.length === 0) {
      throw new Error("No PNG images created");
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    files.forEach(file => {
      archive.file(path.join(outputDir, file), { name: file });
    });

    await archive.finalize();

    output.on("close", () => {
      res.download(zipPath, "pdf-to-png.zip", (err) => {
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

        if (outputDir && fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }

        if (err) console.error("PDF TO PNG DOWNLOAD ERROR:", err);
      });
    });

  } catch (err) {
    console.error("PDF TO PNG ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return res.status(500).send("PDF to PNG failed. Make sure Ghostscript is installed.");
  }
});

app.post("/html-to-pdf", express.urlencoded({ extended: true, limit: "10mb" }), async (req, res) => {
  let browser = null;

  try {
    const htmlCode = req.body.htmlCode;

    if (!htmlCode || !htmlCode.trim()) {
      return res.status(400).send("Please enter HTML code");
    }

    browser = await puppeteer.launch({
      headless: true
    });

    const page = await browser.newPage();

    await page.setContent(htmlCode, {
      waitUntil: "networkidle0"
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm"
      }
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=html-to-pdf.pdf");

    return res.end(pdfBuffer);

  } catch (err) {
    console.error("HTML TO PDF ERROR:", err);

    if (browser) {
      await browser.close();
    }

    return res.status(500).send("HTML to PDF failed");
  }
});

app.post("/pdf-to-text", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const pdfBuffer = fs.readFileSync(inputPath);
    const data = await pdfParse(pdfBuffer);

    const text = data.text || "";

    if (!text.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("No readable text found in this PDF");
    }

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=pdf-text.txt");

    return res.send(text);

  } catch (err) {
    console.error("PDF TO TEXT ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("PDF to Text failed");
  }
});

app.post("/image-to-pdf", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No images uploaded");
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const imageBytes = fs.readFileSync(file.path);

      let image;

      if (ext === ".jpg" || ext === ".jpeg") {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (ext === ".png") {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        req.files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        return res.status(400).send("Only JPG, JPEG, and PNG images are allowed");
      }

      const page = pdfDoc.addPage([image.width, image.height]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      });
    }

    const pdfBytes = await pdfDoc.save();

    req.files.forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=image-to-pdf.pdf");

    return res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("IMAGE TO PDF ERROR:", err);

    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    return res.status(500).send("Image to PDF failed");
  }
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Missing fields");
  }

  const users = JSON.parse(fs.readFileSync("users.json"));

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).send("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ email, password: hashedPassword });

  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  res.send("Signup successful");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const users = JSON.parse(fs.readFileSync("users.json"));

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).send("User not found");
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(400).send("Wrong password");
  }

  req.session.user = { email };

  res.send("Login successful");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("Logged out");
});

app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// 🚀 START SERVER
app.listen(3000, () => {
  console.log("Server running on port 3000");
});