import { Router, Request, Response } from "express";
import { booksStore } from "../models/bookStore";
import { stringify } from "csv-stringify/sync";
import { google } from "googleapis";
import { config } from "../config";
import path from "path";
import fs from "fs";

const router: Router = Router();

router.post("/csv", (req: Request, res: Response) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "Book ID is required" });
    }

    const book = booksStore.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    console.log(`📊 CSV Export - Book ${bookId}`);

    const csvData = [
      {
        "listingid": `bk-${bookId.substring(0, 8)}`,
        "title": book.normalized.title || book.autoTitle || "",
        "author": book.normalized.author || "",
        "illustrator": book.normalized.illustrator || book.normalized.coverDesigner || "",
        "price": book.normalized.retailPrice || "",
        "quantity": book.normalized.quantity || "1",
        "producttype": book.normalized.productType || "book",
        "description": book.autoDescription || book.normalized.description || "",
        "bindingtext": book.normalized.format || "Hardcover",
        "bookcondition": book.normalized.condition || "Acceptable",
        "publishername": book.normalized.publisherName || "",
        "placepublished": book.normalized.placePublished || "",
        "yearpublished": book.normalized.yearPublished || "",
        "isbn": book.normalized.printISBN || book.normalized.eISBN || "",
        "sellercatalog1": "",
        "sellercatalog2": "",
        "sellercatalog3": "",
        "abecategory": book.normalized.category || book.normalized.genre || "",
        "keywords": book.normalized.genre || book.normalized.category || "",
        "jacketcondition": book.normalized.jacketCondition || "dust jacket included",
        "editiontext": book.normalized.editionText || "",
        "printingtext": book.normalized.printingText || "",
        "signedtext": book.normalized.signedText || "not signed",
        "volume": book.normalized.volume || "",
        "size": "",
        "imgurl": book.sourceImage.url || "",
        "weight": "",
        "weightunit": "",
        "shippingtemplateid": "",
        "language": book.normalized.language || "English",
      },
    ];

    const csv = stringify(csvData, { header: true });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="book-${bookId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Book CSV export error:", error);
    res.status(500).json({ error: "Book CSV export failed" });
  }
});

