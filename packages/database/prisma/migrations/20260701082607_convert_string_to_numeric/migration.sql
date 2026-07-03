ALTER TABLE "Property"
    ALTER COLUMN "price"
        TYPE DECIMAL(18,2)
        USING "price"::DECIMAL(18,2),

    ALTER COLUMN "noOfBedRooms"
        TYPE INTEGER
        USING "noOfBedRooms"::INTEGER,

    ALTER COLUMN "noOfRestRooms"
        TYPE INTEGER
        USING "noOfRestRooms"::INTEGER,

    ALTER COLUMN "landArea"
        TYPE DECIMAL(12,2)
        USING "landArea"::DECIMAL(12,2),

    ALTER COLUMN "noOfFloors"
        TYPE INTEGER
        USING "noOfFloors"::INTEGER,

    ALTER COLUMN "floorArea"
        TYPE DECIMAL(12,2)
        USING "floorArea"::DECIMAL(12,2),

    ALTER COLUMN "roadSize"
        TYPE DECIMAL(6,2)
        USING "roadSize"::DECIMAL(6,2),

    ALTER COLUMN "floorLevel"
        TYPE INTEGER
        USING "floorLevel"::INTEGER;