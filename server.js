const crypto = require("crypto");
const express = require("express");
const { reshape } = require("arabic-persian-reshaper");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, degrees } = require("pdf-lib");
const archiver = require("archiver");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const os = require("os");
async function processScannedPdf(pdfPath, worker, uploadsDir) {

  const tempPrefix = path.join(
    uploadsDir,
    `ocr-${Date.now()}`
  );

  await execAsync(
    `pdftoppm -png "${pdfPath}" "${tempPrefix}"`
  );

  const images = fs.readdirSync(uploadsDir)
    .filter(file => file.startsWith(path.basename(tempPrefix)))
    .sort();

  let extractedText = "";

for (const image of images) {

  const imagePath = path.join(uploadsDir, image);

try {

  const {
    data: { text }
  } = await worker.recognize(imagePath);

  extractedText += "\n\n" + (text?.trim() || "");

} finally {

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

}

}

return extractedText.trim();

}
async function processScannedPdf(pdfPath, worker, uploadsDir) {

  const outputPrefix = path.join(
    uploadsDir,
    `ocr-${Date.now()}`
  );

  await execAsync(
    `pdftoppm -png "${pdfPath}" "${outputPrefix}"`
  );

  const imageFiles = fs
    .readdirSync(uploadsDir)
    .filter(file =>
      file.startsWith(path.basename(outputPrefix))
    )
    .sort();

  let extractedText = "";

  for (const image of imageFiles) {

    const imagePath = path.join(
      uploadsDir,
      image
    );

    try {

      const {
        data: { text }
      } = await worker.recognize(imagePath);

      extractedText +=
        "\n\n" +
        (text?.trim() || "No text detected.");

    } finally {

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

    }

  }

  return extractedText.trim();

}


const ExcelJS = require("exceljs");
const pptxgen = require("pptxgenjs");
const puppeteer = require("puppeteer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");




const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;

const { Document, Packer, Paragraph, TextRun } = require("docx");
const mammoth = require("mammoth");
const PDFKit = require("pdfkit");

const app = express();

const uploadDir = path.join(__dirname, "uploads");
const outputsDir = path.join(__dirname, "outputs");
const usersFile = path.join(__dirname, "users.json");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

if (!fs.existsSync(outputsDir)) {
  fs.mkdirSync(outputsDir);
}

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  session({
    secret: "hellopdf-secret",
    resave: false,
    saveUninitialized: false
  })
);

app.get("/health", (req, res) => {
  res.send("Server Running");
});

app.post("/merge", upload.array("pdfs"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("MERGE USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}
// CHECK PREMIUM STATUS

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("PROFILE DATA =", profileData);
console.log("PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}
// CHECK TODAY USAGE
const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_merge")
  .eq("usage_date", today)
  .maybeSingle();

console.log("USAGE DATA =", usageData);
console.log("USAGE ERROR =", usageError);
    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Please upload at least 2 PDF files");
    }
    // FREE USER LIMIT CHECK

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF merges."
    );

  }

}

    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);

      const copiedPages = await mergedPdf.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    const pdfBytes = await mergedPdf.save();
    // CREATE OR UPDATE USAGE LOG

if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_merge",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("UPDATE ERROR =", updateError);

}
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");

    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("MERGE ERROR:", err);
    return res.status(500).send("Merge failed");
  }
});

app.post("/split", upload.single("pdf"), async (req, res) => {
  try { 
    const userId = req.body.user_id;

console.log("SPLIT USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("SPLIT PROFILE DATA =", profileData);
console.log("SPLIT PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}
const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_split")
  .eq("usage_date", today)
  .maybeSingle();

console.log("SPLIT USAGE DATA =", usageData);
console.log("SPLIT USAGE ERROR =", usageError);
// FREE USER LIMIT CHECK

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF splits."
    );

  }

}
    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const outputDir = path.join(outputsDir, `split_${Date.now()}`);
    fs.mkdirSync(outputDir);

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);

      const pdfBytes = await newPdf.save();
      fs.writeFileSync(path.join(outputDir, `page_${i + 1}.pdf`), pdfBytes);
    }

    const zipPath = `${outputDir}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(outputDir, false);
    await archive.finalize();

    output.on("close", async () => {

  // CREATE OR UPDATE USAGE LOG

  if (!usageData) {

    const { error: insertError } = await supabase
      .from("usage_logs")
      .insert([
        {
          user_id: userId,
          tool_name: "pdf_split",
          usage_date: today,
          usage_count: 1
        }
      ]);

    console.log("SPLIT INSERT ERROR =", insertError);

  } else {

    const { error: updateError } = await supabase
      .from("usage_logs")
      .update({
        usage_count: usageData.usage_count + 1
      })
      .eq("id", usageData.id);

    console.log("SPLIT UPDATE ERROR =", updateError);

  }

  res.download(zipPath);

});

} catch (err) {
  console.error("SPLIT ERROR:", err);
  res.status(500).send("Split failed");
}
});

app.post("/pdf-to-image", upload.single("pdf"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("PDF TO IMAGE USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("PDF TO IMAGE PROFILE DATA =", profileData);
console.log("PDF TO IMAGE PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_image")
  .eq("usage_date", today)
  .maybeSingle();

console.log("PDF TO IMAGE USAGE DATA =", usageData);
console.log("PDF TO IMAGE USAGE ERROR =", usageError);
if (!profileData.is_premium) {

  const currentUsage = usageData
    ? usageData.usage_count
    : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to Image conversions."
    );

  }

}
    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const outputDir = path.join(outputsDir, `images_${Date.now()}`);
    fs.mkdirSync(outputDir);

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);

      const pdfBytes = await newPdf.save();
      fs.writeFileSync(path.join(outputDir, `page_${i + 1}.pdf`), pdfBytes);
    }

    const zipPath = `${outputDir}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");

    archive.pipe(output);
    archive.directory(outputDir, false);
    await archive.finalize();

    output.on("close", async () => {

  if (!usageData) {

    const { error: insertError } =
      await supabase
        .from("usage_logs")
        .insert([
          {
            user_id: userId,
            tool_name: "pdf_to_image",
            usage_date: today,
            usage_count: 1
          }
        ]);

    console.log(
      "PDF TO IMAGE INSERT ERROR =",
      insertError
    );

  } else {

    const { error: updateError } =
      await supabase
        .from("usage_logs")
        .update({
          usage_count:
            usageData.usage_count + 1
        })
        .eq("id", usageData.id);

    console.log(
      "PDF TO IMAGE UPDATE ERROR =",
      updateError
    );

  }

  return res.download(
    zipPath,
    "pdf-images.zip"
  );

});
  } catch (err) {
    console.error("PDF TO IMAGE ERROR:", err);
    res.status(500).send("Conversion failed");
  }
});

app.post("/remove-pages", upload.single("pdf"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("REMOVE USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_remove_pages")
  .eq("usage_date", today)
  .maybeSingle();

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF tools."
    );

  }

}
    const pagesToRemove = req.body.pages
      .split(",")
      .map((p) => parseInt(p.trim()) - 1);

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

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=updated.pdf");
if (!usageData) {

  await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_remove_pages",
        usage_date: today,
        usage_count: 1
      }
    ]);

} else {

  await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

}
    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("REMOVE ERROR:", err);
    res.status(500).send("Remove failed");
  }
});

app.post("/rotate", upload.single("pdf"), async (req, res) => {
  try {
    const angle = parseInt(req.body.angle);

    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      page.setRotation(degrees(angle));
    });

    const pdfBytes = await pdfDoc.save();
const userId = req.body.user_id;

console.log("REMOVE USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_rotate")
  .eq("usage_date", today)
  .maybeSingle();
  

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF tools."
    );

  }

}
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=rotated.pdf");
if (!usageData) {

  await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_rotate",
        usage_date: today,
        usage_count: 1
      }
    ]);

} else {

  await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

}
    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("ROTATE ERROR:", err);
    res.status(500).send("Rotate failed");
  }
});

