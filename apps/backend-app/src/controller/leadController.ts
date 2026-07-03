import { Prisma, prisma } from "@repo/database";
import { AppError, createLead } from "@repo/functions";
import { UpdateLeadSchema } from "@repo/validators";
import { Request, Response } from "express";

type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "LOST"
  | "WON"
  | "NOT_INTERESTED"
  | "FOLLOW_UP"
  | "IN_PROGRESS"
  | "IN_NEGOTIATION";

//addLead controller function to handle lead creation requests, including file uploads and permission checks
export const addLead = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (user?.role !== "admin" && user?.role !== "staff") {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    req.body.managedById = user.id;

    const adaptedFile = req.file
      ? {
          fieldname: req.file.fieldname,
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
          size: req.file.size,
        }
      : null;

    const result = await createLead({
      body: req.body,
      file: adaptedFile,
      user,
    });

    return res
      .status(200)
      .json({ message: "Lead created successfully", ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res
        .status(error.status)
        .json({ message: error.message, ok: false });
    }

    return res
      .status(500)
      .json({ message: "Internal Server Error", ok: false });
  }
};

export const getLeads = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim() || "";
    const statusFilter = (req.query.status as string)?.toUpperCase() || "ALL";
    const dealType = (req.query.dealType as string)?.toLowerCase() || "ALL";
    const clientType = (req.query.clientType as string)?.toUpperCase() || "ALL";

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit as string) || 10),
    ); // Caps max page size to 100 for safety
    const skip = (page - 1) * limit;

    // 2. Build the dynamic database WHERE filter payload

    const VALID_LEAD_STATUSES = [
      "NEW",
      "CONTACTED",
      "INTERESTED",
      "NOT_INTERESTED",
      "IN_PROGRESS",
      "IN_NEGOTIATION",
      "FOLLOW_UP",
      "WON",
      "LOST",
    ] as const;

    const validDealTypes = ["buy", "rent", "sell"] as const;
    const validClientType = ["BUYER", "SELLER"] as const;

    const finalDealType = (validDealTypes as readonly string[]).includes(
      dealType,
    )
      ? dealType
      : undefined;
    const finalClientType = (validClientType as readonly string[]).includes(
      clientType,
    )
      ? clientType
      : undefined;
    const finalStatus = (VALID_LEAD_STATUSES as readonly string[]).includes(
      statusFilter,
    )
      ? statusFilter
      : undefined;

    const whereClause = {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { contact: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { source: { contains: q, mode: "insensitive" } as const },
        ],
      }),
      ...(finalDealType && { dealType: finalDealType }),
      ...(finalClientType && { clientType: finalClientType }),
      ...(finalStatus && { status: finalStatus }),
    };

    // 3. Execute queries concurrently using a Promise transaction to optimize execution time
    const [leads, totalRecords] = await prisma.$transaction([
      prisma.lead.findMany({
        where: whereClause as any,
        orderBy: { createdAt: "desc" }, // Fresh leads bubble up to the top automatically
        skip: skip,
        take: limit,
        // Include relations if your dashboard card needs to show assignees/properties
        include: {
          managedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.lead.count({ where: whereClause as any }),
    ]);

    // 4. Calculate total pages for UI button handling limits
    const totalPages = Math.ceil(totalRecords / limit);

    // 5. Package and return the standard paginated data shape
    return res.status(200).json({
      success: true,
      data: leads,
      meta: {
        total: totalRecords,
        page,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error inside getLeads controller pipeline:", error);
    return res.status(500).json({
      success: false,
      message:
        "An internal server error occurred while retrieving lead documents.",
      error: error.message,
    });
  }
};

export async function getLeadById(req: Request, res: Response) {

  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      throw new AppError(400, "Invalid Lead id");
    }

    const result = await prisma.lead.findUnique({
      where: { id },
      include: {
        managedBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (!result) {
      return res.status(404).json({
        message: "No lead for the id found!!!",
      });
    }

    return res.status(200).json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: "Couldn't fetch lead data",
    });
  }
}

export async function updateLeadStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status, remarks, followUpAt } = req.body;

    const allowedStatuses = [
      "CONTACTED",
      "INTERESTED",
      "NOT_INTERESTED",
      "FOLLOW_UP",
      "IN_PROGRESS",
      "IN_NEGOTIATION",
      "WON",
      "LOST",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid lead status",
      });
    }

    if (!id || Array.isArray(id)) {
      throw new AppError(400, "Invalid Lead Id");
    }

    const checkExistingStatus = await prisma.lead.findUnique({
      where: { id },
    });

    if (!checkExistingStatus) {
      return res.status(404).json({ message: "Lead record not found." });
    }

    if (checkExistingStatus.status === status) {
      return res.status(400).json({
        message: "Lead is already in this status",
      });
    }

    if (user.role !== "admin" && checkExistingStatus.managedById !== user.id){
      return res.status(403).json({
        message: "You are not authorized to perform this operation"
      })
    }

    if (
      checkExistingStatus?.status === "WON" ||
      checkExistingStatus?.status === "LOST"
    ) {
      return res.status(400).json({
        message: "Lead is already Closed and locked down.",
      });
    }

    if (status !== "WON" && status !== "LOST" && !followUpAt) {
      return res.status(400).json({
        message: ` ${status} updates require an explicitly set follow-up time. status should have followup time aswell`,
      });
    }

    if ((status === "WON" || status === "LOST") && !remarks?.trim()) {
      return res.status(400).json({
        message:
          "WON and LOST statuses mean a lead is closed; audit remarks are strictly mandatory!",
      });
    }

    const updateData: any = {
      status: status,
      updatedById: user.id,
    };

    // Only touch remarks if provided in request, or if forcing a terminal state
    if (remarks !== undefined || status === "WON" || status === "LOST") {
      updateData.remarks = remarks?.trim() || null;
    }

    // Only update follow-up alarm time if provided, or if moving away from a follow-up stage
    if (followUpAt !== undefined) {
      const parsedFollowUpAt = followUpAt ? new Date(followUpAt) : null;

      if (parsedFollowUpAt && isNaN(parsedFollowUpAt.getTime())) {
        return res.status(400).json({
          message: "Invalid follow up date",
        });
      }
      updateData.followUpAt = parsedFollowUpAt;
    } else if (status === "WON" || status === "LOST") {
      // Clean up past stale follow-up alarms automatically when deal reaches its end
      updateData.followUpAt = null;
      updateData.notes = null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const lead = await (tx.lead.update as any)({
        where: { id },
        data: updateData,
      });

      if (user.role === "staff") {
        const admins = await tx.user.findMany({
          where: { role: "admin" },
          select: { id: true, name: true },
        });

        await tx.notificationEvent.create({
          data: {
            senderId: user.id,
            title: `Lead Status updated from ${checkExistingStatus.status} to ${lead.status}`,
            body: `${user.name} updated status to ${lead.status}`,
            link: `/admin/leads/${lead.id}`,
            recipients: {
              create: admins.map((admin) => ({
                recipientId: admin.id,
              })),
            },
          },
        });
      }

      if (user.role === "admin") {
        const otherAdmins = await tx.user.findMany({
          where: {
            role: "admin",
            id: { not: user.id },
          },
          select: { id: true },
        });

        const recipientSet = new Set<string>(
          otherAdmins.map((admin) => admin.id),
        );

        if (lead.managedById && lead.managedById !== user.id) {
          recipientSet.add(lead.managedById);
        }

        const recipientIds = Array.from(recipientSet);

        // 4. Fire the single insert transaction query
        await tx.notificationEvent.create({
          data: {
            senderId: user.id,
            title: `Lead Adjusted by ${user.name}`,
            body: `Admin ${user.name} changed lead status from ${checkExistingStatus.status} to ${lead.status}`,
            link: `/admin/leads/${lead.id}`,
            recipients: {
              create: recipientIds.map((id) => ({
                recipientId: id,
              })),
            },
          },
        });
      }
      return true;
    });

    return res.status(200).json({
      ok: true,
      message: "Status Update Succesfully!!!",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server couldn't update status, so try again later",
    });
  }
}

