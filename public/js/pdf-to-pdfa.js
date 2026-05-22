app.post("/pdf-to-pdfa", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    const inputPath = req.file.path;
    const outputFileName = `pdfa-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, "outputs", outputFileName);

    const gsPath = process.env.GHOSTSCRIPT_PATH || "gs";

    const command = `"${gsPath}" -dPDFA=2 -dBATCH -dNOPAUSE -dNOOUTERSAVE -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile="${outputPath}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("PDF TO PDFA ERROR:", error);
        console.error("PDF TO PDFA STDERR:", stderr);
        return res.status(500).send("PDF/A conversion failed. Please make sure Ghostscript is installed.");
      }

      if (!fs.existsSync(outputPath)) {
        return res.status(500).send("PDF/A output file was not created.");
      }

      res.download(outputPath, "converted-pdfa.pdf", (downloadError) => {
        if (downloadError) {
          console.error("PDF TO PDFA DOWNLOAD ERROR:", downloadError);
        }

        try {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error("PDF TO PDFA CLEANUP ERROR:", cleanupError);
        }
      });
    });

  } catch (error) {
    console.error("PDF TO PDFA FULL ERROR:", error);
    res.status(500).send("PDF/A conversion failed.");
  }
});