app.post("/watermark", upload.single("pdf"), async (req, res) => {
  try {
    const { text, size, opacity } = req.body;

    const bytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(bytes);

    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();

      page.drawText(text || "HelloPDF", {
        x: width / 3,
        y: height / 2,
        size: parseInt(size) || 40,
        color: rgb(0.7, 0.7, 0.7),
        rotate: degrees(45),
        opacity: parseFloat(opacity) || 0.4
      });
    });

    const pdfBytes = await pdfDoc.save();

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=watermarked.pdf"
    );

    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("WATERMARK ERROR:", err);
    res.status(500).send("Watermark failed");
  }
});

const gsPath = `"C:\\Program Files\\gs\\gs10.07.0\\bin\\gswin64c.exe"`;

app.post("/compress", upload.single("pdf"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("COMPRESS USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("COMPRESS PROFILE DATA =", profileData);
console.log("COMPRESS PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}
const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_compress")
  .eq("usage_date", today)
  .maybeSingle();

console.log("COMPRESS USAGE DATA =", usageData);
console.log("COMPRESS USAGE ERROR =", usageError);

// FREE USER LIMIT CHECK

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF compression."
    );

  }

}
    if (!req.file) {
      return res.status(400).send("Please upload a PDF file");
    }

    const inputPath = req.file.path;
    const outputPath = path.join(outputsDir, `compressed_${Date.now()}.pdf`);

    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

    exec(gsCommand, async (gsErr) => {
      if (!gsErr && fs.existsSync(outputPath)) {

  if (!usageData) {

    const { error: insertError } = await supabase
      .from("usage_logs")
      .insert([
        {
          user_id: userId,
          tool_name: "pdf_compress",
          usage_date: today,
          usage_count: 1
        }
      ]);

    console.log("COMPRESS INSERT ERROR =", insertError);

  } else {

    const { error: updateError } = await supabase
      .from("usage_logs")
      .update({
        usage_count: usageData.usage_count + 1
      })
      .eq("id", usageData.id);

    console.log("COMPRESS UPDATE ERROR =", updateError);

  }

  return res.download(outputPath, "compressed.pdf");
}

      console.log("Ghostscript not available, using fallback compression...");

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes, {
          ignoreEncryption: true
        });

        const compressedBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_compress",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("COMPRESS INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("COMPRESS UPDATE ERROR =", updateError);

}
        return res.end(Buffer.from(compressedBytes));

      } catch (fallbackErr) {
        console.error("COMPRESS FALLBACK ERROR:", fallbackErr);
        return res.status(500).send("Compress failed");
      }
    });

  } catch (err) {
    console.error("COMPRESS FULL ERROR:", err);
    return res.status(500).send("Compress failed");
  }
});

app.post("/pdf-to-word", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }
    const userId = req.body.user_id;

console.log("PDF TO WORD USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("PDF TO WORD PROFILE DATA =", profileData);
console.log("PDF TO WORD PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_word")
  .eq("usage_date", today)
  .maybeSingle();

console.log("PDF TO WORD USAGE DATA =", usageData);
console.log("PDF TO WORD USAGE ERROR =", usageError);

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to Word conversions."
    );

  }

}

    const pdfBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(pdfBuffer);

    const text = data.text || "No readable text found in this PDF.";

    const paragraphs = text
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map(
        (line) =>
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

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=converted.docx"
    );
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_to_word",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("PDF TO WORD INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("PDF TO WORD UPDATE ERROR =", updateError);

}
    return res.end(buffer);
  } catch (err) {
    console.error("PDF TO WORD ERROR MESSAGE:", err.message);
    console.error("PDF TO WORD FULL ERROR:", err);
    return res.status(500).send(err.message);
  }
});

app.post("/word-to-pdf", upload.single("wordFile"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("WORD TO PDF USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("WORD TO PDF PROFILE DATA =", profileData);
console.log("WORD TO PDF PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "word_to_pdf")
  .eq("usage_date", today)
  .maybeSingle();

console.log("WORD TO PDF USAGE DATA =", usageData);
console.log("WORD TO PDF USAGE ERROR =", usageError);
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }
  
if (!profileData.is_premium) {

  const currentUsage = usageData
    ? usageData.usage_count
    : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited Word to PDF conversions."
    );

  }

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
    const urduFont = path.join(
  __dirname,
  "public",
  "fonts",
  "NotoNastaliqUrdu-Regular.ttf"
);

const arabicFont = path.join(
  __dirname,
  "public",
  "fonts",
  "NotoNaskhArabic-Regular.ttf"
);

const hindiFont = path.join(
  __dirname,
  "public",
  "fonts",
  "NotoSansDevanagari-Regular.ttf"
);

    doc.pipe(res);

    doc.fontSize(18).text("Converted Word Document", {
      align: "center"
    });

    doc.moveDown();
    doc.registerFont("urdu", urduFont);
doc.registerFont("arabic", arabicFont);
doc.registerFont("hindi", hindiFont);

    doc.fontSize(12).text(text, {
      align: "left",
      lineGap: 4
    });

    doc.end();

    res.on("finish", async () => {

  if (!usageData) {

    const { error: insertError } = await supabase
      .from("usage_logs")
      .insert([
        {
          user_id: userId,
          tool_name: "word_to_pdf",
          usage_date: today,
          usage_count: 1
        }
      ]);

    console.log(
      "WORD TO PDF INSERT ERROR =",
      insertError
    );

  } else {

    const { error: updateError } = await supabase
      .from("usage_logs")
      .update({
        usage_count:
          usageData.usage_count + 1
      })
      .eq("id", usageData.id);

    console.log(
      "WORD TO PDF UPDATE ERROR =",
      updateError
    );

  }

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
    const userId = req.body.user_id;

console.log(
  "EXTRACT USER ID =",
  userId
);

if (!userId) {

  return res
    .status(401)
    .send("Please login first");

}

const {
  data: profileData,
  error: profileError
} = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {

  return res
    .status(500)
    .send("Unable to verify account");

}

const today =
  new Date()
    .toISOString()
    .split("T")[0];

const {
  data: usageData
} = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq(
    "tool_name",
    "pdf_extract_pages"
  )
  .eq(
    "usage_date",
    today
  )
  .maybeSingle();

if (!profileData.is_premium) {

  const currentUsage =
    usageData
      ? usageData.usage_count
      : 0;

  if (currentUsage >= 8) {

    return res
      .status(403)
      .send(
        "Daily free limit reached. Upgrade to Premium for unlimited PDF tools."
      );

  }

}
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

    pagesInput.split(",").forEach((part) => {
      part = part.trim();

      if (part.includes("-")) {
        const [start, end] = part.split("-").map((num) => parseInt(num.trim()));

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
        return res
          .status(400)
          .send(`Page ${page} does not exist. This PDF has ${totalPages} pages.`);
      }
    }

    const newPdf = await PDFDocument.create();

    for (const pageNum of uniquePages) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
      newPdf.addPage(copiedPage);
    }

    const finalPdfBytes = await newPdf.save();

    fs.unlinkSync(inputPath);
    if (!usageData) {

  await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_extract_pages",
        usage_date: today,
        usage_count: 1
      }
    ]);

} else {

  await supabase
    .from("usage_logs")
    .update({
      usage_count:
        usageData.usage_count + 1
    })
    .eq("id", usageData.id);

}

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=extracted-pages.pdf"
    );

    return res.end(Buffer.from(finalPdfBytes));
  } catch (err) {
    console.error("EXTRACT PAGES ERROR:", err);
    return res.status(500).send("Extract pages failed");
  }
});

app.post("/reorder-pages", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    const userId = req.body.user_id;

console.log(
  "REORDER USER ID =",
  userId
);

if (!userId) {

  return res
    .status(401)
    .send("Please login first");

}

const {
  data: profileData,
  error: profileError
} = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {

  return res
    .status(500)
    .send("Unable to verify account");

}

const today =
  new Date()
    .toISOString()
    .split("T")[0];

const {
  data: usageData
} = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq(
    "tool_name",
    "pdf_reorder_pages"
  )
  .eq(
    "usage_date",
    today
  )
  .maybeSingle();

if (!profileData.is_premium) {

  const currentUsage =
    usageData
      ? usageData.usage_count
      : 0;

  if (currentUsage >= 8) {

    return res
      .status(403)
      .send(
        "Daily free limit reached. Upgrade to Premium for unlimited PDF tools."
      );

  }

}
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
      .map((num) => parseInt(num.trim(), 10));

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
    if (!usageData) {

  await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_reorder_pages",
        usage_date: today,
        usage_count: 1
      }
    ]);

} else {

  await supabase
    .from("usage_logs")
    .update({
      usage_count:
        usageData.usage_count + 1
    })
    .eq("id", usageData.id);

}

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
    const userId = req.body.user_id;

