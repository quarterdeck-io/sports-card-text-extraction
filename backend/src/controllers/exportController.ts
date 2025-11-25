import { Router, Request, Response } from "express";
import { cardsStore } from "../models/cardStore";
import { stringify } from "csv-stringify/sync";
import { google } from "googleapis";
import { config } from "../config";
import path from "path";
import fs from "fs";

const router: Router = Router();

router.post("/csv", (req: Request, res: Response) => {
  try {
    const { cardId } = req.body;

    if (!cardId) {
      return res.status(400).json({ error: "Card ID is required" });
    }

    const card = cardsStore.get(cardId);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    
    // CRITICAL: Verify card record structure before export
    console.log(`🔍 VERIFICATION - Card ${cardId} record check:`);
    console.log(`   card.autoTitle exists: ${!!card.autoTitle}`);
    console.log(`   card.autoTitle type: ${typeof card.autoTitle}`);
    console.log(`   card.autoTitle value: "${card.autoTitle}"`);
    console.log(`   card.autoDescription exists: ${!!card.autoDescription}`);
    console.log(`   card.autoDescription type: ${typeof card.autoDescription}`);
    console.log(`   card.autoDescription value: "${card.autoDescription?.substring(0, 100) || ""}..."`);
    
    // Safety check: If autoTitle looks like description, swap them
    if (card.autoTitle && card.autoDescription) {
      if (card.autoTitle.length > 200 && card.autoDescription.length < 100) {
        console.error(`❌ CRITICAL: autoTitle (${card.autoTitle.length} chars) is longer than autoDescription (${card.autoDescription.length} chars)!`);
        console.error(`   This suggests fields are swapped in the card record.`);
        console.error(`   Swapping fields before export...`);
        const temp = card.autoTitle;
        card.autoTitle = card.autoDescription;
        card.autoDescription = temp;
        cardsStore.set(cardId, card);
        console.log(`   ✅ Fields swapped and saved.`);
      }
    }

    // Prepare CSV data
    // Use autoTitle for Title field if available (since Listing Title shows autoTitle)
    // Add detailed logging to debug the issue
    console.log(`📊 CSV Export - Card ${cardId} data:`);
    console.log(`   autoTitle (${card.autoTitle?.length || 0} chars): "${card.autoTitle?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   autoDescription (${card.autoDescription?.length || 0} chars): "${card.autoDescription?.substring(0, 80) || "EMPTY"}..."`);
    
    // Title = normalized.title (original from OCR)
    // Listing Title = autoTitle (generated format)
    // Caption = normalized.caption (original from OCR)
    // Auto Description = autoDescription (generated description)
    const title = card.normalized.title || "";
    const listingTitle = card.autoTitle && card.autoTitle.trim() !== "" 
      ? card.autoTitle 
      : "";
    const caption = card.normalized.caption || "";
    const autoDescription = card.autoDescription && card.autoDescription.trim() !== ""
      ? card.autoDescription
      : "";
    
    console.log(`   Title (normalized.title): "${title?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   Listing Title (autoTitle): "${listingTitle?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   Caption (normalized.caption): "${caption?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   Auto Description (autoDescription): "${autoDescription?.substring(0, 80) || "EMPTY"}..."`);
    
    // Log if autoDescription is missing for debugging
    if (!card.autoDescription || card.autoDescription.trim() === "") {
      console.warn(`⚠️  Export: autoDescription is empty for card ${cardId}`);
      console.warn(`   autoTitle: "${card.autoTitle}"`);
    }
    
    const csvData = [
      {
        Year: card.normalized.year,
        Set: card.normalized.set,
        "Card Number": card.normalized.cardNumber,
        Title: title,
        "Listing Title": listingTitle,
        "Player First Name": card.normalized.playerFirstName,
        "Player Last Name": card.normalized.playerLastName,
        "Grading Company": card.normalized.gradingCompany,
        Grade: card.normalized.grade,
        Cert: card.normalized.cert,
        Caption: caption,
        "Auto Description": autoDescription || "", // Ensure it's never undefined
      },
    ];

    const csv = stringify(csvData, { header: true });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="card-${cardId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ error: "CSV export failed" });
  }
});