export async function updateFollowUpTime(req: Request, res: Response) {
  try {
    const user = req.user;
    const { followUpAt } = req.body;
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      throw new AppError(400, "Invalid Lead Id");
    }

    const checkExistingStatus = await prisma.lead.findUnique({
      where: { id },
    });

    if (!checkExistingStatus) {
      return res.status(404).json({ message: "Lead record not found." });
    }

     if (user.role !== "admin" && checkExistingStatus.managedById !== user.id){
      return res.status(403).json({
        message: "You are not authorized to perform this operation"
      })
    }

    if (
      checkExistingStatus?.status === "WON" ||
      checkExistingStatus?.status === "LOST"
    ) {
      return res.status(400).json({
        message: "Lead is already Closed and locked down.",
      });
    }

    if (checkExistingStatus.status === "NEW") {
      return res.status(400).json({
        message:
          "Lead stauts is NEW so change status to update follow-up time!!!",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          followUpAt,
          updatedById: user.id,
        },
      });

      if (user.role === "staff") {
        // 1. Fetch all admin users
        const admins = await tx.user.findMany({
          where: { role: "admin" },
          select: { id: true, name: true },
        });

        // 2. Create the unified event and distribute it instantly to all admins
        await tx.notificationEvent.create({
          data: {
            senderId: user.id,
            title: `Follow up time updated by ${user.name}`,
            body: `${user.name} updated followUp time to ${lead.followUpAt}`,
            link: `/admin/leads/${lead.id}`,

            // Connect everyone dynamically via relational mapping
            recipients: {
              create: admins.map((admin) => ({
                recipientId: admin.id,
              })),
            },
          },
        });
      }

      if (user.role === "admin") {
        const otherAdmins = await tx.user.findMany({
          where: {
            role: "admin",
            id: { not: user.id },
          },
          select: { id: true },
        });

        const recipientSet = new Set<string>(
          otherAdmins.map((admin) => admin.id),
        );

        // ✅ FIX: Only alert the handler if they exist AND they aren't the one who created this lead entry record
        if (lead.managedById && lead.managedById !== user.id) {
          recipientSet.add(lead.managedById);
        }

        const recipientIds = Array.from(recipientSet);

        // 4. Fire the single insert transaction query
        await tx.notificationEvent.create({
          data: {
            senderId: user.id,
            title: `Lead Adjusted by ${user.name}`,
            body: `Admin ${user.name} updated follow up time to: ${lead.followUpAt}`,
            link: `/admin/leads/${lead.id}`,
            recipients: {
              create: recipientIds.map((id) => ({
                recipientId: id,
              })),
            },
          },
        });
      }
      return true;
    });

    return res.status(200).json({
      ok: true,
      message: "Follow-up Time updated succesfully!!!",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server couldn't process your request, so try again later",
    });
  }
}