console.log(
  "pdf_page_numbers USER ID =",
  userId
);

if (!userId) {

  return res
    .status(401)
    .send("Please login first");

}

const {
  data: profileData,
  error: profileError
} = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {

  return res
    .status(500)
    .send("Unable to verify account");

}

const today =
  new Date()
    .toISOString()
    .split("T")[0];

const {
  data: usageData
} = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq(
    "tool_name",
    "pdf_page_numbers"
  )
  .eq(
    "usage_date",
    today
  )
  .maybeSingle();

if (!profileData.is_premium) {

  const currentUsage =
    usageData
      ? usageData.usage_count
      : 0;

  if (currentUsage >= 8) {

    return res
      .status(403)
      .send(
        "Daily free limit reached. Upgrade to Premium for unlimited PDF tools."
      );

  }

}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();

    pages.forEach((page, index) => {
      const { width } = page.getSize();

      page.drawText(`${index + 1}`, {
        x: width / 2 - 6,
        y: 25,
        size: 12,
        color: rgb(0, 0, 0)
      });
    });

    const finalPdf = await pdfDoc.save();

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (!usageData) {

  await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_page_numbers",
        usage_date: today,
        usage_count: 1
      }
    ]);

} else {

  await supabase
    .from("usage_logs")
    .update({
      usage_count:
        usageData.usage_count + 1
    })
    .eq("id", usageData.id);

}

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=page-numbers.pdf"
    );

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

    outputPath = path.join(outputsDir, `protected-${Date.now()}.pdf`);

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

    return res
      .status(500)
      .send("Protect PDF failed. Make sure Ghostscript is installed.");
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

    outputPath = path.join(outputsDir, `unlocked-${Date.now()}.pdf`);

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

    return res
      .status(500)
      .send("Unlock PDF failed. Please check password or Ghostscript.");
  }
});

app.post("/pdf-to-excel", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    const userId = req.body.user_id;

console.log("PDF TO EXCEL USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("PDF TO EXCEL PROFILE DATA =", profileData);
console.log("PDF TO EXCEL PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}
const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_excel")
  .eq("usage_date", today)
  .maybeSingle();

console.log("PDF TO EXCEL USAGE DATA =", usageData);
console.log("PDF TO EXCEL USAGE ERROR =", usageError);
if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to Excel conversions."
    );

  }

}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;
    outputPath = path.join(outputsDir, `pdf-to-excel-${Date.now()}.xlsx`);

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
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    lines.forEach((line, index) => {
      worksheet.addRow({
        lineNo: index + 1,
        text: line
      });
    });

    worksheet.getRow(1).font = { bold: true };

    await workbook.xlsx.writeFile(outputPath);

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_to_excel",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("PDF TO EXCEL INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("PDF TO EXCEL UPDATE ERROR =", updateError);

}
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

    const userId = req.body.user_id;

    console.log("EXCEL TO PDF USER ID =", userId);

    if (!userId) {
      return res.status(401).send("Please login first");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();

    console.log("EXCEL TO PDF PROFILE DATA =", profileData);
    console.log("EXCEL TO PDF PROFILE ERROR =", profileError);

    if (profileError) {
      return res.status(500).send("Unable to verify account");
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: usageData, error: usageError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("tool_name", "excel_to_pdf")
      .eq("usage_date", today)
      .maybeSingle();

    console.log("EXCEL TO PDF USAGE DATA =", usageData);
    console.log("EXCEL TO PDF USAGE ERROR =", usageError);

    if (!profileData.is_premium) {

      const currentUsage = usageData ? usageData.usage_count : 0;

      if (currentUsage >= 8) {

        return res.status(403).send(
          "Daily free limit reached. Upgrade to Premium for unlimited Excel to PDF conversions."
        );

      }

    }
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

    worksheet.eachRow((row) => {
      const rowText = row.values
        .slice(1)
        .map((cell) => (cell ? cell.toString() : ""))
        .join("   |   ");

      doc.fontSize(10).text(rowText, 40, y);

      y += 20;

      if (y > 750) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();

    if (fs.existsSync(inputPath)) {
  fs.unlinkSync(inputPath);
}

if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "excel_to_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("EXCEL TO PDF INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("EXCEL TO PDF UPDATE ERROR =", updateError);

}

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

app.post("/ocr-pdf", upload.array("files"), async (req, res) => {
  let uploadedPaths = [];
  let worker = null;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded");
    }

    uploadedPaths = req.files.map((file) => file.path);
    const userId = req.body.user_id;

console.log("OCR USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "ocr_pdf")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {
    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited OCR PDF conversions."
    );
  }

  const selectedLanguage = (req.body.language || "eng").toLowerCase();

  if (selectedLanguage !== "eng") {
    return res.status(403).send(
      "Premium feature. Upgrade to use OCR in Urdu, Arabic, Hindi and Auto Detect."
    );
  }

}

    const language =
  req.body.language === "auto"
    ? "eng+urd+ara+hin"
    : (req.body.language || "eng");
    console.log("OCR Language:", language);
    const { createWorker } = require("tesseract.js");

    let finalText = "";



// Worker sirf tab create hoga jab image OCR ki zarurat hogi.

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext === ".pdf") {
        try {
          const pdfBuffer = fs.readFileSync(file.path);
          const data = await pdfParse(pdfBuffer);

          if (data.text && data.text.trim()) {
            finalText += `\n\n--- ${file.originalname} ---\n\n`;
            finalText += data.text.trim();
          } else {
            finalText += `\n\n--- ${file.originalname} ---\n\n`;
           const outputPrefix = path.join(
  uploadsDir,
  `ocr-${Date.now()}`
);

await execAsync(
  `pdftoppm -png "${file.path}" "${outputPrefix}"`
);

const imageFiles = fs
  .readdirSync(uploadsDir)
  .filter(name => name.startsWith(path.basename(outputPrefix)))
  .sort();

if (!worker) {
  worker = await createWorker(language);
}

let scannedText = "";

for (const image of imageFiles) {

  const imagePath = path.join(uploadsDir, image);

  try {

    const {
      data: { text }
    } = await worker.recognize(imagePath);

    scannedText += "\n\n" + (text?.trim() || "");

  } finally {

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

  }

}

finalText += scannedText.trim() || "No text detected.";
console.log("========== OCR RAW TEXT ==========");
console.log(scannedText);
console.log("==================================");
          }
        } catch (pdfErr) {
          finalText += `\n\n--- ${file.originalname} ---\n\n`;
          finalText += "Could not read text from this PDF.";
        }
      } else {

  if (!worker) {
    worker = await createWorker(language);
  }

  try {

  const {
    data: { text }
  } = await worker.recognize(file.path);

  finalText += `\n\n--- ${file.originalname} ---\n\n`;

  finalText += text && text.trim()
    ? text.trim()
    : "No text detected.";
    console.log("========== IMAGE OCR ==========");
console.log(text);
console.log("===============================");

} catch (ocrErr) {

  console.error(`OCR failed for ${file.originalname}:`, ocrErr);

  finalText += `\n\n--- ${file.originalname} ---\n\n`;
  finalText += "OCR failed for this file.";

}
}
    }

    if (worker) {
  await worker.terminate();
}

