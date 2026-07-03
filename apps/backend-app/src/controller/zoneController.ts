import { DatabaseError, handlePrismaError, prisma } from "@repo/database";
import { AppError, createGeoZone } from "@repo/functions";
import { Request, Response } from "express";

export const createZoneController = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const formData = req.body;

    const result = await createGeoZone({ userId: id, formData });

    return res.status(result.status).json({
      message: result.message,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: "Internal Server Error!!!",
    });
  }
};

export const getZonesController = async (req: Request, res: Response) => {
  try {
    const zones = await prisma.$queryRaw`
    SELECT 
      id,
      name,
      notes,
      ST_AsGeoJSON(geom)::json AS geom
    FROM "GeoZone"
    WHERE "isActive" = true
  `;
    return res.status(200).json({ zones });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error!!!",
    });
  }
};

export const deleteZoneController = async (req: Request, res: Response) => {
  try {
    const { id: zoneId } = req.params; 

    if (!zoneId || typeof zoneId !== 'string') {
      throw new AppError(400, "Invalid Zone ID");
    }
    
    const deleted = await prisma.$executeRaw`
  DELETE FROM "GeoZone"
  WHERE id = ${zoneId}
  AND NOT EXISTS (
    SELECT 1 FROM "AgentGeoZone"
    WHERE "zoneId" = ${zoneId}
  )
`;

    if (deleted === 0) {
      const assigned = await prisma.agentGeoZone.findMany({
        where: { zoneId },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
        },
      });

      const names = assigned.map((a) => a.agent.name).join(", ");

      throw new AppError(400, `Zone is assigned to: ${names}`);
    }

    return res.status(200).json({
      message: "Zone deleted successfully!!!",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: "Internal Server Error!!!",
    });
  }
};

export const getZoneByIdController = async (req: Request, res: Response) => {
  try {
    const { id: zoneId } = req.params;

    if (!zoneId || typeof zoneId !== "string") {
      throw new AppError(400, "Invalid Zone ID");
    }

    const zone = await prisma.$queryRaw<
  {
    id: string;
    name: string;
    notes: string | null;
    geom: any; // better: JSON instead of string
    properties: {
      id: string;
      title: string;
      lat: number;
      lng: number;
    }[];
  }[]
>`
  SELECT 
    z.id,
    z.name,
    z.notes,
    ST_AsGeoJSON(z.geom)::json AS geom,

    COALESCE(
      json_agg(
        json_build_object(
          'id', p.id,
          'title', p.title,
          'type', p.type,
          'lat', ST_Y(p."geoPoint"),
          'lng', ST_X(p."geoPoint")
        )
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'
    ) AS properties

  FROM "GeoZone" z

  LEFT JOIN "Property" p
    ON ST_Contains(z.geom, p."geoPoint")

  WHERE z.id = ${zoneId}

  GROUP BY z.id, z.name, z.notes;
`;

    if (!zone || zone.length === 0) {
      throw new AppError(404, "Zone not found");
    }

    return res.status(200).json({
      zone: zone[0],
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};


export const assignZoneToAgentController = async (req: Request, res: Response) => {
  try {
    const { agentId, zoneId } = req.body;
    const { id } = req.user;

    if (!agentId || !zoneId) {
      throw new AppError(400, "Agent ID and Zone ID are required");
    }

    const existinAssignment = await prisma.agentGeoZone.findFirst({
      where: {
        zoneId,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },    

    });

    if (existinAssignment) {
      throw new AppError(400, `Zone is already assigned to agent: ${existinAssignment.agent.name}`);
    }

    await prisma.agentGeoZone.create({
      data: {
        agentId,
        zoneId,
        assignedById: id,
      },
    });

    return res.status(200).json({
      message: "Zone assigned to agent successfully!!!",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: "Internal Server Error!!!",
    });
  } 
};

export async function getMyzones(req:Request, res:Response){
  try {
    const user = req.user;
    const zones = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        notes: string | null;
        isActive: boolean;
        geom: any;
        createdAt: string;
      }[]
    >`
      SELECT 
        z.id,
        z.name,
        z.notes,
        z."isActive",
        z."createdAt",
        ST_AsGeoJSON(z.geom)::json AS geom
      FROM "GeoZone" z
      INNER JOIN "AgentGeoZone" agz 
        ON z.id = agz."zoneId"
      WHERE agz."agentId" = ${user.id} AND z."isActive" = true
      ORDER BY z."createdAt" DESC;
    `;

    return res.status(200).json({
      zones,
      ok:true
    })
  } catch (error) {
    return res.status(500).json({
      message: "Server couldn't process your request!!!"
    })
  }
}

export async function revokeAssignedZones(req:Request, res:Response){
  try {
    const user = req.user;
    const agentId = req.query.agentId as string;
    const zoneId = req.query.zoneId as string;

    if (!agentId || !zoneId) {
      return res.status(400).json({ message: "Missing agentId or zoneId query parameters." });
    }

    const result = await prisma.$transaction(async(tx) => {
      await tx.agentGeoZone.delete({
        where: {
          agentId_zoneId: {
            agentId,
            zoneId
          }
        }
      })
      await tx.auditLog.create({
        data: {
          action:"DELETE",
          actorType:user.role,
          actorId:user.id,
          actorName:user?.name,
          entityType:"AgentGeoZone",
          entityId:`${agentId}_${zoneId}`,
          oldValues:{ zoneId, agentId },
          metadata: {reason: "Administrative manual revocation"}
        }
      });

      return true;

    })

    return res.status(200).json({
      message:"Zone Revoke Successful!!!"
    })
  } catch (error) {
     try {
          // 🚀 Automatically checks and maps standard Prisma exceptions
          handlePrismaError(error);
        } catch (dbError) {
          // 🎯 Catch the parsed DatabaseError explicitly
          if (dbError instanceof DatabaseError) {
            return res.status(dbError.statusCode).json({ message: dbError.message });
          }
          
          // Generic fallback for non-database unexpected crashes
          return res.status(500).json({ message: "Internal Server Error" });
        }
  }
}