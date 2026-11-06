
// ==========================================
// MURGABANI 1 TO 100 CLUB
// OPTIMIZED ROAD COLLECTION BACKEND
// ==========================================

const ROAD_COLLECTION_SHEET = "Road Collection V2";
const VEHICLE_MASTER_SHEET = "Vehicle Master";

const ROAD_ALLOWED_PUJA = "Saraswati puja";
const ROAD_VEHICLE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;


// ==========================================
// COMMON HELPERS
// ==========================================

function getRoadSheets_() {

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const roadSheet = ss.getSheetByName(ROAD_COLLECTION_SHEET);
    const vehicleSheet = ss.getSheetByName(VEHICLE_MASTER_SHEET);

    if (!roadSheet) {
        throw new Error("Road Collection V2 sheet not found.");
    }

    if (!vehicleSheet) {
        throw new Error("Vehicle Master sheet not found.");
    }

    return {
        ss: ss,
        roadSheet: roadSheet,
        vehicleSheet: vehicleSheet
    };

}


function normalizeRoadVehicle_(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

}


function isValidRoadYear_(year) {

    return /^\d{4}$/.test(String(year || "").trim());

}


function roadError_(message, extra) {

    return Object.assign(
        {
            success: false,
            message: message
        },
        extra || {}
    );

}


// ==========================================
// SEARCH VEHICLE
// ==========================================

function searchVehicle(e) {

    try {

        const p = e && e.parameter ? e.parameter : {};

        const vehicleNo = normalizeRoadVehicle_(p.vehicleNo);
        const year = String(p.year || "").trim();
        const puja = String(p.puja || "").trim();

        if (!vehicleNo) {
            return roadError_("Vehicle Number Required");
        }

        if (!ROAD_VEHICLE_REGEX.test(vehicleNo)) {
            return roadError_("Please enter a valid vehicle number.");
        }

        if (!isValidRoadYear_(year)) {
            return roadError_("Invalid collection year.");
        }

        if (puja !== ROAD_ALLOWED_PUJA) {
            return roadError_(
                "Road Collection is available only during Saraswati Puja."
            );
        }

        const sheets = getRoadSheets_();

        // ----------------------------------
        // VEHICLE MASTER: Read only A:B
        // ----------------------------------

        let vehicleType = "";

        const vehicleLastRow = sheets.vehicleSheet.getLastRow();

        if (vehicleLastRow > 1) {

            const vehicleData = sheets.vehicleSheet
                .getRange(2, 1, vehicleLastRow - 1, 2)
                .getValues();

            for (let i = 0; i < vehicleData.length; i++) {

                if (
                    normalizeRoadVehicle_(vehicleData[i][0]) === vehicleNo
                ) {

                    vehicleType = String(vehicleData[i][1] || "").trim();
                    break;

                }

            }

        }

        // ----------------------------------
        // ROAD COLLECTION: Search A:L
        // ----------------------------------

        const roadLastRow = sheets.roadSheet.getLastRow();

        if (roadLastRow > 1) {

            const roadData = sheets.roadSheet
                .getRange(2, 1, roadLastRow - 1, 12)
                .getValues();

            for (let i = roadData.length - 1; i >= 0; i--) {

                const row = roadData[i];

                if (
                    normalizeRoadVehicle_(row[3]) === vehicleNo &&
                    String(row[2] || "").trim() === year &&
                    String(row[5] || "").trim() === puja
                ) {

                    return {
                        success: true,
                        found: true,
                        collectionId: row[0],
                        date: row[1],
                        year: row[2],
                        vehicleNo: row[3],
                        vehicleType: row[4],
                        puja: row[5],
                        amount: row[6],
                        status: row[7],
                        note: row[8],
                        collectorId: row[9],
                        collectorName: row[10],
                        timestamp: row[11]
                    };

                }

            }

        }

        return {
            success: true,
            found: false,
            vehicleType: vehicleType
        };

    } catch (error) {

        console.error("Road vehicle search error:", error);

        return roadError_(
            "Unable to search vehicle. Please try again."
        );

    }

}