if (!finalText.trim()) {
  return res.status(400).send("No readable text found");
}



    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=ocr-output.pdf");

    const doc = new PDFKit({
      size: "A4",
      margin: 50
    });

    doc.pipe(res);
    

    doc.fontSize(22).text("HelloPDF OCR Result", {
      align: "center"
    });

    doc.moveDown();

    const lines = finalText.split(/\r?\n/);
    const containsArabicScript = (text) =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);

    lines.forEach((line) => {
      if (doc.y > 760) {
        doc.addPage();
      }

    const outputLine = containsArabicScript(line)
  ? reshape(line)
  : line;

doc.fontSize(11).text(outputLine || " ", {
  lineGap: 4
});
    });
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "ocr_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("OCR INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("OCR UPDATE ERROR =", updateError);

}
    doc.end();

    res.on("finish", () => {
      uploadedPaths.forEach((filePath) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    });

  } catch (err) {

  if (worker) {
    await worker.terminate().catch(() => {});
  }

  console.error("OCR PDF ERROR:", err);

    uploadedPaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    return res.status(500).send("OCR PDF failed");
  }
});

app.post("/pdf-to-powerpoint", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {

    const userId = req.body.user_id;

    console.log("PDF TO POWERPOINT USER ID =", userId);

    if (!userId) {
      return res.status(401).send("Please login first");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();

    console.log("PDF TO POWERPOINT PROFILE DATA =", profileData);
    console.log("PDF TO POWERPOINT PROFILE ERROR =", profileError);

    if (profileError) {
      return res.status(500).send("Unable to verify account");
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: usageData, error: usageError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("tool_name", "pdf_to_powerpoint")
      .eq("usage_date", today)
      .maybeSingle();

    console.log("PDF TO POWERPOINT USAGE DATA =", usageData);
    console.log("PDF TO POWERPOINT USAGE ERROR =", usageError);

    if (!profileData.is_premium) {

      const currentUsage = usageData ? usageData.usage_count : 0;

      if (currentUsage >= 8) {

        return res.status(403).send(
          "Daily free limit reached. Upgrade to Premium for unlimited PDF to PowerPoint conversions."
        );

      }

    }
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;
    outputPath = path.join(outputsDir, `pdf-to-powerpoint-${Date.now()}.pptx`);

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
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const maxLinesPerSlide = 10;

    for (let i = 0; i < lines.length; i += maxLinesPerSlide) {
      const slideLines = lines.slice(i, i + maxLinesPerSlide);
      const slide = pptx.addSlide();

      slide.background = { color: "FFFFFF" };

      slide.addText("PDF to PowerPoint", {
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

if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_to_powerpoint",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("PDF TO POWERPOINT INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("PDF TO POWERPOINT UPDATE ERROR =", updateError);

}

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

app.post("/powerpoint-to-pdf", upload.single("powerpointFile"), async (req, res) => {

  let inputPath = null;
  let outputPath = null;
  try {

    const userId = req.body.user_id;

    console.log("POWERPOINT TO PDF USER ID =", userId);

    if (!userId) {
      return res.status(401).send("Please login first");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();

    console.log("POWERPOINT TO PDF PROFILE DATA =", profileData);
    console.log("POWERPOINT TO PDF PROFILE ERROR =", profileError);

    if (profileError) {
      return res.status(500).send("Unable to verify account");
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: usageData, error: usageError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("tool_name", "powerpoint_to_pdf")
      .eq("usage_date", today)
      .maybeSingle();

    console.log("POWERPOINT TO PDF USAGE DATA =", usageData);
    console.log("POWERPOINT TO PDF USAGE ERROR =", usageError);

    if (!profileData.is_premium) {

      const currentUsage = usageData ? usageData.usage_count : 0;

      if (currentUsage >= 8) {

        return res.status(403).send(
          "Daily free limit reached. Upgrade to Premium for unlimited PowerPoint to PDF conversions."
        );

      }

    }

    if (!req.file) {
      return res.status(400).send("No PowerPoint file uploaded");
    }

    inputPath = req.file.path;

        

    const { stdout, stderr } = await execPromise(
  `libreoffice --headless --convert-to pdf --outdir "${outputsDir}" "${inputPath}"`
);

const convertedPdf = path.join(
  outputsDir,
  path.basename(inputPath, path.extname(inputPath)) + ".pdf"
);


if (!fs.existsSync(convertedPdf)) {

throw new Error("LibreOffice failed to create PDF.");

}

outputPath = convertedPdf;


    if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "powerpoint_to_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log(
    "POWERPOINT TO PDF INSERT ERROR =",
    insertError
  );

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log(
    "POWERPOINT TO PDF UPDATE ERROR =",
    updateError
  );

}

res.download(outputPath, "converted.pdf", (err) => {

  if (inputPath && fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }

  if (outputPath && fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  if (err) {
    console.error(
      "POWERPOINT TO PDF DOWNLOAD ERROR:",
      err
    );
  }

});

} catch (err) {

  console.error("========== POWERPOINT FULL ERROR ==========");
  console.error(err);

  if (inputPath && fs.existsSync(inputPath))
    fs.unlinkSync(inputPath);

  if (outputPath && fs.existsSync(outputPath))
    fs.unlinkSync(outputPath);

  return res.status(500).send("PowerPoint to PDF failed");

}

});

app.post("/pdf-to-jpg", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;
  let outputDir = null;
  let zipPath = null;

  try {
    const userId = req.body.user_id;

console.log("PDF TO JPG USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_jpg")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {
    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to JPG conversions."
    );
  }
}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    outputDir = path.join(outputsDir, `jpg-${Date.now()}`);
    fs.mkdirSync(outputDir);

    const outputPattern = path.join(outputDir, "page-%03d.jpg");
    zipPath = path.join(outputsDir, `jpg-images-${Date.now()}.zip`);

    const commands = [
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
    console.log("PDF TO JPG CONVERSION SUCCESS");
console.log("OUTPUT DIRECTORY =", outputDir);

    const files = fs.readdirSync(outputDir).filter((file) => file.endsWith(".jpg"));

    if (files.length === 0) {
      throw new Error("No JPG images created");
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    files.forEach((file) => {
      archive.file(path.join(outputDir, file), { name: file });
    });

    output.on("close", async () => {

  if (!usageData) {

    const { error: insertError } = await supabase
      .from("usage_logs")
      .insert([
        {
          user_id: userId,
          tool_name: "pdf_to_jpg",
          usage_date: today,
          usage_count: 1
        }
      ]);

    console.log("PDF TO JPG INSERT ERROR =", insertError);

  } else {

    const { error: updateError } = await supabase
      .from("usage_logs")
      .update({
        usage_count: usageData.usage_count + 1
      })
      .eq("id", usageData.id);

    console.log("PDF TO JPG UPDATE ERROR =", updateError);

  }

  console.log("PDF TO JPG DOWNLOAD START");

  res.download(zipPath, "pdf-to-jpg.zip", (err) => {

    if (inputPath && fs.existsSync(inputPath))
      fs.unlinkSync(inputPath);

    if (zipPath && fs.existsSync(zipPath))
      fs.unlinkSync(zipPath);

    if (outputDir && fs.existsSync(outputDir)) {

      fs.rmSync(outputDir, {
        recursive: true,
        force: true
      });

    }

    if (err) {

      console.error("PDF TO JPG DOWNLOAD ERROR:", err);

    }

  });

});

await archive.finalize();
  } catch (err) {
    console.error("========== PDF TO JPG FULL ERROR ==========");
console.error(err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return res
      .status(500)
      .send("PDF to JPG failed");
  }
});

app.post("/jpg-to-pdf", upload.array("jpgFiles"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("JPG TO PDF USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "jpg_to_pdf")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {
    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited JPG to PDF conversions."
    );
  }

}
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No JPG files uploaded");
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext !== ".jpg" && ext !== ".jpeg") {
        req.files.forEach((f) => {
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
console.log("JPG TO PDF CONVERSION SUCCESS");
console.log("TOTAL IMAGES =", req.files.length);
    const pdfBytes = await pdfDoc.save();
    if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "jpg_to_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("JPG TO PDF INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("JPG TO PDF UPDATE ERROR =", updateError);

}

    req.files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
console.log("JPG TO PDF DOWNLOAD START");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=jpg-to-pdf.pdf");

    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("========== JPG TO PDF FULL ERROR ==========");
console.error(err);
    console.error("JPG TO PDF ERROR:", err);

    if (req.files) {
      req.files.forEach((file) => {
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
    const userId = req.body.user_id;

console.log("PDF TO PNG USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_png")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to PNG conversions."
    );

  }

}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    outputDir = path.join(outputsDir, `png-${Date.now()}`);
    fs.mkdirSync(outputDir);

    const outputPattern = path.join(outputDir, "page-%03d.png");
    zipPath = path.join(outputsDir, `png-images-${Date.now()}.zip`);

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
    console.log("PDF TO PNG CONVERSION SUCCESS");
console.log("OUTPUT DIRECTORY =", outputDir);

    const files = fs.readdirSync(outputDir).filter((file) => file.endsWith(".png"));

    if (files.length === 0) {
      throw new Error("No PNG images created");
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    files.forEach((file) => {
      archive.file(path.join(outputDir, file), { name: file });
    });

    output.on("close", async () => {

  if (!usageData) {

    const { error: insertError } = await supabase
      .from("usage_logs")
      .insert([
        {
          user_id: userId,
          tool_name: "pdf_to_png",
          usage_date: today,
          usage_count: 1
        }
      ]);

    console.log("PDF TO PNG INSERT ERROR =", insertError);

  } else {

    const { error: updateError } = await supabase
      .from("usage_logs")
      .update({
        usage_count: usageData.usage_count + 1
      })
      .eq("id", usageData.id);

    console.log("PDF TO PNG UPDATE ERROR =", updateError);

  }

  console.log("PDF TO PNG DOWNLOAD START");

  res.download(zipPath, "pdf-to-png.zip", (err) => {

    if (inputPath && fs.existsSync(inputPath))
      fs.unlinkSync(inputPath);

    if (zipPath && fs.existsSync(zipPath))
      fs.unlinkSync(zipPath);

    if (outputDir && fs.existsSync(outputDir)) {

      fs.rmSync(outputDir, {
        recursive: true,
        force: true
      });

    }

    if (err)
      console.error("PDF TO PNG DOWNLOAD ERROR:", err);

  });

});

await archive.finalize();
  } catch (err) {
    console.error("========== PDF TO PNG FULL ERROR ==========");
console.error(err);
    console.error("PDF TO PNG ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return res
      .status(500)
      .send("PDF to PNG failed. Make sure Ghostscript is installed.");
  }
});

app.post("/html-to-pdf", async (req, res) => {
  let browser = null;

  try {
    const userId = req.body.user_id;

console.log("HTML TO PDF USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "html_to_pdf")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited HTML to PDF conversions."
    );

  }

}
    const htmlCode = req.body.htmlCode;

    if (!htmlCode || !htmlCode.trim()) {
      return res.status(400).send("Please enter HTML code");
    }
console.log("PUPPETEER CACHE =", process.env.PUPPETEER_CACHE_DIR);
console.log("EXECUTABLE =", puppeteer.executablePath());
console.log("NODE_ENV =", process.env.NODE_ENV);
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    const page = await browser.newPage();

    await page.setContent(htmlCode, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
console.log("HTML TO PDF CONVERSION SUCCESS");
console.log("HTML LENGTH =", htmlCode.length);
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
    if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "html_to_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("HTML TO PDF INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("HTML TO PDF UPDATE ERROR =", updateError);

}
console.log("HTML TO PDF DOWNLOAD START");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=html-to-pdf.pdf");

    return res.end(pdfBuffer);

  } catch (err) {
    console.error("========== HTML TO PDF FULL ERROR ==========");
console.error(err);
    console.error("HTML TO PDF ERROR MESSAGE:", err.message);
    console.error("HTML TO PDF FULL ERROR:", err);

    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error("BROWSER CLOSE ERROR:", closeErr);
      }
    }

    return res.status(500).send(err.message || "HTML to PDF failed");
  }
});

app.post("/pdf-to-text", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    const userId = req.body.user_id;

console.log("PDF TO TEXT USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_text")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to Text conversions."
    );

  }

}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const pdfBuffer = fs.readFileSync(inputPath);
    const data = await pdfParse(pdfBuffer);

    const text = data.text || "";
    console.log("PDF TO TEXT EXTRACTION SUCCESS");
console.log("TEXT LENGTH =", text.length);

    if (!text.trim()) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).send("No readable text found in this PDF");
    }
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_to_text",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("PDF TO TEXT INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("PDF TO TEXT UPDATE ERROR =", updateError);

}
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
console.log("PDF TO TEXT DOWNLOAD START");
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=pdf-text.txt");

    return res.send(text);
  } catch (err) {
    console.error("========== PDF TO TEXT FULL ERROR ==========");
console.error(err);
    console.error("PDF TO TEXT ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("PDF to Text failed");
  }
});