export async function updateLeadBasicInformation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { name, email, coordinates, notes } = req.body;

    const parsedData = UpdateLeadSchema.safeParse(req.body);

    if (!parsedData.success) {
      throw new AppError(412, "Input validation failed");
    }

    if (!id || Array.isArray(id)) {
      throw new AppError(400, "Invalid Lead Id");
    }

    const checkExistingStatus = await prisma.lead.findUnique({
      where: { id },
    });

    if (!checkExistingStatus) {
      return res.status(404).json({ message: "Lead record not found." });
    }

     if (user.role !== "admin" && checkExistingStatus.managedById !== user.id){
      return res.status(403).json({
        message: "You are not authorized to perform this operation"
      })
    }

    if (
      checkExistingStatus?.status === "WON" ||
      checkExistingStatus?.status === "LOST"
    ) {
      return res.status(400).json({
        message: "Lead is already Closed and locked down.",
      });
    }

    const data = parsedData.data;

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => {
        return value !== "";
      }),
    );

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          ...updateData,
          notes: updateData.notes ? JSON.parse(notes) : null,
          updatedById:user.id
        },
      });
      if (user.role === "staff") {
        // 1. Fetch all admin users
        const admins = await tx.user.findMany({
          where: { role: "admin" },
          select: { id: true, name: true },
        });

        // 2. Create the unified event and distribute it instantly to all admins
        await tx.notificationEvent.create({
          data: {
            senderId: user.id,
            title: `Lead basic information updated by ${user.name}`,
            body: `${user.name} changed basic information for ${lead.leadCode}`,
            link: `/admin/leads/${lead.id}`,

            // Connect everyone dynamically via relational mapping
            recipients: {
              create: admins.map((admin) => ({
                recipientId: admin.id,
              })),
            },
          },
        });
      }

      if (user.role === "admin") {
        const otherAdmins = await tx.user.findMany({
          where: {
            role: "admin",
            id: { not: user.id },
          },
          select: { id: true },
        });

        const recipientSet = new Set<string>(
          otherAdmins.map((admin) => admin.id),
        );

        // ✅ FIX: Only alert the handler if they exist AND they aren't the one who created this lead entry record
        if (lead.managedById && lead.managedById !== user.id) {
          recipientSet.add(lead.managedById);
        }

        const recipientIds = Array.from(recipientSet);

        // 4. Fire the single insert transaction query
        await tx.notificationEvent.create({
          data: {
            senderId: user.id,
            title: `Lead Adjusted by ${user.name}`,
            body: `Admin ${user.name} updated basic info for lead: LC-${lead.leadCode}`,
            link: `/admin/leads/${lead.id}`,
            recipients: {
              create: recipientIds.map((id) => ({
                recipientId: id,
              })),
            },
          },
        });
      }
      return true;
    });

    return res.status(200).json({
      ok: true,
      message: "Information Updated Successfully",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: "Server couldn't process your request, so try again later",
    });
  }
}