router.post("/sheets", async (req: Request, res: Response) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "Book ID is required" });
    }

    const book = booksStore.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Use the book-specific spreadsheet ID from config or request
    // IMPORTANT: Always use book-specific config, never fall back to card spreadsheet
    // Priority: request body > bookSpreadsheetId env var > fallback to book spreadsheet
    let spreadsheetId = req.body.spreadsheetId;
    let sheetName = req.body.sheetName;
    
    // If not in request, use book-specific config
    if (!spreadsheetId) {
      spreadsheetId = config.google.sheets.bookSpreadsheetId || "1Ewmg4QSCtbQ4OHQErX07lxzsYWSPKiDCQZ257hdPgE4";
    }
    
    if (!sheetName) {
      sheetName = config.google.sheets.bookSheetName || "book title";
    }

    // Log for debugging
    console.log(`📊 Book Export Configuration:`);
    console.log(`   Request spreadsheetId: ${req.body.spreadsheetId || "not provided"}`);
    console.log(`   Config bookSpreadsheetId: "${config.google.sheets.bookSpreadsheetId || "not set"}"`);
    console.log(`   Config regular spreadsheetId: "${config.google.sheets.spreadsheetId || "not set"}"`);
    console.log(`   Using spreadsheetId: "${spreadsheetId}"`);
    console.log(`   Request sheetName: ${req.body.sheetName || "not provided"}`);
    console.log(`   Config bookSheetName: "${config.google.sheets.bookSheetName || "not set"}"`);
    console.log(`   Config regular sheetName: "${config.google.sheets.sheetName || "not set"}"`);
    console.log(`   Using sheetName: "${sheetName}"`);
    
    // CRITICAL Safety check: Ensure we're not accidentally using card spreadsheet
    const cardSpreadsheetId = "1QPfPoA7OgM8PnJvWu0ER_yoJlxnGZV5gGnI3GGG9kms";
    if (spreadsheetId === cardSpreadsheetId || spreadsheetId === config.google.sheets.spreadsheetId) {
      console.error(`❌ CRITICAL ERROR: Book export is trying to use CARD spreadsheet (${spreadsheetId})!`);
      console.error(`   This should NEVER happen for book exports. Using book spreadsheet instead.`);
      spreadsheetId = "1Ewmg4QSCtbQ4OHQErX07lxzsYWSPKiDCQZ257hdPgE4";
    }
    
    if (sheetName === "Cards" || sheetName === config.google.sheets.sheetName) {
      console.error(`❌ CRITICAL ERROR: Book export is trying to use CARD sheet name (${sheetName})!`);
      console.error(`   This should NEVER happen for book exports. Using book sheet name instead.`);
      sheetName = "book title";
    }
    
    // Final verification
    if (spreadsheetId !== "1Ewmg4QSCtbQ4OHQErX07lxzsYWSPKiDCQZ257hdPgE4") {
      console.warn(`⚠️  WARNING: Using non-standard book spreadsheet ID: ${spreadsheetId}`);
    }
    
    if (sheetName !== "book title") {
      console.warn(`⚠️  WARNING: Using non-standard book sheet name: ${sheetName}`);
    }

    if (!spreadsheetId) {
      return res.status(400).json({ 
        error: "Google Sheets Spreadsheet ID is required. Set GOOGLE_SHEETS_BOOK_SPREADSHEET_ID in .env or provide spreadsheetId in request." 
      });
    }

    // Initialize Google Sheets API
    let googleAuth: any;
    
    if (config.google.sheets.serviceAccountKeyJson) {
      googleAuth = new google.auth.GoogleAuth({
        credentials: config.google.sheets.serviceAccountKeyJson,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
    } else {
      const credentialsPath = config.google.sheets.serviceAccountKey
        ? (path.isAbsolute(config.google.sheets.serviceAccountKey)
            ? config.google.sheets.serviceAccountKey
            : path.join(__dirname, "../../", config.google.sheets.serviceAccountKey))
        : null;

      if (!credentialsPath || !fs.existsSync(credentialsPath)) {
        if (config.nodeEnv === "production") {
          return res.status(500).json({ 
            error: "Google Sheets service account credentials not found. In production, you must set GOOGLE_SHEETS_CREDENTIALS_JSON environment variable." 
          });
        }
        return res.status(500).json({ 
          error: "Google Sheets service account credentials not found. Check GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY or GOOGLE_SHEETS_CREDENTIALS_JSON in .env" 
        });
      }

      googleAuth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
    }

    const sheets = google.sheets({ version: "v4", auth: googleAuth });

    // Get service account email for sharing instructions
    let serviceAccountEmail = "unknown";
    try {
      if (config.google.sheets.serviceAccountKeyJson) {
        serviceAccountEmail = config.google.sheets.serviceAccountKeyJson.client_email || "unknown";
      } else {
        const credentialsPath = config.google.sheets.serviceAccountKey
          ? (path.isAbsolute(config.google.sheets.serviceAccountKey)
              ? config.google.sheets.serviceAccountKey
              : path.join(__dirname, "../../", config.google.sheets.serviceAccountKey))
          : null;
        if (credentialsPath && fs.existsSync(credentialsPath)) {
          const creds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
          serviceAccountEmail = creds.client_email || "unknown";
        }
      }
      console.log(`📧 Service Account Email: ${serviceAccountEmail}`);
    } catch (e) {
      console.warn("⚠️  Could not extract service account email:", e);
    }

    // Check if sheet exists
    try {
      await sheets.spreadsheets.get({ spreadsheetId });
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("permission") || errorMsg.includes("403") || error?.code === 403) {
        return res.status(403).json({ 
          error: `Permission denied. Please share the Google Sheet with the service account email: ${serviceAccountEmail}`,
          serviceAccountEmail,
          spreadsheetId,
          instructions: `1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n2. Click "Share" button\n3. Add this email: ${serviceAccountEmail}\n4. Give it "Editor" permissions\n5. Click "Send" or "Done"`
        });
      }
      return res.status(404).json({ error: `Spreadsheet not found. Please check the spreadsheet ID: ${spreadsheetId}` });
    }

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(
      (sheet) => sheet.properties?.title === sheetName
    );

    // Create sheet if it doesn't exist
    if (!sheetExists) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });
        console.log(`✅ Created sheet "${sheetName}" in spreadsheet`);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes("permission") || errorMsg.includes("403") || error?.code === 403) {
          return res.status(403).json({ 
            error: `Permission denied. Please share the Google Sheet with the service account email: ${serviceAccountEmail}`,
            serviceAccountEmail,
            spreadsheetId,
            sheetName,
            instructions: `1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n2. Click "Share" button (top right)\n3. Add this email: ${serviceAccountEmail}\n4. Give it "Editor" permissions\n5. Click "Send" or "Done"\n6. Try exporting again`
          });
        }
        throw error; // Re-throw if it's a different error
      }
    }

    // Get current data to find next row and check headers
    // 30 columns: A to AD (A=1, B=2, ..., Z=26, AA=27, AB=28, AC=29, AD=30)
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AD`, // A to AD covers all 30 columns
    });

    const nextRow = (existingData.data.values?.length || 0) + 1;

    // Book spreadsheet headers (from SOW reference)
    const expectedHeaders = [
      "listingid",
      "title",
      "author",
      "illustrator",
      "price",
      "quantity",
      "producttype",
      "description",
      "bindingtext",
      "bookcondition",
      "publishername",
      "placepublished",
      "yearpublished",
      "isbn",
      "sellercatalog1",
      "sellercatalog2",
      "sellercatalog3",
      "abecategory",
      "keywords",
      "jacketcondition",
      "editiontext",
      "printingtext",
      "signedtext",
      "volume",
      "size",
      "imgurl",
      "weight",
      "weightunit",
      "shippingtemplateid",
      "language",
    ];

    let needsHeaderUpdate = false;
    
    if (existingData.data.values && existingData.data.values.length > 0) {
      const existingHeaders = existingData.data.values[0];
      
      if (existingHeaders.length !== expectedHeaders.length) {
        needsHeaderUpdate = true;
      } else {
        for (let i = 0; i < expectedHeaders.length; i++) {
          if (existingHeaders[i] !== expectedHeaders[i]) {
            needsHeaderUpdate = true;
            break;
          }
        }
      }
    }

    // Add or update header row if needed
    if (nextRow === 1 || needsHeaderUpdate) {
      // 30 columns: A to AD (A=1, B=2, ..., Z=26, AA=27, AB=28, AC=29, AD=30)
      const headerRange = `${sheetName}!A1:AD1`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [expectedHeaders],
        },
      });
      console.log(`✅ Headers ${nextRow === 1 ? 'created' : 'updated'} successfully`);
    }

    // Prepare row data according to field mapping
    const rowData = [
      `bk-${bookId.substring(0, 8)}`, // listingid
      String(book.normalized.title || book.autoTitle || ""), // title
      String(book.normalized.author || ""), // author
      String(book.normalized.illustrator || book.normalized.coverDesigner || ""), // illustrator
      String(book.normalized.retailPrice || ""), // price
      String(book.normalized.quantity || "1"), // quantity
      String(book.normalized.productType || "book"), // producttype
      String(book.autoDescription || book.normalized.description || ""), // description
      String(book.normalized.format || "Hardcover"), // bindingtext
      String(book.normalized.condition || "Acceptable"), // bookcondition
      String(book.normalized.publisherName || ""), // publishername
      String(book.normalized.placePublished || ""), // placepublished
      String(book.normalized.yearPublished || ""), // yearpublished
      String(book.normalized.printISBN || book.normalized.eISBN || ""), // isbn
      "", // sellercatalog1
      "", // sellercatalog2
      "", // sellercatalog3
      String(book.normalized.category || book.normalized.genre || ""), // abecategory
      String(book.normalized.genre || book.normalized.category || ""), // keywords
      String(book.normalized.jacketCondition || "dust jacket included"), // jacketcondition
      String(book.normalized.editionText || ""), // editiontext
      String(book.normalized.printingText || ""), // printingtext
      String(book.normalized.signedText || "not signed"), // signedtext
      String(book.normalized.volume || ""), // volume
      "", // size
      String(book.sourceImage.url || ""), // imgurl
      "", // weight
      "", // weightunit
      "", // shippingtemplateid
      String(book.normalized.language || "English"), // language
    ];
    
    const expectedLength = expectedHeaders.length;
    if (rowData.length !== expectedLength) {
      console.error(`❌ CRITICAL ERROR: rowData has ${rowData.length} elements, expected ${expectedLength}!`);
      throw new Error(`Row data array has incorrect length: ${rowData.length} instead of ${expectedLength}`);
    }

    // Append data row
    // 30 columns: A to AD (A=1, B=2, ..., Z=26, AA=27, AB=28, AC=29, AD=30)
    const range = `${sheetName}!A${nextRow}:AD${nextRow}`;
    
    console.log(`📝 Writing row ${nextRow} to Google Sheets with ${rowData.length} columns`);
    console.log(`   Range: ${range}`);
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
    console.log(`   Sheet Name: ${sheetName}`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: range,
      valueInputOption: "RAW",
      requestBody: {
        values: [rowData],
      },
    });
    
    console.log(`✅ Successfully wrote row ${nextRow} to Google Sheets`);

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    res.json({
      message: "Book data exported to Google Sheets successfully",
      spreadsheetId,
      sheetName,
      sheetUrl,
      row: nextRow,
    });
  } catch (error) {
    console.error("Book Sheets export error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ 
      error: "Google Sheets export failed",
      details: config.nodeEnv === "development" ? errorMessage : undefined,
    });
  }
});

export { router as bookExportRouter };