app.post("/image-to-pdf", upload.array("images"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("IMAGE TO PDF USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("IMAGE TO PDF PROFILE DATA =", profileData);
console.log("IMAGE TO PDF PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}
const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "image_to_pdf")
  .eq("usage_date", today)
  .maybeSingle();

console.log("IMAGE TO PDF USAGE DATA =", usageData);
console.log("IMAGE TO PDF USAGE ERROR =", usageError);
if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited Image to PDF conversions."
    );

  }

}
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
        req.files.forEach((f) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        return res
          .status(400)
          .send("Only JPG, JPEG, and PNG images are allowed");
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

    req.files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "image_to_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("IMAGE TO PDF INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("IMAGE TO PDF UPDATE ERROR =", updateError);

}
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=image-to-pdf.pdf");

    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("IMAGE TO PDF ERROR:", err);

    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    return res.status(500).send("Image to PDF failed");
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Missing fields");
    }

    const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));

    const existingUser = users.find((u) => u.email === email);

    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({ email, password: hashedPassword });

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    res.send("Signup successful");
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).send("Signup failed");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));

    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(400).send("User not found");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).send("Wrong password");
    }

    req.session.user = { email };

    res.send("Login successful");
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).send("Login failed");
  }
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

app.post("/repair-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    const inputPath = req.file.path;

    const inputBytes = fs.readFileSync(inputPath);

    const pdfDoc = await PDFDocument.load(inputBytes, {
      ignoreEncryption: true
    });

    const repairedBytes = await pdfDoc.save({
      useObjectStreams: false
    });

    const outputFileName = `repaired-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, "outputs", outputFileName);

    fs.writeFileSync(outputPath, repairedBytes);

    res.download(outputPath, "repaired.pdf", (err) => {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.error("Repair cleanup error:", cleanupError);
      }

      if (err) {
        console.error("Repair download error:", err);
      }
    });

  } catch (error) {
    console.error("REPAIR PDF ERROR:", error);
    res.status(500).send("Repair failed. This PDF may be too corrupted or password protected.");
  }
});

app.post("/crop-pdf", upload.single("pdfFile"), async (req, res) => {
  let inputPath = null;

  try {
    const userId = req.body.user_id;

console.log("CROP USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}
// CHECK PREMIUM STATUS

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

console.log("PROFILE DATA =", profileData);
console.log("PROFILE ERROR =", profileError);

if (profileError) {
  return res.status(500).send("Unable to verify account");
}
// CHECK TODAY USAGE

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_crop")
  .eq("usage_date", today)
  .maybeSingle();

console.log("USAGE DATA =", usageData);
console.log("USAGE ERROR =", usageError);
// FREE USER LIMIT CHECK

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF crops."
    );

  }

}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    if (!req.body.cropData) {
      return res.status(400).send("Crop area missing");
    }

    inputPath = req.file.path;

    const cropData = JSON.parse(req.body.cropData);
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();

    const targetPages =
      cropData.applyTo === "current"
        ? [pages[cropData.page - 1]]
        : pages;

    for (const page of targetPages) {
      if (!page) continue;

      const pdfWidth = page.getWidth();
      const pdfHeight = page.getHeight();

      const scaleX = pdfWidth / cropData.canvasWidth;
      const scaleY = pdfHeight / cropData.canvasHeight;

      const x = cropData.x * scaleX;
      const yFromTop = cropData.y * scaleY;
      const width = cropData.width * scaleX;
      const height = cropData.height * scaleY;

      const pdfY = pdfHeight - yFromTop - height;

      page.setCropBox(x, pdfY, width, height);
      page.setMediaBox(x, pdfY, width, height);
    }

    const finalPdf = await pdfDoc.save({
  useObjectStreams: false
});

// CREATE OR UPDATE USAGE LOG

if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_crop",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("UPDATE ERROR =", updateError);

}

if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=cropped.pdf");

    return res.end(Buffer.from(finalPdf));

  } catch (err) {
    console.error("CROP PDF ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("Crop PDF failed");
  }
});

app.post("/flatten-pdf", upload.single("pdfFile"), async (req, res) => {

  let inputPath = null;

  try {

    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;

    const pdfBytes = fs.readFileSync(inputPath);

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();

    try {
      form.flatten();
    } catch (e) {
      console.log("No forms found");
    }

    const finalPdf = await pdfDoc.save({
      useObjectStreams: false
    });

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=flattened.pdf"
    );

    return res.end(Buffer.from(finalPdf));

  } catch (err) {

    console.error("FLATTEN PDF ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("Flatten PDF failed");
  }
});

app.post(
  "/compare-pdf",
  upload.fields([
    { name: "pdfOne", maxCount: 1 },
    { name: "pdfTwo", maxCount: 1 }
  ]),
  async (req, res) => {
    let fileOnePath = null;
    let fileTwoPath = null;

    try {
      if (!req.files || !req.files.pdfOne || !req.files.pdfTwo) {
        return res.status(400).send("Please upload both PDF files");
      }

      fileOnePath = req.files.pdfOne[0].path;
      fileTwoPath = req.files.pdfTwo[0].path;

      const bufferOne = fs.readFileSync(fileOnePath);
      const bufferTwo = fs.readFileSync(fileTwoPath);

      const dataOne = await pdfParse(bufferOne);
      const dataTwo = await pdfParse(bufferTwo);

      const textOne = dataOne.text || "";
      const textTwo = dataTwo.text || "";

      if (!textOne.trim() && !textTwo.trim()) {
        return res.status(400).send("No readable text found in both PDFs");
      }

      const linesOne = textOne
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const linesTwo = textTwo
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const maxLines = Math.max(linesOne.length, linesTwo.length);

      const differences = [];

      for (let i = 0; i < maxLines; i++) {
        const left = linesOne[i] || "";
        const right = linesTwo[i] || "";

        if (left !== right) {
          differences.push({
            line: i + 1,
            pdfOne: left,
            pdfTwo: right
          });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=compare-report.pdf"
      );

      const doc = new PDFKit({
        size: "A4",
        margin: 45
      });

      doc.pipe(res);

      doc.fontSize(22).text("HelloPDF Compare Report", {
        align: "center"
      });

      doc.moveDown();

      doc.fontSize(12).text(`PDF 1 lines: ${linesOne.length}`);
      doc.text(`PDF 2 lines: ${linesTwo.length}`);
      doc.text(`Differences found: ${differences.length}`);

      doc.moveDown();

      if (differences.length === 0) {
        doc.fontSize(14).text("No text differences found.");
      } else {
        differences.slice(0, 200).forEach((diff) => {
          if (doc.y > 720) doc.addPage();

          doc.fontSize(11).text(`Line ${diff.line}`, {
            underline: true
          });

          doc.fontSize(10).text(`PDF 1: ${diff.pdfOne || "[empty]"}`);
          doc.text(`PDF 2: ${diff.pdfTwo || "[empty]"}`);

          doc.moveDown(0.7);
        });

        if (differences.length > 200) {
          doc.addPage();
          doc
            .fontSize(12)
            .text(`Only first 200 differences shown out of ${differences.length}.`);
        }
      }

      doc.end();

      res.on("finish", () => {
        if (fileOnePath && fs.existsSync(fileOnePath)) fs.unlinkSync(fileOnePath);
        if (fileTwoPath && fs.existsSync(fileTwoPath)) fs.unlinkSync(fileTwoPath);
      });

    } catch (err) {
      console.error("COMPARE PDF ERROR:", err);

      if (fileOnePath && fs.existsSync(fileOnePath)) fs.unlinkSync(fileOnePath);
      if (fileTwoPath && fs.existsSync(fileTwoPath)) fs.unlinkSync(fileTwoPath);

      return res.status(500).send("Compare PDF failed");
    }
  }
);

app.post("/redact-pdf", upload.single("pdfFile"), async (req, res) => {

  let inputPath = null;

  try {

    if (!req.file) {
      return res.status(400).send("No PDF uploaded");
    }

    inputPath = req.file.path;

    const redactData = JSON.parse(req.body.redactData);

    const pdfBytes = fs.readFileSync(inputPath);

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();

    const page = pages[0];

    const pdfWidth = page.getWidth();
    const pdfHeight = page.getHeight();

    const scaleX = pdfWidth / redactData.canvasWidth;
    const scaleY = pdfHeight / redactData.canvasHeight;

    const x = redactData.x * scaleX;

    const yFromTop = redactData.y * scaleY;

    const width = redactData.width * scaleX;
    const height = redactData.height * scaleY;

    const pdfY = pdfHeight - yFromTop - height;

    page.drawRectangle({
      x,
      y: pdfY,
      width,
      height,
      color: rgb(0, 0, 0)
    });

    const finalPdf = await pdfDoc.save({
      useObjectStreams: false
    });

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=redacted.pdf"
    );

    return res.end(Buffer.from(finalPdf));

  } catch (err) {

    console.error("REDACT PDF ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).send("Redact PDF failed");
  }
});

app.post("/pdf-to-pdfa", upload.single("pdf"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    const userId = req.body.user_id;

console.log("PDF TO PDFA USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "pdf_to_pdfa")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited PDF to PDF/A conversions."
    );

  }

}
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    inputPath = req.file.path;
    outputPath = path.join(outputsDir, `pdfa-${Date.now()}.pdf`);

    const gsCommands = [
      `gswin64c -dPDFA=2 -dBATCH -dNOPAUSE -dNOOUTERSAVE -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile="${outputPath}" "${inputPath}"`,
      `gswin32c -dPDFA=2 -dBATCH -dNOPAUSE -dNOOUTERSAVE -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile="${outputPath}" "${inputPath}"`,
      `gs -dPDFA=2 -dBATCH -dNOPAUSE -dNOOUTERSAVE -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile="${outputPath}" "${inputPath}"`
    ];

    const runGhostscript = (index = 0) => {
      return new Promise((resolve, reject) => {
        if (index >= gsCommands.length) {
          return reject(new Error("Ghostscript not found"));
        }

        exec(gsCommands[index], (error, stdout, stderr) => {
          if (error) {
            console.error("PDF/A command failed:", gsCommands[index]);
            console.error("PDF/A stderr:", stderr);
            return runGhostscript(index + 1).then(resolve).catch(reject);
          }

          resolve();
        });
      });
    };

    try {
      await runGhostscript();
    } catch (gsError) {
      console.log("Ghostscript PDF/A failed, using clean PDF fallback:", gsError.message);

      const inputBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(inputBytes, {
        ignoreEncryption: true
      });

      const cleanBytes = await pdfDoc.save({
        useObjectStreams: false
      });

      fs.writeFileSync(outputPath, cleanBytes);
    }

    if (!fs.existsSync(outputPath)) {
      
      throw new Error("Output file was not created");
    }
    console.log("PDF TO PDFA CONVERSION SUCCESS");
console.log("OUTPUT FILE =", outputPath);
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "pdf_to_pdfa",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("PDF TO PDFA INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("PDF TO PDFA UPDATE ERROR =", updateError);

}
console.log("PDF TO PDFA DOWNLOAD START");
    res.download(outputPath, "converted-pdfa.pdf", (err) => {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      if (err) {
        console.error("PDF TO PDFA DOWNLOAD ERROR:", err);
      }
    });

  } catch (err) {
    console.error("========== PDF TO PDFA FULL ERROR ==========");
console.error(err);
    console.error("PDF TO PDFA ERROR:", err);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    return res.status(500).send("PDF to PDF/A failed");
  }
});

/* ===========================
   SCAN QR SESSIONS
=========================== */

const scanSessions = new Map();

/* Create Session */

app.post("/scan-session", (req, res) => {

  const sessionId = crypto.randomUUID();

  scanSessions.set(sessionId, {
    connected: false,
    images: []
  });

  res.json({
    sessionId
  });

});

/* Check Status */

app.get("/scan-session/:id", (req, res) => {

  const session =
    scanSessions.get(req.params.id);

  if (!session) {

    return res.status(404).json({
      connected: false
    });

  }

  res.json({
    connected: session.connected
  });

});

/* Mobile Connected */

app.post("/scan-session/:id/connect", (req, res) => {

  const session =
    scanSessions.get(req.params.id);

  if (!session) {

    return res.sendStatus(404);

  }

  session.connected = true;

  res.json({
    success: true
  });

});
app.post("/scan-to-pdf", upload.array("images"), async (req, res) => {
  try {
    const userId = req.body.user_id;

console.log("SCAN TO PDF USER ID =", userId);

if (!userId) {
  return res.status(401).send("Please login first");
}

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("is_premium")
  .eq("id", userId)
  .single();

if (profileError) {
  return res.status(500).send("Unable to verify account");
}

const today = new Date().toISOString().split("T")[0];

const { data: usageData, error: usageError } = await supabase
  .from("usage_logs")
  .select("*")
  .eq("user_id", userId)
  .eq("tool_name", "scan_to_pdf")
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  return res.status(500).send("Usage verification failed");
}

if (!profileData.is_premium) {

  const currentUsage = usageData ? usageData.usage_count : 0;

  if (currentUsage >= 8) {

    return res.status(403).send(
      "Daily free limit reached. Upgrade to Premium for unlimited Scan to PDF conversions."
    );

  }

}
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
        req.files.forEach((f) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        return res.status(400).send("Only JPG, JPEG, and PNG images are allowed");
      }

      const pageWidth = 595.28;
      const pageHeight = 841.89;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const scale = Math.min(
        pageWidth / image.width,
        pageHeight / image.height
      );

      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;

      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: imgWidth,
        height: imgHeight
      });
    }

    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false
    });

    req.files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
if (!usageData) {

  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: userId,
        tool_name: "scan_to_pdf",
        usage_date: today,
        usage_count: 1
      }
    ]);

  console.log("SCAN TO PDF INSERT ERROR =", insertError);

} else {

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({
      usage_count: usageData.usage_count + 1
    })
    .eq("id", usageData.id);

  console.log("SCAN TO PDF UPDATE ERROR =", updateError);

}
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=scanned.pdf");

    return res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("SCAN TO PDF ERROR:", err);

    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    return res.status(500).send("Scan to PDF failed");
  }
});

app.post("/sign-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded.");
    }

    const placements = JSON.parse(req.body.placements || "[]");
    if (!placements.length) {
      return res.status(400).send("No signature placement found.");
    }

    const inputPath = req.file.path;
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const item of placements) {
      const pageIndex = Number(item.page) - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      const base64Data = item.dataUrl.split(",")[1];
      const imageBytes = Buffer.from(base64Data, "base64");

      let signatureImage;
      if (item.dataUrl.includes("image/jpeg") || item.dataUrl.includes("image/jpg")) {
        signatureImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        signatureImage = await pdfDoc.embedPng(imageBytes);
      }

      const scaleX = pdfWidth / Number(item.pageWidth);
      const scaleY = pdfHeight / Number(item.pageHeight);

      const drawX = Number(item.x) * scaleX;
      const drawWidth = Number(item.width) * scaleX;
      const drawHeight = Number(item.height) * scaleY;
      const drawY = pdfHeight - (Number(item.y) * scaleY) - drawHeight;

      page.drawImage(signatureImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
    }

    const signedPdfBytes = await pdfDoc.save();

    const outputFileName = `signed-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    fs.writeFileSync(outputPath, signedPdfBytes);

    fs.unlink(inputPath, () => {});

    res.download(outputPath, "signed-pdf.pdf", () => {
      fs.unlink(outputPath, () => {});
    });
  } catch (error) {
    console.error("SIGN PDF ERROR:", error);
    res.status(500).send("Failed to sign PDF.");
  }
});