//change handler

export async function changeHandler(req: Request, res: Response) {
  try {
    const { handlerId } = req.query;
    const user = req.user;
    const { id } = req.params;

    if (typeof handlerId !== "string" || handlerId.trim() === "") {
      return res.status(400).json({
        message: "Invalid handler Id",
      });
    }

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid lead id!!!",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const checkIfUserExist = await tx.user.findUnique({
        where: { id: handlerId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!checkIfUserExist) {
        throw new AppError(404, "No such handler exist!!!");
      }

      const existingLead = await tx.lead.findUnique({
        where: { id },
        select: {
          id: true,
          managedById: true,
        },
      });

      if (!existingLead) {
        throw new AppError(404, "Lead not found");
      }

      if (user.role === "staff" && user.id !== existingLead.managedById) {
        throw new AppError(403, "You are unauthorized to carry this action");
      }

      if (existingLead.managedById === checkIfUserExist.id) {
        throw new AppError(400, "Lead already assigned to this handler");
      }

      const lead = await tx.lead.update({
        where: { id },
        data: {
          managedById: checkIfUserExist.id,
          updatedById: user.id,
        },
      });

      const recipientSet = new Set<string>();

      // 1. All admins
      const admins = await tx.user.findMany({
        where: {
          role: "admin",
        },
        select: {
          id: true,
        },
      });

      admins.forEach((admin) => {
        recipientSet.add(admin.id);
      });

      // 2. New handler
      if (checkIfUserExist.id) {
        recipientSet.add(checkIfUserExist.id);
      }

      if (existingLead.managedById) {
        recipientSet.add(existingLead.managedById);
      }

      // 3. Remove the person who made the change
      recipientSet.delete(user.id);

      const recipientIds = Array.from(recipientSet);

      await tx.notificationEvent.create({
        data: {
          senderId: user.id,
          title: `Lead Handler changed by ${user.name}`,
          body: `${user.name} changed lead handler to ${checkIfUserExist.name}`,
          link: `/admin/leads/${lead.id}`,

          recipients: {
            create: recipientIds.map((id) => ({
              recipientId: id,
            })),
          },
        },
      });
      return true;
    });

    return res.status(200).json({
      ok: true,
      message: "Handler Updated Successfully!!!",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server couldn't process your request!!!",
    });
  }
}

export async function getUserLeads(req:Request, res:Response){
  try {
    const { id } = req.user;
    const result = await prisma.lead.findMany({
      where: {managedById: id, status:{notIn:["WON","LOST"]}},
      orderBy: {createdAt:"desc"}
    })

    return res.status(200).json({
      ok:true,
      result
    })
  } catch (error) {
    return res.status(500).json({
      message: "Server couldn't process your request!!!"
    })
  }
}

export async function getTodayFollowUpLead(req: Request, res: Response) {
  try {
    // 1. Get the current exact absolute timestamp
    const now = new Date();

    // 2. Calculate the current time in Nepal by adding the 5h 45m offset (in milliseconds)
    // 5 hours = 5 * 60 * 60 * 1000 = 18,000,000 ms
    // 45 minutes = 45 * 60 * 1000   =  2,700,000 ms
    const NEPAL_OFFSET_MS = 20700000; 
    const nepalTimeNow = new Date(now.getTime() + NEPAL_OFFSET_MS);

    // 3. Extract calendar day components based on Nepal's clock
    const year = nepalTimeNow.getUTCFullYear();
    const month = nepalTimeNow.getUTCMonth();
    const day = nepalTimeNow.getUTCDate();

    // 4. Construct the start and end of the day in Nepal time, 
    // then subtract the offset to shift them back into absolute UTC for Prisma
    const startOfNepalToday = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - NEPAL_OFFSET_MS);
    const endOfNepalToday = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - NEPAL_OFFSET_MS);

    // 5. Query Prisma using absolute, environment-safe UTC Date boundaries
    const result = await prisma.lead.findMany({
      where: {
        followUpAt: {
          gte: startOfNepalToday, 
          lte: endOfNepalToday,   
        }
      },
      include: {
        managedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        followUpAt: 'asc'
      }
    });

    return res.status(200).json({
      ok: true,
      count: result.length,
      result
    });
  } catch (error) {
    console.error("Time-zone bounded query failed:", error);
    return res.status(500).json({
      message: "Server couldn't process your request. Try again later"
    });
  }
}
