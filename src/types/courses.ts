export interface Dance {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Level {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  danceId: string;
  levelId: string;
  displayName: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipCourses {
  id: string;
  membershipId: string;
  dancerId: number;
  selections: {
    [danceId: string]: string; // levelId or "none"
  };
  createdAt: Date;
  updatedAt: Date;
}