app.post("/fill-sign-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded.");
    }

    const fields = JSON.parse(req.body.fields || "[]");

    if (!fields.length) {
      return res.status(400).send("No fields found.");
    }

    const inputPath = req.file.path;
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const field of fields) {
      const pageIndex = Number(field.page) - 1;

      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      if (!field.dataUrl || !field.dataUrl.includes(",")) continue;

      const page = pages[pageIndex];
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      const base64Data = field.dataUrl.split(",")[1];
      const imageBytes = Buffer.from(base64Data, "base64");
      const image = await pdfDoc.embedPng(imageBytes);

      const scaleX = pdfWidth / Number(field.pageWidth || pdfWidth);
      const scaleY = pdfHeight / Number(field.pageHeight || pdfHeight);

      const drawX = Number(field.x || 0) * scaleX;
      const drawWidth = Number(field.width || 150) * scaleX;
      const drawHeight = Number(field.height || 40) * scaleY;
      const drawY = pdfHeight - (Number(field.y || 0) * scaleY) - drawHeight;

      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
    }

    const outputBytes = await pdfDoc.save();

    const finalOutputDir =
      typeof outputDir !== "undefined"
        ? outputDir
        : path.join(__dirname, "outputs");

    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    const outputFileName = `filled-signed-${Date.now()}.pdf`;
    const outputPath = path.join(finalOutputDir, outputFileName);

    fs.writeFileSync(outputPath, outputBytes);

    fs.unlink(inputPath, () => {});

    res.download(outputPath, "filled-signed-pdf.pdf", () => {
      fs.unlink(outputPath, () => {});
    });
  } catch (error) {
    console.error("FILL SIGN PDF ERROR MESSAGE:", error.message);
    console.error("FILL SIGN PDF FULL ERROR:", error);
    res.status(500).send(error.message || "Failed to fill and sign PDF.");
  }
});

