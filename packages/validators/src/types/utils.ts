export type SessionUser = {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type LocationSchema = {
  name: string;
  userId?: string;
  parentId?: string;
}

export interface AgentType {
  id: string;
  name: string;
  contact: string;
  secondContact: string | null;
  isActive:boolean;
  isVerified: boolean;
  createdAt: Date;
  createdBy : {
    id: string;
    name: string;
  } | null;
}

export interface AgentDetailType extends AgentType{
  profileImageUrl: string | null;
  email: string;
  role: string;
  documents: {
    id: string;
    isVerified: boolean;
    url: string;
    type: string;
  }[];
}


export interface PropertyListing {
  id: string;
  propertyCode?: number;
  title: string;
  price: string;
  type: string;
  noOfBedRooms: number | null;
  noOfFloors: number | null;
  noOfRestRooms: number | null;
  isFeatured: boolean;
  landArea: string | null;
  floorArea: string | null;
  tole: string;
  category: {
    name: string;
  };
  images: {
    url: string;
  }[];
  createdAt: Date | string;
}


type SaleType = "rent" | "sale";
interface ImageType{
  id : string;
  url: string;
}

interface Amenity {
  id:string;
}

export interface PropertyFormdata{
  title: string;
  description: string;
  type: SaleType;
  categoryId: string;
  districtId: string;
  municipalityId: string;
  locationId: string;
  price: string;
  tole: string;
  negotiable:boolean;
  features:Record<string,any> | null | any;

  lat: number | null;
  lng: number | null;

  noOfBedRooms?: string;
  noOfRestRooms?: string;
  landArea?: string;
  noOfFloors?: string;
  propertyAge?: string;
  facingDirection?: string;
  floorArea?: string;
  roadSize?: string;
  floorLevel?: string;
  images: ImageType[];
  verified?: boolean;
  amenities:string[];
};



export interface Lead {
  id: string;
  leadCode:number;
  name: string | null;
  contact: string;
  email: string | null;
  source: string;
  clientType: "BUYER" | "SELLER";
  propertyId: string | null;
  imageUrl: string | null;
  dealType: "buy" | "sell" | "rent";
  coordinates: string | null;
  managedById: string | null;
  notes: Record<string, any> | null;
  followUpAt: string | null;
  status: string;
  createdAt: string;
  remarks: string | null;
  managedBy?: {
    name: string;
    email: string;
  } | null;
}

export interface LeadDetailType extends Lead {
  updatedById:string | null;
  updatedBy?: {
    name: string;
    email: string;
  } | null;
  updatedAt:string;
}

export type LeadStatus = "NEW" | "CONTACTED" |"INTERESTED" | "NOT_INTERESTED" | "FOLLOW_UP" | "IN_PROGRESS" | "IN_NEGOTIATION" | "WON" | "LOST"