// ==========================================
// GENERATE COLLECTION ID
// ==========================================

function generateCollectionIdForSheet_(sheet, year) {

    const prefix = "RC" + year + "-";
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        return prefix + "001";
    }

    const ids = sheet
        .getRange(2, 1, lastRow - 1, 1)
        .getValues();

    let maxNumber = 0;

    for (let i = 0; i < ids.length; i++) {

        const id = String(ids[i][0] || "").trim();

        if (!id.startsWith(prefix)) {
            continue;
        }

        const numberPart = id.substring(prefix.length);

        if (!/^\d+$/.test(numberPart)) {
            continue;
        }

        const number = Number(numberPart);

        if (number > maxNumber) {
            maxNumber = number;
        }

    }

    return prefix + String(maxNumber + 1).padStart(3, "0");

}


// Preserve the original function name.

function generateCollectionId(year) {

    if (!isValidRoadYear_(year)) {
        throw new Error("Invalid collection year.");
    }

    const sheets = getRoadSheets_();

    return generateCollectionIdForSheet_(
        sheets.roadSheet,
        String(year).trim()
    );

}


// ==========================================
// FIND EXISTING VEHICLE
// ==========================================

function findVehicleMasterRow_(sheet, vehicleNo) {

    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        return null;
    }

    const vehicles = sheet
        .getRange(2, 1, lastRow - 1, 2)
        .getValues();

    for (let i = 0; i < vehicles.length; i++) {

        if (
            normalizeRoadVehicle_(vehicles[i][0]) === vehicleNo
        ) {
            return {
                rowNumber: i + 2,
                vehicleType: String(vehicles[i][1] || "").trim()
            };
        }

    }

    return null;

}


// ==========================================
// UPDATE VEHICLE MASTER
// ==========================================

function updateVehicleMasterForSheet_(sheet, data) {

    const existing = findVehicleMasterRow_(
        sheet,
        data.vehicleNo
    );

    if (existing) {

        const currentCount = Number(
            sheet.getRange(existing.rowNumber, 5).getValue()
        ) || 0;

        // Update D:H together.
        sheet.getRange(existing.rowNumber, 4, 1, 5).setValues([[
            data.date,
            currentCount + 1,
            data.puja,
            data.collectorName,
            data.collectionId
        ]]);

        return;

    }

    // New Vehicle Master record.
    const nextRow = sheet.getLastRow() + 1;

    sheet.getRange(nextRow, 1, 1, 8).setValues([[
        data.vehicleNo,
        data.vehicleType,
        data.date,
        data.date,
        1,
        data.puja,
        data.collectorName,
        data.collectionId
    ]]);

}


// Preserve the original public function name.

function updateVehicleMaster(data) {

    const sheets = getRoadSheets_();

    updateVehicleMasterForSheet_(
        sheets.vehicleSheet,
        data
    );

}


// ==========================================
// CHECK DUPLICATE COLLECTION
// ==========================================

function findExistingRoadCollection_(
    sheet,
    vehicleNo,
    year,
    puja
) {

    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        return null;
    }

    const rows = sheet
        .getRange(2, 1, lastRow - 1, 6)
        .getValues();

    for (let i = rows.length - 1; i >= 0; i--) {

        const row = rows[i];

        if (
            normalizeRoadVehicle_(row[3]) === vehicleNo &&
            String(row[2] || "").trim() === year &&
            String(row[5] || "").trim() === puja
        ) {

            return {
                collectionId: row[0],
                rowNumber: i + 2
            };

        }

    }

    return null;

}


// ==========================================
// SAVE ROAD COLLECTION
// ==========================================