app.post("/pdf-forms", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded.");
    }

    const fields = JSON.parse(req.body.fields || "[]");

    if (!fields.length) {
      return res.status(400).send("No form fields found.");
    }

    const inputPath = req.file.path;
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const field of fields) {
      const pageIndex = Number(field.page) - 1;

      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      if (!field.dataUrl || !field.dataUrl.includes(",")) continue;

      const page = pages[pageIndex];
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      const base64Data = field.dataUrl.split(",")[1];
      const imageBytes = Buffer.from(base64Data, "base64");
      const image = await pdfDoc.embedPng(imageBytes);

      const scaleX = pdfWidth / Number(field.pageWidth || pdfWidth);
      const scaleY = pdfHeight / Number(field.pageHeight || pdfHeight);

      const drawX = Number(field.x || 0) * scaleX;
      const drawWidth = Number(field.width || 150) * scaleX;
      const drawHeight = Number(field.height || 40) * scaleY;
      const drawY = pdfHeight - (Number(field.y || 0) * scaleY) - drawHeight;

      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
    }

    const outputBytes = await pdfDoc.save();

    const finalOutputDir =
      typeof outputDir !== "undefined"
        ? outputDir
        : path.join(__dirname, "outputs");

    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    const outputFileName = `pdf-forms-${Date.now()}.pdf`;
    const outputPath = path.join(finalOutputDir, outputFileName);

    fs.writeFileSync(outputPath, outputBytes);
    fs.unlink(inputPath, () => {});

    res.download(outputPath, "pdf-form-completed.pdf", () => {
      fs.unlink(outputPath, () => {});
    });
  } catch (error) {
    console.error("PDF FORMS ERROR MESSAGE:", error.message);
    console.error("PDF FORMS FULL ERROR:", error);
    res.status(500).send(error.message || "Failed to process PDF forms.");
  }
});