router.post("/sheets", async (req: Request, res: Response) => {
  try {
    const { cardId } = req.body;

    if (!cardId) {
      return res.status(400).json({ error: "Card ID is required" });
    }

    const card = cardsStore.get(cardId);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    
    // CRITICAL: Verify card record structure before export
    console.log(`🔍 VERIFICATION - Card ${cardId} record check:`);
    console.log(`   card.autoTitle exists: ${!!card.autoTitle}`);
    console.log(`   card.autoTitle type: ${typeof card.autoTitle}`);
    console.log(`   card.autoTitle value: "${card.autoTitle}"`);
    console.log(`   card.autoDescription exists: ${!!card.autoDescription}`);
    console.log(`   card.autoDescription type: ${typeof card.autoDescription}`);
    console.log(`   card.autoDescription value: "${card.autoDescription?.substring(0, 100) || ""}..."`);
    
    // Safety check: If autoTitle looks like description, swap them
    if (card.autoTitle && card.autoDescription) {
      if (card.autoTitle.length > 200 && card.autoDescription.length < 100) {
        console.error(`❌ CRITICAL: autoTitle (${card.autoTitle.length} chars) is longer than autoDescription (${card.autoDescription.length} chars)!`);
        console.error(`   This suggests fields are swapped in the card record.`);
        console.error(`   Swapping fields before export...`);
        const temp = card.autoTitle;
        card.autoTitle = card.autoDescription;
        card.autoDescription = temp;
        cardsStore.set(cardId, card);
        console.log(`   ✅ Fields swapped and saved.`);
      }
    }

    const spreadsheetId = config.google.sheets.spreadsheetId || req.body.spreadsheetId;
    const sheetName = config.google.sheets.sheetName || req.body.sheetName || "Cards";

    if (!spreadsheetId) {
      return res.status(400).json({ 
        error: "Google Sheets Spreadsheet ID is required. Set GOOGLE_SHEETS_SPREADSHEET_ID in .env or provide spreadsheetId in request." 
      });
    }

    // Initialize Google Sheets API
    // Using any type to avoid TypeScript namespace issues during build
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let googleAuth: any;
    
    // Priority 1: Use JSON credentials from environment variable
    if (config.google.sheets.serviceAccountKeyJson) {
      googleAuth = new google.auth.GoogleAuth({
        credentials: config.google.sheets.serviceAccountKeyJson,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
    } else {
      // Priority 2: Use file path
      const credentialsPath = config.google.sheets.serviceAccountKey
        ? (path.isAbsolute(config.google.sheets.serviceAccountKey)
            ? config.google.sheets.serviceAccountKey
            : path.join(__dirname, "../../", config.google.sheets.serviceAccountKey))
        : null;

      if (!credentialsPath || !fs.existsSync(credentialsPath)) {
        if (config.nodeEnv === "production") {
          return res.status(500).json({ 
            error: "Google Sheets service account credentials not found. In production, you must set GOOGLE_SHEETS_CREDENTIALS_JSON environment variable. Copy the entire contents of your service account JSON file and set it as an environment variable." 
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

    // Prepare data row
    // Use autoTitle for Listing Title if available (since Listing Title shows autoTitle)
    // Add detailed logging to debug the issue
    console.log(`📊 Sheets Export - Card ${cardId} data:`);
    console.log(`   autoTitle (${card.autoTitle?.length || 0} chars): "${card.autoTitle?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   autoDescription (${card.autoDescription?.length || 0} chars): "${card.autoDescription?.substring(0, 80) || "EMPTY"}..."`);
    
    // Title = normalized.title (original from OCR)
    // Listing Title = autoTitle (generated format)
    // Caption = normalized.caption (original from OCR)
    // Auto Description = autoDescription (generated description)
    const title = card.normalized.title || "";
    const listingTitle = card.autoTitle && card.autoTitle.trim() !== "" 
      ? card.autoTitle 
      : "";
    const caption = card.normalized.caption || "";
    const autoDescription = card.autoDescription && card.autoDescription.trim() !== ""
      ? card.autoDescription
      : "";
    
    console.log(`   Title (normalized.title): "${title?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   Listing Title (autoTitle): "${listingTitle?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   Caption (normalized.caption): "${caption?.substring(0, 80) || "EMPTY"}..."`);
    console.log(`   Auto Description (autoDescription): "${autoDescription?.substring(0, 80) || "EMPTY"}..."`);
    
    // Log if autoDescription is missing for debugging
    if (!card.autoDescription || card.autoDescription.trim() === "") {
      console.warn(`⚠️  Sheets Export: autoDescription is empty for card ${cardId}`);
      console.warn(`   autoTitle: "${card.autoTitle}"`);
    }
    
    // Check if sheet exists, create if not
    try {
      await sheets.spreadsheets.get({ spreadsheetId });
    } catch (error) {
      return res.status(404).json({ error: `Spreadsheet not found. Please check the spreadsheet ID: ${spreadsheetId}` });
    }

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(
      (sheet) => sheet.properties?.title === sheetName
    );

    // Create sheet if it doesn't exist
    if (!sheetExists) {
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
    }

    // Get current data to find next row and check headers
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const nextRow = (existingData.data.values?.length || 0) + 1;

    // Verify headers if they exist and update if needed
    // New format: 12 columns (A-L)
    // Year, Set, Card Number, Title, Listing Title, Player First Name, Player Last Name,
    // Grading Company, Grade, Cert, Description, Auto Description
    let needsHeaderUpdate = false;
    
    if (existingData.data.values && existingData.data.values.length > 0) {
      const existingHeaders = existingData.data.values[0];
      const expectedHeaders = [
        "Year",
        "Set",
        "Card Number",
        "Title",
        "Listing Title",
        "Player First Name",
        "Player Last Name",
        "Grading Company",
        "Grade",
        "Cert",
        "Caption",
        "Auto Description",
      ];
      
      console.log(`📋 Existing headers in sheet:`, existingHeaders);
      console.log(`📋 Expected headers:`, expectedHeaders);
      
      // Check if headers match new format
      if (existingHeaders.length === expectedHeaders.length) {
        let matches = true;
        for (let i = 0; i < expectedHeaders.length; i++) {
          if (existingHeaders[i] !== expectedHeaders[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          console.log(`   ✅ Headers match expected format (13 columns).`);
        } else {
          console.warn(`   ⚠️  Headers don't match, will update`);
          needsHeaderUpdate = true;
        }
      } else {
        console.warn(`⚠️  WARNING: Sheet has ${existingHeaders.length} columns, expected ${expectedHeaders.length}!`);
        needsHeaderUpdate = true;
      }
    }

    // Ensure all values are strings and not undefined/null
    const safeTitle = String(title || "");
    const safeListingTitle = String(listingTitle || "");
    const safeCaption = String(caption || "");
    const safeAutoDescription = String(autoDescription || "");
    
    // Log exactly what we're writing to each column
    console.log(`📝 FINAL rowData values being written:`);
    console.log(`   [0] Year: "${card.normalized.year || ""}"`);
    console.log(`   [1] Set: "${card.normalized.set || ""}"`);
    console.log(`   [2] Card Number: "${card.normalized.cardNumber || ""}"`);
    console.log(`   [3] Title: "${safeTitle}" (${safeTitle.length} chars)`);
    console.log(`   [4] Listing Title: "${safeListingTitle}" (${safeListingTitle.length} chars)`);
    console.log(`   [5] Player First Name: "${card.normalized.playerFirstName || ""}"`);
    console.log(`   [6] Player Last Name: "${card.normalized.playerLastName || ""}"`);
    console.log(`   [7] Grading Company: "${card.normalized.gradingCompany || ""}"`);
    console.log(`   [8] Grade: "${card.normalized.grade || ""}"`);
    console.log(`   [9] Cert: "${card.normalized.cert || ""}"`);
    console.log(`   [10] Caption: "${safeCaption}" (${safeCaption.length} chars)`);
    console.log(`   [11] Auto Description: "${safeAutoDescription.substring(0, 80)}..." (${safeAutoDescription.length} chars)`);
    
    // Build rowData array with new structure:
    // Year, Set, Card Number, Title, Listing Title, Player First Name, Player Last Name,
    // Grading Company, Grade, Cert, Caption, Auto Description
    const rowData = [
      String(card.normalized.year || ""),
      String(card.normalized.set || ""),
      String(card.normalized.cardNumber || ""),
      safeTitle, // Title (normalized.title) - COLUMN D (index 3)
      safeListingTitle, // Listing Title (autoTitle) - COLUMN E (index 4)
      String(card.normalized.playerFirstName || ""),
      String(card.normalized.playerLastName || ""),
      String(card.normalized.gradingCompany || ""),
      String(card.normalized.grade || ""),
      String(card.normalized.cert || ""),
      safeCaption, // Caption (normalized.caption) - COLUMN K (index 10)
      safeAutoDescription, // Auto Description (autoDescription) - COLUMN L (index 11)
    ];
    
    const expectedLength = 12; // 12 columns total
    if (rowData.length !== expectedLength) {
      console.error(`❌ CRITICAL ERROR: rowData has ${rowData.length} elements, expected ${expectedLength}!`);
      throw new Error(`Row data array has incorrect length: ${rowData.length} instead of ${expectedLength}`);
    }
    
    console.log(`✅ rowData validation passed: ${rowData.length} columns`);

    // Add or update header row if needed
    if (nextRow === 1 || needsHeaderUpdate) {
      // New format: 12 columns
      const headers = [
        "Year",
        "Set",
        "Card Number",
        "Title",
        "Listing Title",
        "Player First Name",
        "Player Last Name",
        "Grading Company",
        "Grade",
        "Cert",
        "Caption",
        "Auto Description",
      ];
      
      // First, clear any columns beyond L (M, N, etc.) to remove duplicates
      // Get the total number of rows to clear
      const totalRows = existingData.data.values?.length || 1;
      if (totalRows > 0) {
        // Clear columns M-Z (13-26) if they exist
        const clearRange = `${sheetName}!M1:Z${totalRows}`;
        try {
          await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: clearRange,
          });
          console.log(`🧹 Cleared columns M-Z to remove duplicate headers`);
        } catch (error) {
          // Ignore if range doesn't exist
          console.log(`   (No columns beyond L to clear)`);
        }
      }
      
      const headerRange = `${sheetName}!A1:L1`; // 12 columns (A-L)
      
      console.log(`📝 ${nextRow === 1 ? 'Creating' : 'Updating'} header row with range: ${headerRange}`);
      console.log(`   Headers: ${headers.join(", ")}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers],
        },
      });
      console.log(`✅ Headers ${nextRow === 1 ? 'created' : 'updated'} successfully`);
    }

    // Append data row using update instead of append for precise column control
    // Using update ensures exact column alignment
    const range = `${sheetName}!A${nextRow}:L${nextRow}`; // 12 columns (A-L)
    
    console.log(`📝 Writing row ${nextRow} to Google Sheets with ${rowData.length} columns`);
    console.log(`   Range: ${range}`);
    console.log(`   Column D (Title): "${rowData[3]?.substring(0, 50) || ""}..."`);
    console.log(`   Column E (Listing Title): "${rowData[4]?.substring(0, 50) || ""}..."`);
    console.log(`   Column K (Caption): "${rowData[10]?.substring(0, 50) || ""}..."`);
    console.log(`   Column L (Auto Description): "${rowData[11]?.substring(0, 50) || ""}..."`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: range,
      valueInputOption: "RAW",
      requestBody: {
        values: [rowData],
      },
    });
    
    console.log(`✅ Successfully wrote row ${nextRow} to Google Sheets`);
    console.log(`   ✅ Title written to column D: "${rowData[3]?.substring(0, 50) || ""}..."`);
    console.log(`   ✅ Listing Title written to column E: "${rowData[4]?.substring(0, 50) || ""}..."`);
    console.log(`   ✅ Caption written to column K: "${rowData[10]?.substring(0, 50) || ""}..."`);
    console.log(`   ✅ Auto Description written to column L: "${rowData[11]?.substring(0, 50) || ""}..."`);

    // Clean up empty rows (skip header row)
    try {
      const allData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:L`,
      });
      
      if (allData.data.values && allData.data.values.length > 1) {
        // Get sheet ID for deletion
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetId = sheetInfo.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;
        
        if (!sheetId) {
          console.warn(`⚠️  Could not find sheet ID for cleanup`);
        } else {
          const rowsToDelete: number[] = [];
          
          // Check each row (skip header row at index 0)
          for (let i = 1; i < allData.data.values.length; i++) {
            const row = allData.data.values[i];
            // Check if row is empty (all cells are empty or whitespace)
            const isEmpty = !row || row.every((cell: string) => !cell || cell.trim() === "");
            if (isEmpty) {
              rowsToDelete.push(i + 1); // +1 because sheet rows are 1-indexed
            }
          }
          
          // Delete empty rows from bottom to top to maintain correct indices
          if (rowsToDelete.length > 0) {
            rowsToDelete.sort((a, b) => b - a); // Sort descending
            
            for (const rowNum of rowsToDelete) {
              await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                  requests: [
                    {
                      deleteDimension: {
                        range: {
                          sheetId: sheetId,
                          dimension: "ROWS",
                          startIndex: rowNum - 1, // 0-indexed
                          endIndex: rowNum,
                        },
                      },
                    },
                  ],
                },
              });
            }
            console.log(`🧹 Cleaned up ${rowsToDelete.length} empty row(s)`);
          }
        }
      }
    } catch (cleanupError) {
      // Don't fail the export if cleanup fails
      console.warn(`⚠️  Row cleanup failed (non-critical):`, cleanupError);
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    res.json({
      message: "Data exported to Google Sheets successfully",
      spreadsheetId,
      sheetName,
      sheetUrl,
      row: nextRow,
    });
  } catch (error) {
    console.error("Sheets export error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ 
      error: "Google Sheets export failed",
      details: config.nodeEnv === "development" ? errorMessage : undefined,
    });
  }
});

export { router as exportRouter };