function saveRoadCollection(e) {

    const lock = LockService.getScriptLock();

    let lockAcquired = false;
    let savedRoadRow = 0;
    let roadSheetForRollback = null;

    try {

        // Prevent simultaneous duplicate submissions.
        lock.waitLock(30000);
        lockAcquired = true;

        const p = e && e.parameter ? e.parameter : {};

        const data = {

            date: String(p.date || "").trim(),

            year: String(p.year || "").trim(),

            vehicleNo: normalizeRoadVehicle_(p.vehicleNo),

            vehicleType: String(p.vehicleType || "").trim(),

            puja: String(p.puja || "").trim(),

            amount: Number(p.amount),

            status: "Paid",

            note: "",

            collectorId: String(p.collectorId || "").trim(),

            collectorName: String(p.collectorName || "").trim()

        };


        // ==================================
        // VALIDATION
        // ==================================

        if (!isValidRoadYear_(data.year)) {
            return roadError_("Invalid collection year.");
        }

        if (data.puja !== ROAD_ALLOWED_PUJA) {
            return roadError_(
                "Road Collection is available only during Saraswati Puja."
            );
        }

        if (!data.vehicleNo) {
            return roadError_("Vehicle Number Required");
        }

        if (!ROAD_VEHICLE_REGEX.test(data.vehicleNo)) {
            return roadError_("Please enter a valid vehicle number.");
        }

        if (!data.vehicleType) {
            return roadError_("Vehicle Type Required");
        }

        if (!Number.isFinite(data.amount) || data.amount <= 0) {
            return roadError_("Please enter a valid collection amount.");
        }

        if (!data.collectorId || !data.collectorName) {
            return roadError_(
                "Collector information is missing. Please login again."
            );
        }

        // Keep date format compatible with the existing frontend.
        if (!data.date) {
            return roadError_("Collection date is required.");
        }


        // ==================================
        // GET SHEETS ONCE
        // ==================================

        const sheets = getRoadSheets_();

        const roadSheet = sheets.roadSheet;
        const vehicleSheet = sheets.vehicleSheet;

        roadSheetForRollback = roadSheet;


        // ==================================
        // DUPLICATE CHECK
        // ==================================

        const existing = findExistingRoadCollection_(
            roadSheet,
            data.vehicleNo,
            data.year,
            data.puja
        );

        if (existing) {

            return roadError_(
                "This vehicle has already been collected for the selected Year and Puja.",
                {
                    duplicate: true,
                    collectionId: existing.collectionId
                }
            );

        }


        // ==================================
        // GENERATE ID
        // ==================================

        data.collectionId = generateCollectionIdForSheet_(
            roadSheet,
            data.year
        );


        // ==================================
        // SAVE ROAD COLLECTION
        // Preserve the existing A:L structure.
        // ==================================

        const timestamp = new Date();

        savedRoadRow = roadSheet.getLastRow() + 1;

        roadSheet.getRange(savedRoadRow, 1, 1, 12).setValues([[
            data.collectionId,
            data.date,
            data.year,
            data.vehicleNo,
            data.vehicleType,
            data.puja,
            data.amount,
            data.status,
            data.note,
            data.collectorId,
            data.collectorName,
            timestamp
        ]]);


        // ==================================
        // UPDATE VEHICLE MASTER
        // ==================================

        updateVehicleMasterForSheet_(
            vehicleSheet,
            data
        );

        SpreadsheetApp.flush();

        return {
            success: true,
            message: "Road Collection Saved Successfully.",
            collectionId: data.collectionId
        };


    } catch (error) {

        console.error("Road collection save error:", error);

        // If Vehicle Master update fails after the Road Collection
        // row is written, attempt to remove that incomplete record.
        if (
            savedRoadRow > 0 &&
            roadSheetForRollback
        ) {

            try {

                roadSheetForRollback.deleteRow(savedRoadRow);

                SpreadsheetApp.flush();

            } catch (rollbackError) {

                console.error(
                    "Road collection rollback error:",
                    rollbackError
                );

            }

        }

        return roadError_(
            error && error.message
                ? error.message
                : "Unable to save Road Collection. Please try again."
        );

    } finally {

        if (lockAcquired) {
            lock.releaseLock();
        }

    }

}