app.post("/edit-pdf", upload.single("file"), async (req, res) => {

  try {

    const userId = req.body.user_id;

    console.log("EDIT PDF USER ID =", userId);

    if (!userId) {
      return res.status(401).send("Please login first");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();

    if (profileError) {
      return res.status(500).send("Unable to verify account");
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: usageData, error: usageError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("tool_name", "edit_pdf")
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError) {
      return res.status(500).send("Usage verification failed");
    }

    if (!profileData.is_premium) {

      const currentUsage =
        usageData ? usageData.usage_count : 0;

      if (currentUsage >= 8) {

        return res.status(403).send(
          "Daily free limit reached. Upgrade to Premium for unlimited Edit PDF usage."
        );

      }

    }

    if (!req.file) {
      return res.status(400).send("No PDF file uploaded.");
    }

    const elements = JSON.parse(req.body.elements || "[]");

    if (!elements.length) {
      return res.status(400).send("No edits found.");
    }

    const inputPath = req.file.path;

    const pdfBytes = fs.readFileSync(inputPath);

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();

    for (const item of elements) {

      const pageIndex = Number(item.page) - 1;

      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      if (!item.dataUrl || !item.dataUrl.includes(",")) continue;

      const page = pages[pageIndex];

      const {
        width: pdfWidth,
        height: pdfHeight
      } = page.getSize();

      const base64Data =
        item.dataUrl.split(",")[1];

      const imageBytes =
        Buffer.from(base64Data, "base64");

      let image;

      if (
        item.dataUrl.includes("image/jpeg") ||
        item.dataUrl.includes("image/jpg")
      ) {

        image =
          await pdfDoc.embedJpg(imageBytes);

      } else {

        image =
          await pdfDoc.embedPng(imageBytes);

      }

      const scaleX =
        pdfWidth /
        Number(item.pageWidth || pdfWidth);

      const scaleY =
        pdfHeight /
        Number(item.pageHeight || pdfHeight);

      const drawX =
        Number(item.x || 0) * scaleX;

      const drawWidth =
        Number(item.width || 150) * scaleX;

      const drawHeight =
        Number(item.height || 40) * scaleY;

      const drawY =
        pdfHeight -
        (Number(item.y || 0) * scaleY) -
        drawHeight;

      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });

    }

    const outputBytes =
      await pdfDoc.save();

    if (!usageData) {

      const { error: insertError } =
        await supabase
          .from("usage_logs")
          .insert([
            {
              user_id: userId,
              tool_name: "edit_pdf",
              usage_date: today,
              usage_count: 1
            }
          ]);

      console.log(
        "EDIT PDF INSERT ERROR =",
        insertError
      );

    } else {

      const { error: updateError } =
        await supabase
          .from("usage_logs")
          .update({
            usage_count:
              usageData.usage_count + 1
          })
          .eq("id", usageData.id);

      console.log(
        "EDIT PDF UPDATE ERROR =",
        updateError
      );

    }

    const finalOutputDir =
      typeof outputDir !== "undefined"
        ? outputDir
        : path.join(__dirname, "outputs");

    if (!fs.existsSync(finalOutputDir)) {

      fs.mkdirSync(finalOutputDir, {
        recursive: true
      });

    }

    const outputFileName =
      `edited-${Date.now()}.pdf`;

    const outputPath =
      path.join(
        finalOutputDir,
        outputFileName
      );

    fs.writeFileSync(
      outputPath,
      outputBytes
    );

    fs.unlink(inputPath, () => {});

    res.download(
      outputPath,
      "edited-pdf.pdf",
      () => {

        fs.unlink(
          outputPath,
          () => {}
        );

      }
    );

  } catch (error) {

    console.error(
      "EDIT PDF ERROR MESSAGE:",
      error.message
    );

    console.error(
      "EDIT PDF FULL ERROR:",
      error
    );

    res
      .status(500)
      .send(
        error.message ||
        "Failed to edit PDF."
      );

  }

});

app.post("/translate-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded.");
    }

    const inputPath = req.file.path;
    const fromLang = String(req.body.fromLang || "auto");
    const toLang = String(req.body.toLang || "english");

    const dataBuffer = fs.readFileSync(inputPath);
    const parsed = await pdfParse(dataBuffer);

    const originalText = String(parsed.text || "").replace(/\s+/g, " ").trim();

    fs.unlink(inputPath, () => {});

    if (!originalText) {
      return res.status(400).send("Could not extract readable text from this PDF.");
    }

    const translated = makeDemoTranslation(originalText, fromLang, toLang);

    res.json({
      original: originalText,
      translated
    });
  } catch (error) {
    console.error("TRANSLATE PDF ERROR MESSAGE:", error.message);
    console.error("TRANSLATE PDF FULL ERROR:", error);
    res.status(500).send(error.message || "Failed to translate PDF.");
  }
});

function makeDemoTranslation(text, fromLang, toLang) {
  const cleanText = String(text || "").trim();

  const header = `Translated PDF\nFrom: ${fromLang}\nTo: ${toLang}\n\n`;

  if (toLang === "urdu") {
    return (
      header +
      "Demo translation mode:\n\n" +
      "Is PDF ka text successfully extract ho gaya hai. Real Urdu translation ke liye Google Translate, DeepL, ya OpenAI API connect karni hogi.\n\n" +
      "Original extracted text:\n\n" +
      cleanText.slice(0, 6000)
    );
  }

  if (toLang === "arabic") {
    return (
      header +
      "Demo translation mode:\n\n" +
      "تم استخراج نص ملف PDF بنجاح. للحصول على ترجمة عربية حقيقية، يجب ربط Google Translate أو DeepL أو OpenAI API.\n\n" +
      "Original extracted text:\n\n" +
      cleanText.slice(0, 6000)
    );
  }

  if (toLang === "french") {
    return (
      header +
      "Mode de traduction démo:\n\n" +
      "Le texte du PDF a été extrait avec succès. Pour une vraie traduction française, connectez Google Translate, DeepL ou OpenAI API.\n\n" +
      "Original extracted text:\n\n" +
      cleanText.slice(0, 6000)
    );
  }

  return (
    header +
    "Demo translation mode:\n\n" +
    "The PDF text was extracted successfully. For real translation, connect Google Translate, DeepL, or OpenAI API.\n\n" +
    "Original extracted text:\n\n" +
    cleanText.slice(0, 6000)
  );
}


const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// DNS TEST ROUTE
app.get("/dns-test", async (req, res) => {
  const dns = require("dns");

  dns.lookup("google.com", (err, address) => {
    if (err) {
      return res.json({
        success: false,
        error: err.message
      });
    }

    return res.json({
      success: true,
      address
    });
  });
});

// SUPABASE HOST DNS TEST
app.get("/supabase-host-test", async (req, res) => {
  const dns = require("dns");

  dns.lookup("vfpgxiepllmkfkdtjyws.supabase.co", (err, address) => {
    if (err) {
      return res.json({
        success: false,
        error: err.message
      });
    }

    return res.json({
      success: true,
      address
    });
  });
});

// SUPABASE TEST ROUTE
app.get("/test-supabase", async (req, res) => {
  console.log("BEFORE SUPABASE QUERY");
  console.log("TEST-SUPABASE ROUTE HIT");
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

      console.log("AFTER SUPABASE QUERY");
console.log("SUPABASE ERROR =", error);
console.log("SUPABASE DATA =", data);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      data
    });

  } catch (err) {
  console.error("FULL SUPABASE ERROR:", err);

  return res.status(500).json({
    success: false,
    error: err.message,
    stack: err.stack,
    cause: err.cause
      ? {
          message: err.cause.message,
          code: err.cause.code,
          errno: err.cause.errno
        }
      : null
  });
}
});

// USAGE LOG TEST ROUTE
app.get("/test-log-usage", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usage_logs")
      .insert([
        {
          user_id: "78d49140-bf8d-4c7f-a9ec-6da1468533ce",
          tool_name: "pdf_merge",
          usage_date: new Date().toISOString().split("T")[0],
          usage_count: 1
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        error
      });
    }

    return res.json({
      success: true,
      data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("Supabase connected");

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});